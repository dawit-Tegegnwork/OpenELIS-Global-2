/**
 * Helpers for MedLab Page 1 patient registration and lab orders.
 */

export const REGISTER_MODE = {
  PATIENT: "patient",
  PARTICIPANT: "participant",
};

/**
 * Derive backend birthDateForDisplay (MM/dd/yyyy) from age in years.
 * Uses Jan 1 of the estimated birth year.
 */
export function birthDateForDisplayFromAge(age, referenceDate = new Date()) {
  const years = parseInt(String(age).trim(), 10);
  if (Number.isNaN(years) || years < 0) {
    return "";
  }
  const year = referenceDate.getFullYear() - years;
  return `01/01/${year}`;
}

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
    age: patient.age,
    gender: patient.gender,
    nationalId: patient.nationalId,
    subjectNumber: patient.subjectNumber,
  };
}

export function isRegistrationFormValid(form, mode = REGISTER_MODE.PATIENT) {
  const firstOk = (form.firstName || "").trim() !== "";
  const lastOk =
    mode === REGISTER_MODE.PARTICIPANT ||
    (form.lastName || "").trim() !== "";
  const genderOk = (form.gender || "").trim() !== "";
  return firstOk && lastOk && genderOk;
}

export function buildPatientManagementPayload(form, mode = REGISTER_MODE.PATIENT) {
  const ageStr = (form.age ?? "").toString().trim();
  const birthDateForDisplay = ageStr
    ? birthDateForDisplayFromAge(ageStr)
    : "";

  const lastName =
    mode === REGISTER_MODE.PARTICIPANT &&
    (form.lastName || "").trim() === ""
      ? "-"
      : form.lastName;

  const payload = {
    firstName: form.firstName,
    lastName,
    birthDateForDisplay,
    gender: form.gender,
    nationalId: form.nationalId || "",
    patientUpdateStatus: "ADD",
  };

  const protocolId = (form.fatherNameOrProtocolId || "").trim();
  if (protocolId) {
    payload.subjectNumber = protocolId;
  }

  return { payload, birthDateForDisplay, age: ageStr };
}

export function buildRegisteredPatientSnapshot(
  patientPk,
  form,
  birthDateForDisplay,
  age,
  mode = REGISTER_MODE.PATIENT,
) {
  const lastName =
    (form.lastName || "").trim() !== ""
      ? form.lastName
      : mode === REGISTER_MODE.PARTICIPANT
        ? "-"
        : form.lastName;
  const snapshot = {
    id: patientPk,
    firstName: form.firstName,
    lastName,
    birthDateForDisplay: birthDateForDisplay || "",
    gender: form.gender,
    nationalId: form.nationalId || "",
  };
  if (age) {
    snapshot.age = age;
  }
  const protocolId = (form.fatherNameOrProtocolId || "").trim();
  if (protocolId) {
    snapshot.subjectNumber = protocolId;
  }
  return snapshot;
}

export function formatPatientAgeDisplay(patient) {
  if (patient?.age != null && String(patient.age).trim() !== "") {
    return String(patient.age);
  }
  return patient?.birthDateForDisplay || "-";
}

export function formatRegistrationError(response, fallbackMessage) {
  if (!response) {
    return fallbackMessage;
  }
  if (response.error) {
    return String(response.error);
  }
  if (response.message && response.message !== "No action required") {
    return String(response.message);
  }
  if (typeof response.statusCode === "number") {
    return `${fallbackMessage} (HTTP ${response.statusCode})`;
  }
  if (response.success && !response.patientPK) {
    return `${fallbackMessage}: patient ID was not returned by the server`;
  }
  return fallbackMessage;
}
