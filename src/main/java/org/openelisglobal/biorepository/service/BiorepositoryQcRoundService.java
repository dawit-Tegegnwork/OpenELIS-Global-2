package org.openelisglobal.biorepository.service;

import java.util.List;
import java.util.Map;
import org.openelisglobal.biorepository.valueholder.BiorepositoryQcRound;

public interface BiorepositoryQcRoundService {

    BiorepositoryQcRound persistGeneratedRound(Map<String, Object> roundResult, Integer notebookId,
            String freezerFilter, String shelfFilter, String rackFilter, String boxFilter, int boxesPerRound,
            int samplesPerBox, boolean includeInspected, String sysUserId);

    BiorepositoryQcRound getRoundWithSamples(String qcBatchId);

    List<Map<String, Object>> getRoundSampleManifest(String qcBatchId);
}
