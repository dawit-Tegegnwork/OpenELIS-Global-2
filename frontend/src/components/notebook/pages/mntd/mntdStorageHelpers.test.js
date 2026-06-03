import {
  allSelectedHaveExistingStorage,
  applyMntdBiorepositoryTransferSuccess,
  coerceDisplayValue,
  computeInStorageCount,
  enrichSampleForBiorepositoryTransfer,
  formatCurrentStorage,
  hasExistingStorage,
} from "./mntdStorageHelpers";

describe("mntdStorageHelpers", () => {
  it("coerces object and primitive values for display", () => {
    expect(coerceDisplayValue("Blood")).toBe("Blood");
    expect(coerceDisplayValue({ description: "Plasma" })).toBe("Plasma");
    expect(coerceDisplayValue(42)).toBe("42");
    expect(coerceDisplayValue(null)).toBe("-");
    expect(coerceDisplayValue(undefined, "")).toBe("");
  });

  it("detects existing storage from page sample data", () => {
    expect(hasExistingStorage({ storagePath: "Room > Freezer" })).toBe(true);
    expect(hasExistingStorage({ data: { storageWell: "A1" } })).toBe(true);
    expect(hasExistingStorage({ externalId: "S-1" })).toBe(false);
  });

  it("formats current storage path and well", () => {
    expect(
      formatCurrentStorage({
        storagePath: "Lab > Freezer-1",
        storageWell: "B2",
      }),
    ).toBe("Lab > Freezer-1 > B2");
    expect(
      formatCurrentStorage({
        storagePath: { description: "Room A" },
        storageWell: "C1",
      }),
    ).toBe("Room A > C1");
  });

  it("requires all selected samples to have storage for existing-location mode", () => {
    const samples = [
      { id: "1", storagePath: "A" },
      { id: "2", storagePath: "B" },
      { id: "3" },
    ];
    expect(allSelectedHaveExistingStorage(samples, ["1", "2"])).toBe(true);
    expect(allSelectedHaveExistingStorage(samples, ["1", "3"])).toBe(false);
  });

  it("prefills biorepository transfer defaults for MNTD samples", () => {
    const enriched = enrichSampleForBiorepositoryTransfer({
      id: "10",
      externalId: "ACH-001",
      sampleType: "Whole blood",
    });
    expect(enriched.sampleCondition).toBe("Good");
    expect(enriched.preservationMedium).toBe("None");
    expect(enriched.quantity).toBe(1);
    expect(enriched.collectionDate).toBeTruthy();
  });

  it("clamps in-storage count at zero", () => {
    expect(computeInStorageCount(2, 5)).toBe(0);
    expect(computeInStorageCount(5, 2)).toBe(3);
  });

  it("marks samples completed after biorepository transfer", () => {
    const calls = [];
    const post = jest.fn((url, body, cb) => {
      calls.push(url);
      cb({ success: true });
    });

    applyMntdBiorepositoryTransferSuccess({
      pageId: 99,
      selectedSampleIds: ["1", "2"],
      transferResponse: { id: 42, status: "PENDING" },
      userName: "tester",
      postToOpenElisServerJsonResponse: post,
      onComplete: jest.fn(),
      onError: jest.fn(),
    });

    expect(calls).toEqual([
      "/rest/notebook/bulk/page/99/samples/apply",
      "/rest/notebook/bulk/page/99/samples/status",
    ]);
    expect(post).toHaveBeenCalledTimes(2);
  });
});
