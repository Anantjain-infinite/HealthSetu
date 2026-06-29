/**
 * @file src/modules/auth/auth.service.ts
 * @description Auth business logic layer.
 *
 * Handles:
 *   - User registration with Prisma transactions
 *   - Login with in-memory account lockout (5 failures / 15 min)
 *   - JWT access token (15 min) + refresh token (7 days) issuance
 *   - Refresh token rotation (old token revoked, new token issued)
 *   - Logout (token revocation)
 *   - Session restore via GET /auth/me
 *
 * NEVER returns passwordHash to callers.
 * NEVER logs passwords, tokens, or PHI.
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { createLogger } from '../../config/logger';
import { AppError } from '../../shared/errors/AppError';
import type { RegisterInput, LoginInput } from './auth.schema';

const log = createLogger('auth.service');

// ── Constants ──────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS       = 12;
const ACCESS_TOKEN_TTL    = '15m';
const REFRESH_TOKEN_TTL   = '7d';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

// Account lockout configuration
const MAX_LOGIN_FAILURES  = 5;
const LOCKOUT_WINDOW_MS   = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// ── In-memory lockout store ────────────────────────────────────────────────
// Keyed by lowercase email. In production with multiple server instances,
// replace with Redis. For a single-server deployment this is correct.

interface LockoutRecord {
  failures: number;
  firstFailureAt: number;
  lockedUntil: number | null;
}

const lockoutStore = new Map<string, LockoutRecord>();

/** Returns the current lockout record for an email, or null if none. */
function getLockout(email: string): LockoutRecord | null {
  const record = lockoutStore.get(email);
  if (!record) return null;

  // If the window has expired, remove and return null
  if (Date.now() - record.firstFailureAt > LOCKOUT_WINDOW_MS) {
    lockoutStore.delete(email);
    return null;
  }
  return record;
}

/** Records a failed login attempt. Returns the updated record. */
function recordFailure(email: string): LockoutRecord {
  const existing = getLockout(email);

  if (existing) {
    existing.failures += 1;
    if (existing.failures >= MAX_LOGIN_FAILURES) {
      existing.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      log.warn('Account locked after repeated failures', { email });
    }
    lockoutStore.set(email, existing);
    return existing;
  }

  const record: LockoutRecord = {
    failures: 1,
    firstFailureAt: Date.now(),
    lockedUntil: null,
  };
  lockoutStore.set(email, record);
  return record;
}

/** Clears the lockout record on successful login. */
function clearLockout(email: string): void {
  lockoutStore.delete(email);
}

// ── JWT helpers ────────────────────────────────────────────────────────────

export interface TokenPayload {
  userId: string;
  role: string;
}

function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
    issuer: 'health-setu',
    audience: 'health-setu-client',
  });
}

function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL,
    issuer: 'health-setu',
    audience: 'health-setu-client',
  });
}

/**
 * Hashes a refresh token before storing it in the database.
 * Prevents exposure of the raw token if the DB is compromised.
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ── Service methods ────────────────────────────────────────────────────────

/**
 * Registers a new user (PATIENT or DOCTOR) in a single database transaction.
 * Creates User + role-specific profile atomically.
 *
 * @throws AppError 409 if email already exists
 */
export async function register(input: RegisterInput): Promise<{ message: string; userId: string }> {
  // Check for duplicate email before hashing (cheaper than hashing first)
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    throw new AppError('An account with this email already exists', 409, 'EMAIL_TAKEN');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  // Run User creation + profile creation in a single atomic transaction
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await prisma.$transaction(async (tx: any) => {
    const newUser = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: input.role,
      },
      select: { id: true, role: true },
    });

    if (input.role === 'PATIENT') {
      await tx.patient.create({
        data: {
          userId:           newUser.id,
          fullName:         input.fullName,
          dateOfBirth:      new Date(input.dateOfBirth),
          emergencyContact: input.emergencyContact,
          address:          input.address,
        },
      });
    } else {
      // DOCTOR
      await tx.doctor.create({
        data: {
          userId:        newUser.id,
          fullName:      input.fullName,
          specialisation:input.specialisation,
          licenceNo:     input.licenceNo,
        },
      });
    }

    return newUser;
  });

  log.info('New user registered', { userId: user.id, role: user.role });

  return { message: 'Account created successfully', userId: user.id };
}

/**
 * Authenticates a user.
 * Enforces account lockout: 5 consecutive failures → 15-minute lock.
 *
 * @returns Access token string + user summary object + raw refresh token string
 * @throws AppError 401 on invalid credentials
 * @throws AppError 423 when account is locked
 */
export async function login(
  input: LoginInput
): Promise<{ accessToken: string; refreshToken: string; user: { id: string; email: string; role: string } }> {
  const email = input.email.toLowerCase().trim();

  // ── Check lockout ────────────────────────────────────────────────────
  const lockout = getLockout(email);
  if (lockout?.lockedUntil && Date.now() < lockout.lockedUntil) {
    const retryAfterSeconds = Math.ceil((lockout.lockedUntil - Date.now()) / 1000);
    throw new AppError(
      `Account locked due to too many failed attempts. Try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).`,
      423,
      'ACCOUNT_LOCKED',
      { retryAfter: retryAfterSeconds }
    );
  }

  // ── Fetch user ───────────────────────────────────────────────────────
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, passwordHash: true },
  });

  // Use constant-time comparison regardless of whether user exists
  // to prevent user enumeration via timing attacks
  const dummyHash = '$2b$12$invalidhashtopreventtimingattacks.invalidhash.string';
  const passwordMatch = await bcrypt.compare(
    input.password,
    user?.passwordHash ?? dummyHash
  );

  if (!user || !passwordMatch) {
    recordFailure(email);
    // Always return the same generic message to prevent user enumeration
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // ── Success: clear lockout, issue tokens ─────────────────────────────
  clearLockout(email);

  const payload: TokenPayload = { userId: user.id, role: user.role };
  const accessToken  = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // Store hashed refresh token in DB
  await prisma.refreshToken.create({
    data: {
      token:     hashToken(refreshToken),
      userId:    user.id,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  log.info('User logged in', { userId: user.id, role: user.role });

  return {
    accessToken,
    refreshToken, // Raw token — controller will set this in HTTP-only cookie
    user: { id: user.id, email: user.email, role: user.role },
  };
}

/**
 * Rotates a refresh token.
 * Reads the raw token from the HTTP-only cookie, verifies it,
 * revokes the old DB record, stores a new one.
 *
 * @param rawToken  Raw refresh token string from the cookie
 * @returns New access token + new raw refresh token
 * @throws AppError 401 if token is invalid, revoked, or expired
 */
export async function refresh(
  rawToken: string
): Promise<{ accessToken: string; refreshToken: string }> {
  // Verify JWT signature and expiry
  let payload: TokenPayload;
  try {
    payload = jwt.verify(rawToken, env.JWT_REFRESH_SECRET, {
      issuer:   'health-setu',
      audience: 'health-setu-client',
    }) as TokenPayload;
  } catch {
    throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  // Look up the hashed token in the database
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: hashToken(rawToken) },
    select: { id: true, revoked: true, expiresAt: true, userId: true },
  });

  if (!storedToken) {
    throw new AppError('Refresh token not found', 401, 'INVALID_REFRESH_TOKEN');
  }
  if (storedToken.revoked) {
    // Possible token reuse attack — log for investigation
    log.warn('Revoked refresh token used — possible token theft', {
      userId: storedToken.userId,
    });
    throw new AppError('Refresh token has been revoked', 401, 'TOKEN_REVOKED');
  }
  if (storedToken.expiresAt < new Date()) {
    throw new AppError('Refresh token has expired', 401, 'TOKEN_EXPIRED');
  }

  // Rotate: revoke old, issue new
const newRefreshToken = signRefreshToken({
  userId: payload.userId,
  role:   payload.role,
});
  await prisma.$transaction([
    // Mark old token as revoked
    prisma.refreshToken.update({
      where: { id: storedToken.id },
      data:  { revoked: true },
    }),
    // Store new token
    prisma.refreshToken.create({
      data: {
        token:     hashToken(newRefreshToken),
        userId:    payload.userId,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    }),
  ]);

const newAccessToken = signAccessToken({
  userId: payload.userId,
  role:   payload.role,
});
  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

/**
 * Logs out a user by revoking their refresh token and clearing the cookie.
 *
 * @param rawToken  Raw refresh token string from the cookie (may be undefined)
 */
export async function logout(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return; // Already logged out

  const hashed = hashToken(rawToken);

  // Revoke in DB — fail silently if not found (idempotent logout)
  await prisma.refreshToken
    .updateMany({
      where: { token: hashed, revoked: false },
      data:  { revoked: true },
    })
    .catch((err: Error) => {
      log.warn('Failed to revoke refresh token during logout', { error: err.message });
    });
}

/**
 * Returns the authenticated user's profile for session restoration.
 * Called on app mount (GET /auth/me) — uses the access token, not the cookie.
 *
 * @param userId  From req.user (attached by verifyToken middleware)
 */
export async function getMe(
  userId: string
): Promise<{ id: string; email: string; role: string; profileId: string | null; fullName: string | null }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id:      true,
      email:   true,
      role:    true,
      patient: { select: { id: true, fullName: true } },
      doctor:  { select: { id: true, fullName: true } },
    },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  const profile = user.patient ?? user.doctor ?? null;

  return {
    id:        user.id,
    email:     user.email,
    role:      user.role,
    profileId: profile?.id ?? null,
    fullName:  profile?.fullName ?? null,
  };
}
