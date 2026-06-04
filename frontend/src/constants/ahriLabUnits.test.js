import { filterAhriLabUnitTestSections } from "./ahriLabUnits";

describe("filterAhriLabUnitTestSections", () => {
  it("keeps only AHRI research labs from display list", () => {
    const sections = [
      { id: "1", value: "Hematology" },
      { id: "168", value: "Bacteriology" },
      { id: "200", value: "Biorepository Laboratory" },
      { id: "59", value: "Immunology" },
    ];
    const filtered = filterAhriLabUnitTestSections(sections);
    expect(filtered.map((s) => s.value)).toEqual([
      "Bacteriology",
      "Biorepository Laboratory",
      "Immunology",
    ]);
  });

  it("keeps CTD and legacy display names", () => {
    const sections = [
      { id: "181", value: "CTD" },
      { id: "182", value: "Medical Laboratory" },
      { id: "183", value: "CTD Department" },
      { id: "1", value: "Hematology" },
    ];
    const filtered = filterAhriLabUnitTestSections(sections);
    expect(filtered.map((s) => s.value)).toEqual([
      "CTD",
      "Medical Laboratory",
      "CTD Department",
    ]);
  });

  it("keeps Genomics and Virology labs", () => {
    const sections = [
      { id: "10", value: "Genomics & Bioinformatics Laboratory" },
      { id: "11", value: "Virology Laboratory" },
      { id: "1", value: "Urinalysis" },
    ];
    const filtered = filterAhriLabUnitTestSections(sections);
    expect(filtered.map((s) => s.value)).toEqual([
      "Genomics & Bioinformatics Laboratory",
      "Virology Laboratory",
    ]);
  });
});
