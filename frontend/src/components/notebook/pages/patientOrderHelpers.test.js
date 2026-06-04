import {
  getPatientId,
  normalizePatientForOrder,
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
});
