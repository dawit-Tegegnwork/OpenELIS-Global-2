import {
  deriveStoragePageStatus,
  getStorageLocationLabel,
  hasStorageLocation,
  interpretStorageAssignmentResponse,
  buildBiorepositoryStorageUrl,
  findStorageAssignmentPage,
} from "./biorepositoryStorageHelpers";

describe("biorepositoryStorageHelpers", () => {
  test("hasStorageLocation detects hierarchy-only assignments", () => {
    expect(
      hasStorageLocation({
        data: { storageRoom: "Bio Freezer Room", storageFreezer: "BR-FRZ-01" },
      }),
    ).toBe(true);
    expect(hasStorageLocation({ storagePath: "Room > Device" })).toBe(true);
    expect(hasStorageLocation({ status: "PENDING" })).toBe(false);
  });

  test("deriveStoragePageStatus promotes assigned samples to IN_PROGRESS", () => {
    expect(
      deriveStoragePageStatus({
        status: "PENDING",
        data: { storageBox: "Box 12" },
      }),
    ).toBe("IN_PROGRESS");
    expect(deriveStoragePageStatus({ status: "PENDING" })).toBe("PENDING");
    expect(deriveStoragePageStatus({ status: "COMPLETED" })).toBe("COMPLETED");
  });

  test("getStorageLocationLabel prefers BRF-02 path from structured fields", () => {
    expect(
      getStorageLocationLabel({
        storagePath: "Room > Freezer",
        storageWell: "A1",
        data: { storageRoom: "Zone A", storageFreezer: "Freezer-1" },
      }),
    ).toBe("Zn Zone A / FRZ Freezer-1 / Pos A1");
  });

  test("getStorageLocationLabel rewrites legacy Room hierarchy segment", () => {
    expect(
      getStorageLocationLabel({
        storagePath: "Room > Freezer",
        storageWell: "A1",
      }),
    ).toBe("Zn Zone / FRZ Freezer / Pos A1");
  });

  test("interpretStorageAssignmentResponse does not treat zero assignments as success", () => {
    const outcome = interpretStorageAssignmentResponse(
      { success: false, assignedCount: 0, errors: ["Sample 1 not found"] },
      1,
    );

    expect(outcome.success).toBe(false);
    expect(outcome.assignedCount).toBe(0);
    expect(outcome.errorMessage).toContain("Sample 1 not found");
  });

  test("interpretStorageAssignmentResponse accepts real persisted assignments", () => {
    const outcome = interpretStorageAssignmentResponse(
      { success: true, assignedCount: 2, requestedCount: 2 },
      2,
    );

    expect(outcome.success).toBe(true);
    expect(outcome.assignedCount).toBe(2);
    expect(outcome.errorMessage).toBeNull();
  });

  test("findStorageAssignmentPage prefers storage_assign pageKey over order", () => {
    const pages = [
      { id: 30, order: 2, pageKey: "shipment_reception", title: "Shipment" },
      { id: 31, order: 7, pageKey: "storage_assign", title: "Storage Assignment" },
    ];
    expect(findStorageAssignmentPage(pages)?.id).toBe(31);
  });

  test("findStorageAssignmentPage falls back to order 2", () => {
    const pages = [{ id: 22, order: 2, title: "Storage Assignment" }];
    expect(findStorageAssignmentPage(pages)?.id).toBe(22);
  });

  test("buildBiorepositoryStorageUrl adds notebook scope and biorepository flag", () => {
    expect(
      buildBiorepositoryStorageUrl("/rest/storage/rooms?status=active", 23),
    ).toBe("/rest/storage/rooms?status=active&biorepositoryOnly=true&notebookId=23");
    expect(buildBiorepositoryStorageUrl("/rest/storage/devices", null)).toBe(
      "/rest/storage/devices",
    );
  });

  test("normalizePageSampleResponse accepts paginated API shape", async () => {
    const { normalizePageSampleResponse } = await import(
      "./biorepositoryStorageHelpers"
    );

    expect(
      normalizePageSampleResponse({
        samples: [{ id: "1" }],
        totalCount: 6841,
        offset: 0,
        limit: 500,
      }),
    ).toEqual({
      samples: [{ id: "1" }],
      totalCount: 6841,
      offset: 0,
      limit: 500,
    });
  });
});
