import { getItemTypeLabel, isLotReceivableType, isEquipmentType } from "./inventoryItemTypeLabels";

const mapCatalogOption = (catalogItem) => {
  const typeLabel = getItemTypeLabel(catalogItem.itemType);
  const category = catalogItem.category || "";
  const manufacturer = catalogItem.manufacturer || "";
  return {
    id: catalogItem.id,
    text: `${catalogItem.name}${category ? ` (${category})` : ` (${typeLabel})`}`,
    searchText:
      `${catalogItem.name} ${typeLabel} ${category} ${manufacturer}`.toLowerCase(),
    item: catalogItem,
  };
};

/** Build searchable ComboBox options for Receive Lot (excludes EQUIPMENT). */
export function buildLotCatalogOptions(catalogItems) {
  return (catalogItems || [])
    .filter((item) => isLotReceivableType(item.itemType))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(mapCatalogOption);
}

/** Build searchable ComboBox options for Register Equipment (EQUIPMENT only). */
export function buildEquipmentCatalogOptions(catalogItems) {
  return (catalogItems || [])
    .filter((item) => isEquipmentType(item.itemType))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(mapCatalogOption);
}

export function filterCatalogOptions(options, inputValue) {
  if (!inputValue) {
    return options;
  }
  const needle = inputValue.trim().toLowerCase();
  return options.filter((item) => item.searchText.includes(needle));
}
