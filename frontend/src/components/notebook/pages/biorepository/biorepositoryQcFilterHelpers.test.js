import {
  ALL_OPTION,
  buildQcFilterOptionItems,
  normalizeFilterOptions,
  shouldDisableChildFilter,
} from "./biorepositoryQcFilterHelpers";

describe("biorepositoryQcFilterHelpers", () => {
  test("normalizeFilterOptions prefixes parent context when parent not selected", () => {
    const items = normalizeFilterOptions(
      [
        {
          value: "ULT Freezer A1|Shelf A",
          label: "Shelf A",
          parentFreezer: "ULT Freezer A1",
        },
      ],
      "All shelves",
      false,
    );
    expect(items[1].id).toBe("ULT Freezer A1|Shelf A");
    expect(items[1].label).toBe("ULT Freezer A1 › Shelf A");
  });

  test("normalizeFilterOptions builds label from composite value when parent metadata missing", () => {
    const items = normalizeFilterOptions(
      [{ value: "ULT Freezer A2|Shelf B", label: "Shelf B" }],
      "All shelves",
      false,
    );
    expect(items[1].label).toBe("ULT Freezer A2 › Shelf B");
  });

  test("buildQcFilterOptionItems returns all scoped shelves across devices", () => {
    const items = buildQcFilterOptionItems(
      {
        freezers: ["ULT Freezer A1", "ULT Freezer A2"],
        shelves: [
          {
            value: "ULT Freezer A1|Shelf A",
            label: "Shelf A",
            parentFreezer: "ULT Freezer A1",
          },
          {
            value: "ULT Freezer A1|Shelf B",
            label: "Shelf B",
            parentFreezer: "ULT Freezer A1",
          },
          {
            value: "ULT Freezer A2|Shelf A",
            label: "Shelf A",
            parentFreezer: "ULT Freezer A2",
          },
          {
            value: "ULT Freezer A2|Shelf B",
            label: "Shelf B",
            parentFreezer: "ULT Freezer A2",
          },
        ],
        racks: [],
        boxes: [],
      },
      {
        requiresDeviceSelection: false,
        hasMultipleDevices: true,
        deviceSelected: false,
        shelfSelected: false,
        rackSelected: false,
      },
    );
    expect(items.shelf).toHaveLength(5);
    expect(items.shelf[1].label).toBe("ULT Freezer A1 › Shelf A");
    expect(items.shelf[3].label).toBe("ULT Freezer A2 › Shelf A");
  });

  test("shouldDisableChildFilter keeps shelf enabled but gates rack and box", () => {
    expect(
      shouldDisableChildFilter("shelf", {
        hasMultipleDevices: true,
        shelfSelected: false,
        rackSelected: false,
      }),
    ).toBe(false);
    expect(
      shouldDisableChildFilter("rack", {
        hasMultipleDevices: true,
        shelfSelected: false,
        rackSelected: false,
      }),
    ).toBe(true);
    expect(
      shouldDisableChildFilter("rack", {
        hasMultipleDevices: true,
        shelfSelected: true,
        rackSelected: false,
      }),
    ).toBe(false);
  });

  test("buildQcFilterOptionItems keeps plain freezer list when device selection required", () => {
    const items = buildQcFilterOptionItems(
      {
        freezers: ["ULT Freezer A1", "ULT Freezer A2"],
        shelves: [
          {
            value: "ULT Freezer A1|Shelf A",
            label: "Shelf A",
            parentFreezer: "ULT Freezer A1",
          },
        ],
        racks: [],
        boxes: [],
      },
      {
        requiresDeviceSelection: true,
        hasMultipleDevices: true,
        deviceSelected: true,
        shelfSelected: false,
        rackSelected: false,
      },
    );
    expect(items.freezer).toHaveLength(2);
    expect(items.freezer[0].id).toBe("ULT Freezer A1");
    expect(items.shelf[0].id).toBe(ALL_OPTION);
    expect(items.shelf[1].label).toBe("Shelf A");
  });
});
