/**
 * Normalize patient records from registration (id) or search (patientID) for lab orders.
 */
export function getPatientId(patient) {
  if (!patient) {
    return null;
  }
  return patient.patientID ?? patient.id ?? null;
}

export function normalizePatientForOrder(patient) {
  if (!patient) {
    return null;
  }
  const patientId = getPatientId(patient);
  return {
    ...patient,
    id: patientId,
    patientID: patientId,
    firstName: patient.firstName,
    lastName: patient.lastName,
    birthDateForDisplay: patient.birthDateForDisplay,
    gender: patient.gender,
    nationalId: patient.nationalId,
  };
}
