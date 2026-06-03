import {
  buildLotCatalogOptions,
  buildEquipmentCatalogOptions,
  filterCatalogOptions,
} from "./lotCatalogPicker";

describe("lot catalog picker", () => {
  const catalog = [
    { id: 1, name: "Zebra Buffer", itemType: "REAGENT", category: "PCR" },
    { id: 2, name: "Alpha Centrifuge", itemType: "EQUIPMENT", category: "Lab" },
    {
      id: 3,
      name: "Beta Cartridge",
      itemType: "CARTRIDGE",
      category: "GeneXpert",
      manufacturer: "Cepheid",
    },
    { id: 4, name: "Gamma Tips", itemType: "CONSUMABLE", category: "Supplies" },
  ];

  it("excludes equipment from receive-lot catalog options", () => {
    const options = buildLotCatalogOptions(catalog);
    expect(options.map((o) => o.id)).toEqual([3, 4, 1]);
    expect(options.some((o) => o.item.itemType === "EQUIPMENT")).toBe(false);
  });

  it("filters options by name, type label, and category", () => {
    const options = buildLotCatalogOptions(catalog);
    expect(filterCatalogOptions(options, "genexpert").map((o) => o.id)).toEqual([3]);
    expect(filterCatalogOptions(options, "cepheid").map((o) => o.id)).toEqual([3]);
    expect(filterCatalogOptions(options, "reagent").map((o) => o.id)).toEqual([1]);
    expect(filterCatalogOptions(options, "supplies").map((o) => o.id)).toEqual([4]);
  });

  it("returns empty options when only equipment exists", () => {
    const options = buildLotCatalogOptions([
      { id: 2, name: "Alpha Centrifuge", itemType: "EQUIPMENT", category: "Lab" },
    ]);
    expect(options).toEqual([]);
  });

  it("includes only equipment in equipment catalog options", () => {
    const options = buildEquipmentCatalogOptions(catalog);
    expect(options.map((o) => o.id)).toEqual([2]);
    expect(options.every((o) => o.item.itemType === "EQUIPMENT")).toBe(true);
  });

  it("filters equipment options by search text", () => {
    const options = buildEquipmentCatalogOptions(catalog);
    expect(filterCatalogOptions(options, "centrifuge").map((o) => o.id)).toEqual([2]);
  });
});
