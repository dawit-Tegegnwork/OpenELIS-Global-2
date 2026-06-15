package org.openelisglobal.biorepository.daoimpl;

import java.util.List;
import org.hibernate.Session;
import org.openelisglobal.biorepository.dao.BiorepositoryQcRoundDAO;
import org.openelisglobal.biorepository.valueholder.BiorepositoryQcRound;
import org.openelisglobal.biorepository.valueholder.BiorepositoryQcRoundSample;
import org.openelisglobal.common.daoimpl.BaseDAOImpl;
import org.springframework.stereotype.Component;

@Component
public class BiorepositoryQcRoundDAOImpl extends BaseDAOImpl<BiorepositoryQcRound, String>
        implements BiorepositoryQcRoundDAO {

    public BiorepositoryQcRoundDAOImpl() {
        super(BiorepositoryQcRound.class);
    }

    @Override
    public BiorepositoryQcRound getByQcBatchIdWithSamples(String qcBatchId) {
        if (qcBatchId == null || qcBatchId.isBlank()) {
            return null;
        }
        Session session = entityManager.unwrap(Session.class);
        String hql = "SELECT DISTINCT r FROM BiorepositoryQcRound r " + "LEFT JOIN FETCH r.samples s "
                + "WHERE r.qcBatchId = :qcBatchId " + "ORDER BY s.sortOrder ASC, s.id ASC";
        List<BiorepositoryQcRound> results = session.createQuery(hql, BiorepositoryQcRound.class)
                .setParameter("qcBatchId", qcBatchId.trim()).getResultList();
        return results.isEmpty() ? null : results.get(0);
    }

    @Override
    public List<BiorepositoryQcRoundSample> getSamplesByQcBatchId(String qcBatchId) {
        if (qcBatchId == null || qcBatchId.isBlank()) {
            return List.of();
        }
        Session session = entityManager.unwrap(Session.class);
        String hql = "FROM BiorepositoryQcRoundSample s WHERE s.round.qcBatchId = :qcBatchId "
                + "ORDER BY s.sortOrder ASC, s.id ASC";
        return session.createQuery(hql, BiorepositoryQcRoundSample.class).setParameter("qcBatchId", qcBatchId.trim())
                .getResultList();
    }
}
