package org.openelisglobal.biorepository.valueholder;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import org.openelisglobal.common.valueholder.BaseObject;

@Entity
@Table(name = "biorepository_qc_round_sample", schema = "clinlims")
public class BiorepositoryQcRoundSample extends BaseObject<Integer> {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "biorepository_qc_round_sample_seq")
    @SequenceGenerator(name = "biorepository_qc_round_sample_seq", sequenceName = "biorepository_qc_round_sample_seq", allocationSize = 1)
    @Column(name = "id")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "qc_batch_id", nullable = false)
    @JsonIgnore
    private BiorepositoryQcRound round;

    @Column(name = "bio_sample_id", nullable = false)
    private Integer bioSampleId;

    @Column(name = "sample_item_id")
    private Integer sampleItemId;

    @Column(name = "accession_number", length = 50)
    private String accessionNumber;

    @Column(name = "external_id", length = 100)
    private String externalId;

    @Column(name = "freezer_name", length = 255)
    private String freezerName;

    @Column(name = "shelf_label", length = 100)
    private String shelfLabel;

    @Column(name = "rack_label", length = 100)
    private String rackLabel;

    @Column(name = "box_label", length = 100)
    private String boxLabel;

    @Column(name = "position_coordinate", length = 50)
    private String positionCoordinate;

    @Column(name = "location_path")
    private String locationPath;

    @Column(name = "sort_order")
    private Integer sortOrder;

    @Override
    public Integer getId() {
        return id;
    }

    @Override
    public void setId(Integer id) {
        this.id = id;
    }

    public BiorepositoryQcRound getRound() {
        return round;
    }

    public void setRound(BiorepositoryQcRound round) {
        this.round = round;
    }

    public Integer getBioSampleId() {
        return bioSampleId;
    }

    public void setBioSampleId(Integer bioSampleId) {
        this.bioSampleId = bioSampleId;
    }

    public Integer getSampleItemId() {
        return sampleItemId;
    }

    public void setSampleItemId(Integer sampleItemId) {
        this.sampleItemId = sampleItemId;
    }

    public String getAccessionNumber() {
        return accessionNumber;
    }

    public void setAccessionNumber(String accessionNumber) {
        this.accessionNumber = accessionNumber;
    }

    public String getExternalId() {
        return externalId;
    }

    public void setExternalId(String externalId) {
        this.externalId = externalId;
    }

    public String getFreezerName() {
        return freezerName;
    }

    public void setFreezerName(String freezerName) {
        this.freezerName = freezerName;
    }

    public String getShelfLabel() {
        return shelfLabel;
    }

    public void setShelfLabel(String shelfLabel) {
        this.shelfLabel = shelfLabel;
    }

    public String getRackLabel() {
        return rackLabel;
    }

    public void setRackLabel(String rackLabel) {
        this.rackLabel = rackLabel;
    }

    public String getBoxLabel() {
        return boxLabel;
    }

    public void setBoxLabel(String boxLabel) {
        this.boxLabel = boxLabel;
    }

    public String getPositionCoordinate() {
        return positionCoordinate;
    }

    public void setPositionCoordinate(String positionCoordinate) {
        this.positionCoordinate = positionCoordinate;
    }

    public String getLocationPath() {
        return locationPath;
    }

    public void setLocationPath(String locationPath) {
        this.locationPath = locationPath;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }
}
