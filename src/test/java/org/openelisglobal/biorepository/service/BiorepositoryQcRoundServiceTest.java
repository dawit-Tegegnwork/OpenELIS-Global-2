package org.openelisglobal.biorepository.service;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;
import org.openelisglobal.biorepository.dao.BiorepositoryQcRoundDAO;
import org.openelisglobal.biorepository.valueholder.BiorepositoryQcRound;

@RunWith(MockitoJUnitRunner.class)
public class BiorepositoryQcRoundServiceTest {

    @InjectMocks
    private BiorepositoryQcRoundServiceImpl qcRoundService;

    @Mock
    private BiorepositoryQcRoundDAO qcRoundDAO;

    @Before
    public void setUp() {
        when(qcRoundDAO.get(anyString())).thenReturn(Optional.empty());
    }

    @Test
    public void persistGeneratedRound_storesManifestSamples() {
        Map<String, Object> sample = new HashMap<>();
        sample.put("bioSampleId", 30001);
        sample.put("sampleItemId", 30001);
        sample.put("accessionNumber", "QCT00001");
        sample.put("externalId", "QC-TEST-0001");
        sample.put("freezer", "ULT Freezer A1");
        sample.put("shelf", "Shelf A");
        sample.put("rack", "Rack 1");
        sample.put("box", "Box 1-1");
        sample.put("positionCoordinate", "A1");
        sample.put("locationPath", "Zone A > ULT Freezer A1 > Shelf A > Rack 1 > Box 1-1 > A1");

        Map<String, Object> roundResult = new HashMap<>();
        roundResult.put("qcBatchId", "QCBATCH-TEST-001");
        roundResult.put("samples", List.of(sample));

        BiorepositoryQcRound saved = qcRoundService.persistGeneratedRound(roundResult, 13, "ULT Freezer A1", null, null,
                null, 1, 1, true, "1");

        assertNotNull(saved);
        assertEquals("QCBATCH-TEST-001", saved.getQcBatchId());
        assertEquals(1, saved.getSamples().size());
        assertEquals("QCT00001", saved.getSamples().get(0).getAccessionNumber());

        ArgumentCaptor<BiorepositoryQcRound> captor = ArgumentCaptor.forClass(BiorepositoryQcRound.class);
        verify(qcRoundDAO).insert(captor.capture());
        assertEquals(1, captor.getValue().getSamples().size());
    }
}
