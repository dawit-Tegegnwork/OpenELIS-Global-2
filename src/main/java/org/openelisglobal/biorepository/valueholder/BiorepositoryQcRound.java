package org.openelisglobal.biorepository.valueholder;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import org.openelisglobal.common.valueholder.BaseObject;

@Entity
@Table(name = "biorepository_qc_round", schema = "clinlims")
public class BiorepositoryQcRound extends BaseObject<String> {

    @Id
    @Column(name = "qc_batch_id", length = 80, nullable = false)
    private String qcBatchId;

    @Column(name = "notebook_id")
    private Integer notebookId;

    @Column(name = "freezer_filter", length = 255)
    private String freezerFilter;

    @Column(name = "shelf_filter", length = 255)
    private String shelfFilter;

    @Column(name = "rack_filter", length = 255)
    private String rackFilter;

    @Column(name = "box_filter", length = 255)
    private String boxFilter;

    @Column(name = "boxes_per_round")
    private Integer boxesPerRound;

    @Column(name = "samples_per_box")
    private Integer samplesPerBox;

    @Column(name = "include_inspected")
    private Boolean includeInspected;

    @Column(name = "created_by_user_id", length = 36)
    private String createdByUserId;

    @Column(name = "created_at", nullable = false)
    private Timestamp createdAt;

    @OneToMany(mappedBy = "round", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("sortOrder ASC, id ASC")
    private List<BiorepositoryQcRoundSample> samples = new ArrayList<>();

    @Override
    public String getId() {
        return qcBatchId;
    }

    @Override
    public void setId(String id) {
        this.qcBatchId = id;
    }

    public String getQcBatchId() {
        return qcBatchId;
    }

    public void setQcBatchId(String qcBatchId) {
        this.qcBatchId = qcBatchId;
    }

    public Integer getNotebookId() {
        return notebookId;
    }

    public void setNotebookId(Integer notebookId) {
        this.notebookId = notebookId;
    }

    public String getFreezerFilter() {
        return freezerFilter;
    }

    public void setFreezerFilter(String freezerFilter) {
        this.freezerFilter = freezerFilter;
    }

    public String getShelfFilter() {
        return shelfFilter;
    }

    public void setShelfFilter(String shelfFilter) {
        this.shelfFilter = shelfFilter;
    }

    public String getRackFilter() {
        return rackFilter;
    }

    public void setRackFilter(String rackFilter) {
        this.rackFilter = rackFilter;
    }

    public String getBoxFilter() {
        return boxFilter;
    }

    public void setBoxFilter(String boxFilter) {
        this.boxFilter = boxFilter;
    }

    public Integer getBoxesPerRound() {
        return boxesPerRound;
    }

    public void setBoxesPerRound(Integer boxesPerRound) {
        this.boxesPerRound = boxesPerRound;
    }

    public Integer getSamplesPerBox() {
        return samplesPerBox;
    }

    public void setSamplesPerBox(Integer samplesPerBox) {
        this.samplesPerBox = samplesPerBox;
    }

    public Boolean getIncludeInspected() {
        return includeInspected;
    }

    public void setIncludeInspected(Boolean includeInspected) {
        this.includeInspected = includeInspected;
    }

    public String getCreatedByUserId() {
        return createdByUserId;
    }

    public void setCreatedByUserId(String createdByUserId) {
        this.createdByUserId = createdByUserId;
    }

    public Timestamp getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Timestamp createdAt) {
        this.createdAt = createdAt;
    }

    public List<BiorepositoryQcRoundSample> getSamples() {
        return samples;
    }

    public void setSamples(List<BiorepositoryQcRoundSample> samples) {
        this.samples = samples;
    }
}
