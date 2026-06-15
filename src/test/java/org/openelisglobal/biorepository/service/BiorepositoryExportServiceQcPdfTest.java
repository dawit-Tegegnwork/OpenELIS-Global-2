package org.openelisglobal.biorepository.service;

import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.when;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

@RunWith(MockitoJUnitRunner.class)
public class BiorepositoryExportServiceQcPdfTest {

    @InjectMocks
    private BiorepositoryExportServiceImpl exportService;

    @Mock
    private BiorepositoryDashboardService dashboardService;

    @Mock
    private ChainOfCustodyService custodyService;

    @Mock
    private BiorepositoryQCInspectionService qcInspectionService;

    @Mock
    private BiorepositoryQcRoundService qcRoundService;

    @Test
    public void exportQcWorksheetToPDF_returnsPdfBytes() throws Exception {
        Map<String, Object> sample = new HashMap<>();
        sample.put("bioSampleId", 30001);
        sample.put("accessionNumber", "QCT00001");
        sample.put("externalId", "QC-TEST-0001");
        sample.put("locationPath", "Zone A > ULT Freezer A1 > Shelf A > Rack 1 > Box 1-1");
        sample.put("positionCoordinate", "A1");
        when(qcRoundService.getRoundSampleManifest("QCBATCH-TEST-001")).thenReturn(List.of(sample));

        byte[] pdf = exportService.exportQcWorksheetToPDF("QCBATCH-TEST-001");
        assertTrue(pdf.length > 100);
        assertTrue(pdf[0] == '%' && pdf[1] == 'P' && pdf[2] == 'D' && pdf[3] == 'F');
    }
}
