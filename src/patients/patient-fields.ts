import { Patient } from "../entities/patient.entity";

/**
 * Patient fields a clinic or doctor can require before booking.
 * To make a new field requirable, add the column to Patient and list it here.
 */
export const PATIENT_FIELDS = ["name", "phone", "dni"] as const;
export type PatientField = (typeof PATIENT_FIELDS)[number];

export function missingPatientFields(
  patient: Patient,
  required: readonly string[],
): PatientField[] {
  const fields = PATIENT_FIELDS.filter((f) => required.includes(f));
  return fields.filter((f) => {
    const value = patient[f];
    return value === null || value === undefined || value === "";
  });
}
