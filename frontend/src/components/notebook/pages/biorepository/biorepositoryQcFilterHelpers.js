export const ALL_OPTION = "__ALL__";

const isStructuredOption = (entry) =>
  entry && typeof entry === "object" && entry.value != null;

const buildContextualLabel = (value, baseLabel, parentSelected) => {
  if (parentSelected) {
    return baseLabel || value;
  }
  if (value && String(value).includes("|")) {
    return String(value).split("|").join(" › ");
  }
  return baseLabel || value;
};

export const normalizeFilterOptions = (
  entries,
  allLabel,
  parentSelected = true,
) => {
  const items = [{ id: ALL_OPTION, label: allLabel }];
  if (!Array.isArray(entries)) {
    return items;
  }

  entries.forEach((entry) => {
    if (typeof entry === "string") {
      items.push({ id: entry, label: entry });
      return;
    }
    if (!isStructuredOption(entry)) {
      return;
    }
    const value = String(entry.value);
    const baseLabel = entry.label || value;
    const parentFreezer = entry.parentFreezer;
    const parentShelf = entry.parentShelf;
    const parentRack = entry.parentRack;

    let label = buildContextualLabel(value, baseLabel, parentSelected);
    if (!parentSelected && parentFreezer && !value.includes("|")) {
      label = `${parentFreezer} › ${baseLabel}`;
    } else if (!parentSelected && parentFreezer && parentShelf && parentRack) {
      label = `${parentFreezer} › ${parentShelf} › ${parentRack} › ${baseLabel}`;
    } else if (!parentSelected && parentFreezer && parentShelf) {
      label = `${parentFreezer} › ${parentShelf} › ${baseLabel}`;
    } else if (!parentSelected && parentFreezer) {
      label = `${parentFreezer} › ${baseLabel}`;
    }

    items.push({ id: value, label });
  });

  return items;
};

export const buildQcFilterOptionItems = (
  filters = {},
  {
    requiresDeviceSelection = false,
    hasMultipleDevices = false,
    deviceSelected = false,
    shelfSelected = false,
    rackSelected = false,
  } = {},
) => {
  const freezerOptions = requiresDeviceSelection
    ? (filters.freezers || [])
        .filter((value) => value != null && String(value).trim() !== "")
        .sort((a, b) => String(a).localeCompare(String(b)))
        .map((value) => ({ id: value, label: value }))
    : normalizeFilterOptions(filters.freezers, "All devices", true);

  const showScopedChildLabels = hasMultipleDevices && !deviceSelected;

  return {
    freezer: freezerOptions,
    shelf: normalizeFilterOptions(
      filters.shelves,
      "All shelves",
      !showScopedChildLabels,
    ),
    rack: normalizeFilterOptions(
      filters.racks,
      "All racks",
      !showScopedChildLabels && shelfSelected,
    ),
    box: normalizeFilterOptions(
      filters.boxes,
      "All boxes",
      !showScopedChildLabels && rackSelected,
    ),
  };
};

export const shouldDisableChildFilter = (
  level,
  { hasMultipleDevices, shelfSelected, rackSelected },
) => {
  if (!hasMultipleDevices) {
    return false;
  }
  // Shelves stay enabled with device-prefixed labels when "All devices" is selected.
  if (level === "shelf") {
    return false;
  }
  if (level === "rack") {
    return !shelfSelected;
  }
  if (level === "box") {
    return !rackSelected;
  }
  return false;
};
