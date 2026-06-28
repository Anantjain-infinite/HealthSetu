/**
 * @file src/shared/types/index.ts
 * @description Shared TypeScript types used across all frontend features.
 * These mirror the backend response shapes — kept in sync manually.
 */

// ── Auth & User ────────────────────────────────────────────────────────────

export type UserRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';

export interface AuthUser {
  id:        string;
  email:     string;
  role:      UserRole;
  profileId: string | null;
  fullName:  string | null;
}

export interface LoginResponse {
  accessToken: string;
  user: Pick<AuthUser, 'id' | 'email' | 'role'>;
}

export interface RegisterPayload {
  email:    string;
  password: string;
  role:     'PATIENT' | 'DOCTOR';
  // Patient fields
  fullName?:         string;
  dateOfBirth?:      string;
  emergencyContact?: string;
  address?:          string;
  // Doctor fields
  specialisation?: string;
  licenceNo?:      string;
}

// ── Consultation ───────────────────────────────────────────────────────────

export type ConsultationStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface ConsultationSummary {
  id:          string;
  status:      ConsultationStatus;
  symptoms:    string;
  scheduledAt: string | null;
  createdAt:   string;
  doctor: {
    id:            string;
    fullName:      string;
    specialisation:string;
  };
  patient: {
    id:       string;
    fullName: string;
  };
}

export interface ConsultationDetail extends ConsultationSummary {
  notes:     string | null;
  startedAt: string | null;
  endedAt:   string | null;
  prescriptions: Prescription[];
  transcript: Transcript | null;
}

export interface CreateConsultationPayload {
  doctorId:    string;
  symptoms:    string;
  scheduledAt?: string;
}

// ── Doctor ─────────────────────────────────────────────────────────────────

export interface Doctor {
  id:             string;
  fullName:       string;
  specialisation: string;
  isAvailable:    boolean;
}

// ── Patient ────────────────────────────────────────────────────────────────

export interface Patient {
  id:               string;
  fullName:         string;
  dateOfBirth:      string;
  emergencyContact: string;
  address:          string;
}

// ── Prescription ───────────────────────────────────────────────────────────

export interface Prescription {
  id:              string;
  consultationId:  string;
  issuedAt:        string;
  downloadUrl?:    string; // Pre-signed S3 URL — included on demand
}

// ── Transcript ─────────────────────────────────────────────────────────────

export interface Transcript {
  id:          string;
  contentJson: Record<string, unknown>; // TipTap JSON content
}

// ── Emergency ──────────────────────────────────────────────────────────────

export type SmsStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface EmergencyLog {
  id:          string;
  triggeredAt: string;
  smsStatus:   SmsStatus;
  locationLat: number | null;
  locationLng: number | null;
}

// ── Pagination ─────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total?:       number;
    page?:        number;
    limit:        number;
    hasNextPage:  boolean;
    nextCursor?:  string;
  };
}

// ── API Error ──────────────────────────────────────────────────────────────

export interface ApiError {
  error:    string;
  code?:    string;
  details?: Record<string, string[]>;
}

// ── WebRTC / Signalling ────────────────────────────────────────────────────

export interface SignalOffer {
  sdp:            RTCSessionDescriptionInit;
  consultationId: string;
}

export interface SignalAnswer {
  sdp:            RTCSessionDescriptionInit;
  consultationId: string;
}

export interface SignalIceCandidate {
  candidate:      RTCIceCandidateInit;
  consultationId: string;
}

export interface ChatMessage {
  senderId:  string;
  senderName:string;
  text:      string;
  timestamp: string;
}
