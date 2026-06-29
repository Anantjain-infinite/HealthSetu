/**
 * @file src/modules/doctor/doctor.service.ts
 * @description Doctor profile lookup and search.
 * Used by the SymptomForm debounced doctor search.
 */

import { prisma } from '../../config/database';

/**
 * Search available doctors by name or specialisation.
 * Supports the 300ms debounced search in SymptomForm.
 *
 * @param search  Optional search string (matches fullName or specialisation)
 * @param limit   Max results to return (default 10)
 */
export async function searchDoctors(search?: string, limit = 10) {
  return prisma.doctor.findMany({
    where: {
      isAvailable: true,
      ...(search
        ? {
            OR: [
              { fullName:       { contains: search, mode: 'insensitive' } },
              { specialisation: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { fullName: 'asc' },
    take: limit,
    select: {
      id:             true,
      fullName:       true,
      specialisation: true,
      isAvailable:    true,
    },
  });
}

/**
 * Fetch the doctor profile for a given userId.
 */
export async function getDoctorProfileByUserId(userId: string) {
  return prisma.doctor.findUnique({
    where: { userId },
    select: {
      id:             true,
      fullName:       true,
      specialisation: true,
      licenceNo:      true,
      isAvailable:    true,
      createdAt:      true,
    },
  });
}
