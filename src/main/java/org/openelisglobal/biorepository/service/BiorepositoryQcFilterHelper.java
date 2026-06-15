package org.openelisglobal.biorepository.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Shared QC storage filter parsing for composite hierarchy keys
 * (device|shelf|rack|box).
 */
public final class BiorepositoryQcFilterHelper {

    public static final String ALL_OPTION = "__ALL__";
    public static final String COMPOSITE_SEPARATOR = "|";

    private BiorepositoryQcFilterHelper() {
    }

    public static String normalizeFilter(String raw) {
        if (raw == null) {
            return null;
        }
        String v = raw.trim();
        if (v.isEmpty() || ALL_OPTION.equals(v)) {
            return null;
        }
        return v;
    }

    public static String filterLeaf(String raw) {
        String normalized = normalizeFilter(raw);
        if (normalized == null) {
            return null;
        }
        if (normalized.contains(COMPOSITE_SEPARATOR)) {
            String[] parts = normalized.split("\\|", -1);
            return parts[parts.length - 1].trim();
        }
        return normalized;
    }

    public static boolean matchesLeaf(String leafValue, String filter) {
        if (filter == null) {
            return true;
        }
        if (leafValue == null) {
            return false;
        }
        return filterLeaf(filter).equals(leafValue);
    }

    public static boolean matchesCompositeLevels(String[] levels, String filter, int expectedDepth) {
        if (filter == null) {
            return true;
        }
        if (levels == null || levels.length < expectedDepth) {
            return false;
        }
        if (!filter.contains(COMPOSITE_SEPARATOR)) {
            return levels[expectedDepth - 1] != null && filter.equals(levels[expectedDepth - 1]);
        }
        String[] parts = filter.split("\\|", -1);
        if (parts.length != expectedDepth) {
            return false;
        }
        for (int i = 0; i < expectedDepth; i++) {
            if (levels[i] == null || !parts[i].trim().equals(levels[i])) {
                return false;
            }
        }
        return true;
    }

    public static boolean matchesShelfFilter(String deviceName, String shelfLabel, String shelfFilter) {
        if (shelfFilter == null) {
            return true;
        }
        if (shelfLabel == null) {
            return false;
        }
        if (!shelfFilter.contains(COMPOSITE_SEPARATOR)) {
            return shelfFilter.equals(shelfLabel);
        }
        String[] parts = shelfFilter.split("\\|", -1);
        if (parts.length < 2) {
            return false;
        }
        return parts[0].trim().equals(deviceName) && parts[1].trim().equals(shelfLabel);
    }

    public static boolean matchesRackFilter(String deviceName, String shelfLabel, String rackLabel, String rackFilter) {
        if (rackFilter == null) {
            return true;
        }
        if (rackLabel == null) {
            return false;
        }
        if (!rackFilter.contains(COMPOSITE_SEPARATOR)) {
            return rackFilter.equals(rackLabel);
        }
        String[] parts = rackFilter.split("\\|", -1);
        if (parts.length < 3) {
            return false;
        }
        return parts[0].trim().equals(deviceName) && parts[1].trim().equals(shelfLabel)
                && parts[2].trim().equals(rackLabel);
    }

    public static boolean matchesBoxFilter(String deviceName, String shelfLabel, String rackLabel, String boxLabel,
            String boxFilter) {
        if (boxFilter == null) {
            return true;
        }
        if (boxLabel == null) {
            return false;
        }
        if (!boxFilter.contains(COMPOSITE_SEPARATOR)) {
            return boxFilter.equals(boxLabel);
        }
        String[] parts = boxFilter.split("\\|", -1);
        if (parts.length < 4) {
            return false;
        }
        return parts[0].trim().equals(deviceName) && parts[1].trim().equals(shelfLabel)
                && parts[2].trim().equals(rackLabel) && parts[3].trim().equals(boxLabel);
    }

    public static boolean matchesPoolLevels(String[] levels, String freezerFilter, String shelfFilter,
            String rackFilter, String boxFilter) {
        if (levels == null || levels.length < 4) {
            return false;
        }
        if (!matchesLeaf(levels[0], freezerFilter)) {
            return false;
        }
        if (!matchesShelfFilter(levels[0], levels[1], shelfFilter)) {
            return false;
        }
        if (!matchesRackFilter(levels[0], levels[1], levels[2], rackFilter)) {
            return false;
        }
        return matchesBoxFilter(levels[0], levels[1], levels[2], levels[3], boxFilter);
    }

    public static Map<String, String> shelfOption(String deviceName, String shelfLabel) {
        Map<String, String> option = new HashMap<>();
        option.put("value", deviceName + COMPOSITE_SEPARATOR + shelfLabel);
        option.put("label", shelfLabel);
        option.put("parentFreezer", deviceName);
        return option;
    }

    public static Map<String, String> rackOption(String deviceName, String shelfLabel, String rackLabel) {
        Map<String, String> option = new HashMap<>();
        option.put("value", deviceName + COMPOSITE_SEPARATOR + shelfLabel + COMPOSITE_SEPARATOR + rackLabel);
        option.put("label", rackLabel);
        option.put("parentFreezer", deviceName);
        option.put("parentShelf", shelfLabel);
        return option;
    }

    public static Map<String, String> boxOption(String deviceName, String shelfLabel, String rackLabel,
            String boxLabel) {
        Map<String, String> option = new HashMap<>();
        option.put("value", deviceName + COMPOSITE_SEPARATOR + shelfLabel + COMPOSITE_SEPARATOR + rackLabel
                + COMPOSITE_SEPARATOR + boxLabel);
        option.put("label", boxLabel);
        option.put("parentFreezer", deviceName);
        option.put("parentShelf", shelfLabel);
        option.put("parentRack", rackLabel);
        return option;
    }

    public static List<Map<String, String>> dedupeStructuredOptions(List<Map<String, String>> options) {
        List<Map<String, String>> deduped = new ArrayList<>();
        List<String> seen = new ArrayList<>();
        for (Map<String, String> option : options) {
            String value = option.get("value");
            if (value == null || seen.contains(value)) {
                continue;
            }
            seen.add(value);
            deduped.add(option);
        }
        deduped.sort((a, b) -> String.valueOf(a.get("value")).compareToIgnoreCase(String.valueOf(b.get("value"))));
        return deduped;
    }
}
