/**
 * @file src/shared/utils/twilioClient.ts
 * @description Twilio Programmable SMS singleton.
 *
 * Initialised once at module load time using validated env vars.
 * Import `twilioClient` and `TWILIO_FROM` wherever SMS sending is needed.
 */

import twilio from 'twilio';
import { env } from '../../config/env';

/**
 * The application-wide Twilio REST client.
 * Use this to send SMS messages — never create a new twilio() instance elsewhere.
 */
export const twilioClient = twilio(
  env.TWILIO_ACCOUNT_SID,
  env.TWILIO_AUTH_TOKEN
);

/**
 * The verified Twilio phone number to send FROM.
 * Must be in E.164 format, e.g. +919876543210
 */
export const TWILIO_FROM = env.TWILIO_FROM_NUMBER;
