import {
  autoPopulateEmptyWells,
  getStorageCoordinateLabel,
  findLayoutEntryForCell,
  resolveOccupancyAtCell,
} from "./storagePositionUtils";

describe("storagePositionUtils", () => {
  describe("getStorageCoordinateLabel", () => {
    test("letter-number schema produces A1-style labels", () => {
      expect(getStorageCoordinateLabel(0, 0, 12, "letter-number")).toBe("A1");
      expect(getStorageCoordinateLabel(1, 2, 12, "letter-number")).toBe("B3");
    });

    test("number-number schema produces row-column labels", () => {
      expect(getStorageCoordinateLabel(0, 0, 12, "number-number")).toBe("1-1");
      expect(getStorageCoordinateLabel(1, 2, 12, "number-number")).toBe("2-3");
    });

    test("continuous schema produces sequential numeric labels", () => {
      expect(getStorageCoordinateLabel(0, 0, 12, "continuous")).toBe("1");
      expect(getStorageCoordinateLabel(0, 1, 12, "continuous")).toBe("2");
      expect(getStorageCoordinateLabel(1, 0, 12, "continuous")).toBe("13");
    });
  });

  describe("autoPopulateEmptyWells", () => {
    test("uses continuous coordinates when box schema is continuous", () => {
      const box = { rows: 2, columns: 3, positionSchemaHint: "continuous" };
      const layout = { 1: { sampleItemId: "99" } };
      const sampleIds = ["s1", "s2"];

      const { assignments, assignedCount } = autoPopulateEmptyWells(
        box,
        layout,
        sampleIds,
      );

      expect(assignedCount).toBe(2);
      expect(assignments).toEqual({ s1: "2", s2: "3" });
    });

    test("uses letter-number coordinates when box schema is letter-number", () => {
      const box = { rows: 2, columns: 3, positionSchemaHint: "letter-number" };
      const layout = {};
      const sampleIds = ["s1"];

      const { assignments, assignedCount } = autoPopulateEmptyWells(
        box,
        layout,
        sampleIds,
      );

      expect(assignedCount).toBe(1);
      expect(assignments).toEqual({ s1: "A1" });
    });
  });

  describe("resolveOccupancyAtCell", () => {
    test("matches A1 layout key when grid uses number-number hint", () => {
      const layout = { A1: { externalId: "H-0001", sampleItemId: "42" } };
      const info = resolveOccupancyAtCell(
        layout,
        "1-1",
        0,
        0,
        12,
        "number-number",
      );
      expect(info?.externalId).toBe("H-0001");
    });

    test("resolves legacy continuous numeric keys for number-number boxes", () => {
      const layout = { 1: { externalId: "LEG-1", sampleItemId: "7" } };
      const info = resolveOccupancyAtCell(
        layout,
        "1-1",
        0,
        0,
        12,
        "number-number",
      );
      expect(info?.externalId).toBe("LEG-1");
    });

    test("findLayoutEntryForCell returns undefined when columns mismatch", () => {
      const layout = { 13: { externalId: "X", sampleItemId: "9" } };
      expect(
        findLayoutEntryForCell(layout, 0, 0, 12, "number-number"),
      ).toBeUndefined();
      expect(
        resolveOccupancyAtCell(layout, "1-1", 0, 0, 12, "number-number"),
      ).toBeUndefined();
    });
  });
});
