package org.openelisglobal.notebook.controller.rest;

import static org.junit.Assert.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;
import org.openelisglobal.common.action.IActionConstants;
import org.openelisglobal.login.valueholder.UserSessionData;
import org.openelisglobal.notebook.form.NoteBookForm;
import org.openelisglobal.notebook.service.NoteBookService;
import org.openelisglobal.notebook.service.NotebookSecurityService;
import org.openelisglobal.notebook.valueholder.NoteBook;
import org.openelisglobal.rbac.RbacAction;
import org.openelisglobal.rbac.RbacPermissionService;
import org.openelisglobal.test.service.TestSectionService;
import org.openelisglobal.test.valueholder.TestSection;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpSession;

@RunWith(MockitoJUnitRunner.class)
public class NoteBookRestControllerEntryUpdateTest {

    private static final int NOTEBOOK_ENTRY_ID = 501;
    private static final int PARENT_TEMPLATE_ID = 100;
    private static final String PATHOLOGY_TECH_USER_ID = "14";

    @InjectMocks
    private NoteBookRestController controller;

    @Mock
    private NoteBookService noteBookService;

    @Mock
    private NotebookSecurityService notebookSecurityService;

    @Mock
    private RbacPermissionService rbacPermissionService;

    @Mock
    private TestSectionService testSectionService;

    private MockHttpServletRequest request;
    private NoteBook entryNotebook;
    private NoteBook parentTemplate;

    @Before
    public void setUp() {
        request = new MockHttpServletRequest();
        MockHttpSession session = new MockHttpSession();
        UserSessionData userSessionData = new UserSessionData();
        userSessionData.setSytemUserId(Integer.parseInt(PATHOLOGY_TECH_USER_ID));
        userSessionData.setLoginLabUnit(7);
        session.setAttribute(IActionConstants.USER_SESSION_DATA, userSessionData);
        request.setSession(session);

        TestSection pathologySection = org.mockito.Mockito.mock(TestSection.class);
        when(pathologySection.getLocalizedName()).thenReturn("Pathology Laboratory");
        when(testSectionService.getTestSectionById("7")).thenReturn(pathologySection);

        entryNotebook = new NoteBook();
        entryNotebook.setId(NOTEBOOK_ENTRY_ID);
        entryNotebook.setIsTemplate(false);
        entryNotebook.setWorkflowType("histopathology_biopsy_tissue");

        parentTemplate = new NoteBook();
        parentTemplate.setId(PARENT_TEMPLATE_ID);
        parentTemplate.setIsTemplate(true);
    }

    @Test
    public void updateNoteBookEntry_allowsPathologyEntryEditWithoutSampleRbac() throws Exception {
        when(noteBookService.get(NOTEBOOK_ENTRY_ID)).thenReturn(entryNotebook);
        when(noteBookService.getParentTemplate(NOTEBOOK_ENTRY_ID)).thenReturn(parentTemplate);
        when(notebookSecurityService.canViewTemplate(eq(PARENT_TEMPLATE_ID), eq(PATHOLOGY_TECH_USER_ID),
                eq("Pathology Laboratory"))).thenReturn(true);
        when(notebookSecurityService.canCreateEntry(eq(PARENT_TEMPLATE_ID), eq(PATHOLOGY_TECH_USER_ID),
                eq("Pathology Laboratory"))).thenReturn(true);
        doNothing().when(noteBookService).updateWithFormValues(eq(NOTEBOOK_ENTRY_ID), any(NoteBookForm.class));

        NoteBookForm form = new NoteBookForm();
        form.setWorkflowType("fnac");

        ResponseEntity<?> response = controller.updateNoteBookEntry(NOTEBOOK_ENTRY_ID, form, request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(rbacPermissionService, never()).hasPermission(any(HttpServletRequest.class),
                eq(RbacAction.UPDATE_SAMPLES));
        verify(rbacPermissionService, never()).hasPermission(any(HttpServletRequest.class),
                eq(RbacAction.PROCESS_SAMPLES));
    }

    @Test
    public void updateNoteBookEntry_deniesWhenEntryEditNotAllowed() {
        when(noteBookService.get(NOTEBOOK_ENTRY_ID)).thenReturn(entryNotebook);
        when(noteBookService.getParentTemplate(NOTEBOOK_ENTRY_ID)).thenReturn(parentTemplate);
        when(notebookSecurityService.canViewTemplate(eq(PARENT_TEMPLATE_ID), eq(PATHOLOGY_TECH_USER_ID),
                eq("Pathology Laboratory"))).thenReturn(true);
        when(notebookSecurityService.canCreateEntry(eq(PARENT_TEMPLATE_ID), eq(PATHOLOGY_TECH_USER_ID),
                eq("Pathology Laboratory"))).thenReturn(false);

        NoteBookForm form = new NoteBookForm();
        form.setWorkflowType("fnac");

        ResponseEntity<?> response = controller.updateNoteBookEntry(NOTEBOOK_ENTRY_ID, form, request);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }
}
