import {
  getPatientId,
  normalizePatientForOrder,
  birthDateForDisplayFromAge,
  isRegistrationFormValid,
  buildPatientManagementPayload,
  REGISTER_MODE,
  formatPatientAgeDisplay,
} from "./patientOrderHelpers";

describe("patientOrderHelpers", () => {
  it("getPatientId prefers patientID then id", () => {
    expect(getPatientId({ patientID: "10", id: "20" })).toBe("10");
    expect(getPatientId({ id: "20" })).toBe("20");
    expect(getPatientId(null)).toBeNull();
  });

  it("normalizePatientForOrder sets both id and patientID", () => {
    const normalized = normalizePatientForOrder({
      id: "42",
      firstName: "Jane",
      lastName: "Doe",
      birthDateForDisplay: "01/01/2000",
      gender: "F",
    });
    expect(normalized.patientID).toBe("42");
    expect(normalized.id).toBe("42");
    expect(normalized.firstName).toBe("Jane");
  });

  it("birthDateForDisplayFromAge uses Jan 1 of birth year", () => {
    expect(
      birthDateForDisplayFromAge(25, new Date(2026, 5, 4)),
    ).toBe("01/01/2001");
    expect(birthDateForDisplayFromAge("", new Date(2026, 5, 4))).toBe("");
    expect(birthDateForDisplayFromAge(0, new Date(2026, 5, 4))).toBe(
      "01/01/2026",
    );
  });

  it("isRegistrationFormValid allows optional last name for participant", () => {
    expect(
      isRegistrationFormValid(
        { firstName: "P1", lastName: "", gender: "M", age: "" },
        REGISTER_MODE.PARTICIPANT,
      ),
    ).toBe(true);
    expect(
      isRegistrationFormValid(
        { firstName: "P1", lastName: "", gender: "", age: "" },
        REGISTER_MODE.PATIENT,
      ),
    ).toBe(false);
  });

  it("buildPatientManagementPayload maps age and subjectNumber", () => {
    const { payload, birthDateForDisplay, age } = buildPatientManagementPayload(
      {
        firstName: "Test",
        lastName: "User",
        gender: "M",
        age: "30",
        nationalId: "",
        fatherNameOrProtocolId: "PROT-001",
      },
      REGISTER_MODE.PATIENT,
    );
    expect(birthDateForDisplay).toBe("01/01/1996");
    expect(age).toBe("30");
    expect(payload.subjectNumber).toBe("PROT-001");
  });

  it("formatPatientAgeDisplay prefers age", () => {
    expect(formatPatientAgeDisplay({ age: "22" })).toBe("22");
    expect(formatPatientAgeDisplay({ birthDateForDisplay: "01/01/2000" })).toBe(
      "01/01/2000",
    );
  });
});
