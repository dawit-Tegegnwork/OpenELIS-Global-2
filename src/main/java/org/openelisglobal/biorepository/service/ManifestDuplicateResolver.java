package org.openelisglobal.biorepository.service;

import java.util.Set;

/**
 * Resolves duplicate Sample IDs during manifest import by assigning unique
 * suffixed barcodes (e.g. PAT-001-R2).
 */
public final class ManifestDuplicateResolver {

    private ManifestDuplicateResolver() {
    }

    public static String buildSuffixedBarcode(String baseBarcode, int replicaIndex) {
        return baseBarcode + "-R" + replicaIndex;
    }

    public static String resolveUniqueBarcode(String baseBarcode, Set<String> reservedInBatch,
            Set<String> existingInDb) {
        String normalized = baseBarcode == null ? "" : baseBarcode.trim();
        if (normalized.isEmpty()) {
            return normalized;
        }
        if (!reservedInBatch.contains(normalized) && !existingInDb.contains(normalized)) {
            return normalized;
        }

        int replicaIndex = 2;
        String candidate;
        do {
            candidate = buildSuffixedBarcode(normalized, replicaIndex);
            replicaIndex++;
        } while (reservedInBatch.contains(candidate) || existingInDb.contains(candidate));
        return candidate;
    }

    public static String appendOriginalSampleIdNote(String specialHandling, String originalBarcode) {
        String note = "Original Sample ID: " + originalBarcode;
        if (specialHandling == null || specialHandling.isBlank()) {
            return note;
        }
        if (specialHandling.contains(note)) {
            return specialHandling;
        }
        return specialHandling + " | " + note;
    }
}
