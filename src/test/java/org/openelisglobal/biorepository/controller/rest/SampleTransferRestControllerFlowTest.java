package org.openelisglobal.biorepository.controller.rest;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;
import org.openelisglobal.biorepository.service.SampleTransferService;
import org.openelisglobal.biorepository.valueholder.BioSample;
import org.openelisglobal.biorepository.valueholder.SampleTransferItem;
import org.openelisglobal.login.valueholder.UserSessionData;
import org.openelisglobal.notebook.service.NoteBookPageService;
import org.openelisglobal.notebook.service.NotebookPageSampleService;
import org.openelisglobal.sampleitem.valueholder.SampleItem;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

@RunWith(MockitoJUnitRunner.Silent.class)
public class SampleTransferRestControllerFlowTest {

    @Mock
    private SampleTransferService transferService;
    @Mock
    private NoteBookPageService noteBookPageService;
    @Mock
    private NotebookPageSampleService notebookPageSampleService;

    @InjectMocks
    private SampleTransferRestController controller;

    private HttpServletRequest requestWithUser;

    @Before
    public void setUp() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        UserSessionData usd = new UserSessionData();
        usd.setSytemUserId(7);
        request.getSession().setAttribute("userSessionData", usd);
        requestWithUser = request;
    }

    @Test
    public void acceptItem_DoesNotAutoLinkToStoragePage() {
        SampleTransferItem item = new SampleTransferItem();
        item.setId(1001);
        item.setStatus(SampleTransferItem.ItemStatus.ACCEPTED);

        SampleItem sampleItem = new SampleItem();
        sampleItem.setId("ABC-100");
        item.setSampleItem(sampleItem);

        BioSample bioSample = new BioSample();
        bioSample.setId(501);
        item.setBioSample(bioSample);

        when(transferService.acceptItem(eq(1001), any(BioSample.class), eq("7"))).thenReturn(item);

        SampleTransferRestController.BioSampleMetadata metadata = new SampleTransferRestController.BioSampleMetadata();
        metadata.setNotebookId(117);
        metadata.setBiosafetyLevel("BSL_1");

        ResponseEntity<?> response = controller.acceptItem(1001, metadata, requestWithUser);
        assertEquals(200, response.getStatusCode().value());

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertNotNull(body);
        assertEquals("ABC-100", body.get("sampleItemId"));
        assertEquals(Boolean.FALSE, body.get("storagePageLinked"));
        assertFalse(body.containsKey("error"));

        verify(notebookPageSampleService, never()).createPageSampleForPageString(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    public void acceptItem_WhenPageOrderDiffers_StillDoesNotAutoLink() {
        SampleTransferItem item = new SampleTransferItem();
        item.setId(1002);
        item.setStatus(SampleTransferItem.ItemStatus.ACCEPTED);

        SampleItem sampleItem = new SampleItem();
        sampleItem.setId("ABC-200");
        item.setSampleItem(sampleItem);

        BioSample bioSample = new BioSample();
        bioSample.setId(502);
        item.setBioSample(bioSample);

        when(transferService.acceptItem(eq(1002), any(BioSample.class), eq("7"))).thenReturn(item);

        SampleTransferRestController.BioSampleMetadata metadata = new SampleTransferRestController.BioSampleMetadata();
        metadata.setNotebookId(118);
        metadata.setBiosafetyLevel("BSL_1");

        ResponseEntity<?> response = controller.acceptItem(1002, metadata, requestWithUser);
        assertEquals(200, response.getStatusCode().value());

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertNotNull(body);
        assertEquals(Boolean.FALSE, body.get("storagePageLinked"));

        verify(notebookPageSampleService, never()).createPageSampleForPageString(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }
}
