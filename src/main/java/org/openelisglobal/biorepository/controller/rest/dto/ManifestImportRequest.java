package org.openelisglobal.biorepository.controller.rest.dto;

import java.util.List;

/**
 * Request DTO for manifest import operations (validation and bulk
 * registration).
 */
public class ManifestImportRequest {

    private List<SampleRegistrationDTO> samples;
    private Integer shipmentId;
    private Integer departmentTestSectionId;
    private DuplicateResolution duplicateResolution;

    public List<SampleRegistrationDTO> getSamples() {
        return samples;
    }

    public void setSamples(List<SampleRegistrationDTO> samples) {
        this.samples = samples;
    }

    public Integer getShipmentId() {
        return shipmentId;
    }

    public void setShipmentId(Integer shipmentId) {
        this.shipmentId = shipmentId;
    }

    public Integer getDepartmentTestSectionId() {
        return departmentTestSectionId;
    }

    public void setDepartmentTestSectionId(Integer departmentTestSectionId) {
        this.departmentTestSectionId = departmentTestSectionId;
    }

    public DuplicateResolution getDuplicateResolution() {
        return duplicateResolution;
    }

    public void setDuplicateResolution(DuplicateResolution duplicateResolution) {
        this.duplicateResolution = duplicateResolution;
    }

    /**
     * User-approved strategy for importing rows with duplicate Sample IDs.
     */
    public static class DuplicateResolution {
        private String mode = "SUFFIX";
        private List<Integer> allowedRowIndexes;

        public String getMode() {
            return mode;
        }

        public void setMode(String mode) {
            this.mode = mode;
        }

        public List<Integer> getAllowedRowIndexes() {
            return allowedRowIndexes;
        }

        public void setAllowedRowIndexes(List<Integer> allowedRowIndexes) {
            this.allowedRowIndexes = allowedRowIndexes;
        }
    }
}
