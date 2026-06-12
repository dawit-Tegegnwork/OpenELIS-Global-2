package org.openelisglobal.notebook;

import static org.junit.Assert.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Date;
import org.junit.Before;
import org.junit.Test;
import org.openelisglobal.BaseWebContextSensitiveTest;
import org.openelisglobal.common.action.IActionConstants;
import org.openelisglobal.login.valueholder.UserSessionData;
import org.openelisglobal.notebook.service.NoteBookService;
import org.openelisglobal.notebook.service.NotebookEntryService;
import org.openelisglobal.notebook.service.NotebookEntryTemperatureLogService;
import org.openelisglobal.notebook.valueholder.NoteBook;
import org.openelisglobal.notebook.valueholder.NoteBook.NoteBookStatus;
import org.openelisglobal.notebook.valueholder.NotebookEntry;
import org.openelisglobal.systemuser.service.SystemUserService;
import org.openelisglobal.systemuser.valueholder.SystemUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MvcResult;

public class NotebookTemperatureLogControllerIntegrationTest extends BaseWebContextSensitiveTest {

    @Autowired
    private NoteBookService noteBookService;

    @Autowired
    private NotebookEntryService notebookEntryService;

    @Autowired
    private NotebookEntryTemperatureLogService temperatureLogService;

    @Autowired
    private SystemUserService systemUserService;

    private ObjectMapper objectMapper;
    private MockHttpSession mockSession;
    private SystemUser testUser;
    private NoteBook testNotebook;
    private NotebookEntry testEntry;

    @Before
    public void setUp() throws Exception {
        super.setUp();
        objectMapper = new ObjectMapper();

        testUser = systemUserService.get("1");
        if (testUser == null) {
            testUser = new SystemUser();
            testUser.setLoginName("test_temp_log_user");
            testUser.setFirstName("Test");
            testUser.setLastName("Temp Log User");
            testUser.setIsActive("Y");
            testUser.setSysUserId("1");
            systemUserService.save(testUser);
        }

        mockSession = new MockHttpSession();
        UserSessionData userSessionData = new UserSessionData();
        userSessionData.setSytemUserId(Integer.parseInt(testUser.getId()));
        userSessionData.setLoginName(testUser.getLoginName());
        userSessionData.setAdmin(true);
        mockSession.setAttribute(IActionConstants.USER_SESSION_DATA, userSessionData);

        testNotebook = createTestNotebook("Temp Log Notebook " + System.currentTimeMillis());
        testEntry = createTestNotebookEntry(testNotebook, "Temp Log Entry " + System.currentTimeMillis());
    }

    @Test
    public void testImportTemperatureLogs_ImportsValidRows() throws Exception {
        String payload = "{" + "\"rows\": [" + "{" + "\"deviceCode\": \"FREEZER-IMPORT-01\","
                + "\"checkedDateTime\": \"2026-06-11T08:00\"," + "\"temperatureValue\": -80.0,"
                + "\"temperatureUnit\": \"C\"," + "\"checkTime\": \"AM\"," + "\"checkedBy\": \"AB\"" + "}" + "]" + "}";

        MvcResult result = mockMvc
                .perform(post("/rest/notebook-entry/" + testEntry.getId() + "/temperature-logs/import")
                        .session(mockSession).contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isOk()).andReturn();

        JsonNode responseJson = objectMapper.readTree(result.getResponse().getContentAsString());
        assertEquals(1, responseJson.get("importedCount").asInt());
        assertTrue(responseJson.get("success").asBoolean());
        assertEquals(1L, temperatureLogService.countByEntryId(testEntry.getId()).longValue());
    }

    @Test
    public void testImportTemperatureLogs_SkipsDuplicateRows() throws Exception {
        String payload = "{" + "\"deviceCode\": \"FREEZER-DUP\"," + "\"rows\": [" + "{"
                + "\"checkedDateTime\": \"2026-06-11T09:00\"," + "\"temperatureValue\": -79.0" + "}," + "{"
                + "\"checkedDateTime\": \"2026-06-11T09:00\"," + "\"temperatureValue\": -78.0" + "}" + "]" + "}";

        MvcResult result = mockMvc
                .perform(post("/rest/notebook-entry/" + testEntry.getId() + "/temperature-logs/import")
                        .session(mockSession).contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isOk()).andReturn();

        JsonNode responseJson = objectMapper.readTree(result.getResponse().getContentAsString());
        assertEquals(1, responseJson.get("importedCount").asInt());
        assertEquals(1, responseJson.get("skippedCount").asInt());
    }

    private NoteBook createTestNotebook(String title) {
        NoteBook notebook = new NoteBook();
        notebook.setTitle(title);
        notebook.setIsTemplate(true);
        notebook.setStatus(NoteBookStatus.ACTIVE);
        notebook.setDateCreated(new Date());
        notebook.setSysUserId(testUser.getId().toString());
        return noteBookService.save(notebook);
    }

    private NotebookEntry createTestNotebookEntry(NoteBook notebook, String title) {
        return notebookEntryService.createEntry(notebook.getId(), title, testUser.getId().toString());
    }
}
