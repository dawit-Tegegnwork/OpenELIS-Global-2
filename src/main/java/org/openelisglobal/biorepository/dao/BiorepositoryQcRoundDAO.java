package org.openelisglobal.biorepository.dao;

import java.util.List;
import org.openelisglobal.biorepository.valueholder.BiorepositoryQcRound;
import org.openelisglobal.biorepository.valueholder.BiorepositoryQcRoundSample;
import org.openelisglobal.common.dao.BaseDAO;

public interface BiorepositoryQcRoundDAO extends BaseDAO<BiorepositoryQcRound, String> {

    BiorepositoryQcRound getByQcBatchIdWithSamples(String qcBatchId);

    List<BiorepositoryQcRoundSample> getSamplesByQcBatchId(String qcBatchId);
}
