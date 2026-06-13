import {
  formatBiorepositoryLocationLevel,
  formatBiorepositoryPageInstructions,
  formatBiorepositoryUserText,
  getStorageManagementLabels,
  normalizeBiorepositoryHierarchyPath,
  resolveBiorepositoryPhysicalRoomName,
} from "./biorepositoryDisplayHelpers";

describe("biorepositoryDisplayHelpers", () => {
  test("normalizeBiorepositoryHierarchyPath rewrites legacy Room segment only", () => {
    expect(normalizeBiorepositoryHierarchyPath("Room > Freezer-1")).toBe(
      "Zone > Freezer-1",
    );
    expect(normalizeBiorepositoryHierarchyPath("Room-A > Freezer-1")).toBe(
      "Room-A > Freezer-1",
    );
  });

  test("formatBiorepositoryLocationLevel maps room to zone", () => {
    expect(formatBiorepositoryLocationLevel("room")).toBe("zone");
    expect(formatBiorepositoryLocationLevel("device")).toBe("device");
  });

  test("formatBiorepositoryPageInstructions rewrites storage instructions", () => {
    expect(
      formatBiorepositoryPageInstructions(
        "Select storage hierarchy: Room > Device",
        "storage_assign",
      ),
    ).toBe("Select storage hierarchy: Zone > Device");
  });

  test("formatBiorepositoryUserText rewrites common room phrases", () => {
    expect(formatBiorepositoryUserText("Biorepository room-level storage")).toBe(
      "Biorepository zone-level storage",
    );
    expect(formatBiorepositoryUserText("Room Temperature (15-25°C)")).toBe(
      "Ambient Temperature (15-25°C)",
    );
  });

  test("resolveBiorepositoryPhysicalRoomName prefers login lab unit", () => {
    expect(
      resolveBiorepositoryPhysicalRoomName("Biorepository Laboratory"),
    ).toBe("Biorepository Laboratory");
    expect(resolveBiorepositoryPhysicalRoomName(null)).toBe(
      "Biorepository Laboratory",
    );
    expect(
      resolveBiorepositoryPhysicalRoomName(null, "Custom Facility"),
    ).toBe("Custom Facility");
  });

  test("getStorageManagementLabels returns zone labels for biorepository users", () => {
    const intl = {
      formatMessage: ({ id, defaultMessage }) => defaultMessage || id,
    };
    const biorepoLabels = getStorageManagementLabels(intl, true);
    expect(biorepoLabels.roomsTab).toBe("Zones");
    expect(biorepoLabels.addRoom).toBe("Add Zone");
    expect(biorepoLabels.roomColumn).toBe("Zone");

    const defaultLabels = getStorageManagementLabels(intl, false);
    expect(defaultLabels.roomsTab).toBe("storage.tab.rooms");
  });
});
