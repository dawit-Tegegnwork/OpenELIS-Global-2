package org.openelisglobal.biorepository.service;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.openelisglobal.biorepository.dao.BiorepositoryQcRoundDAO;
import org.openelisglobal.biorepository.valueholder.BiorepositoryQcRound;
import org.openelisglobal.biorepository.valueholder.BiorepositoryQcRoundSample;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BiorepositoryQcRoundServiceImpl implements BiorepositoryQcRoundService {

    @Autowired
    private BiorepositoryQcRoundDAO qcRoundDAO;

    @Override
    @Transactional
    public BiorepositoryQcRound persistGeneratedRound(Map<String, Object> roundResult, Integer notebookId,
            String freezerFilter, String shelfFilter, String rackFilter, String boxFilter, int boxesPerRound,
            int samplesPerBox, boolean includeInspected, String sysUserId) {
        String qcBatchId = asString(roundResult.get("qcBatchId"));
        if (qcBatchId == null || qcBatchId.isBlank()) {
            throw new IllegalArgumentException("qcBatchId is required to persist QC round");
        }

        qcRoundDAO.get(qcBatchId).ifPresent(qcRoundDAO::delete);

        BiorepositoryQcRound round = new BiorepositoryQcRound();
        round.setQcBatchId(qcBatchId);
        round.setNotebookId(notebookId);
        round.setFreezerFilter(freezerFilter);
        round.setShelfFilter(shelfFilter);
        round.setRackFilter(rackFilter);
        round.setBoxFilter(boxFilter);
        round.setBoxesPerRound(boxesPerRound);
        round.setSamplesPerBox(samplesPerBox);
        round.setIncludeInspected(includeInspected);
        round.setCreatedByUserId(sysUserId);
        round.setCreatedAt(new Timestamp(System.currentTimeMillis()));
        round.setLastupdatedFields();
        round.setSysUserId(sysUserId);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> selectedSamples = roundResult.get("samples") instanceof List
                ? (List<Map<String, Object>>) roundResult.get("samples")
                : List.of();

        int sortOrder = 0;
        for (Map<String, Object> sample : selectedSamples) {
            BiorepositoryQcRoundSample row = new BiorepositoryQcRoundSample();
            row.setRound(round);
            row.setBioSampleId(toInteger(sample.get("bioSampleId")));
            row.setSampleItemId(toInteger(sample.get("sampleItemId")));
            row.setAccessionNumber(asString(sample.get("accessionNumber")));
            row.setExternalId(asString(sample.get("externalId")));
            row.setFreezerName(asString(sample.get("freezer")));
            row.setShelfLabel(asString(sample.get("shelf")));
            row.setRackLabel(asString(sample.get("rack")));
            row.setBoxLabel(asString(sample.get("box")));
            row.setPositionCoordinate(asString(sample.get("positionCoordinate")));
            row.setLocationPath(asString(sample.get("locationPath")));
            row.setSortOrder(sortOrder++);
            row.setLastupdatedFields();
            row.setSysUserId(sysUserId);
            round.getSamples().add(row);
        }

        qcRoundDAO.insert(round);
        return round;
    }

    @Override
    @Transactional(readOnly = true)
    public BiorepositoryQcRound getRoundWithSamples(String qcBatchId) {
        return qcRoundDAO.getByQcBatchIdWithSamples(qcBatchId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getRoundSampleManifest(String qcBatchId) {
        BiorepositoryQcRound round = qcRoundDAO.getByQcBatchIdWithSamples(qcBatchId);
        if (round == null || round.getSamples() == null) {
            return List.of();
        }
        List<Map<String, Object>> manifest = new ArrayList<>();
        for (BiorepositoryQcRoundSample sample : round.getSamples()) {
            Map<String, Object> row = new HashMap<>();
            row.put("bioSampleId", sample.getBioSampleId());
            row.put("sampleItemId", sample.getSampleItemId());
            row.put("accessionNumber", sample.getAccessionNumber());
            row.put("externalId", sample.getExternalId());
            row.put("freezer", sample.getFreezerName());
            row.put("shelf", sample.getShelfLabel());
            row.put("rack", sample.getRackLabel());
            row.put("box", sample.getBoxLabel());
            row.put("positionCoordinate", sample.getPositionCoordinate());
            row.put("locationPath", sample.getLocationPath());
            manifest.add(row);
        }
        return manifest;
    }

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private Integer toInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
