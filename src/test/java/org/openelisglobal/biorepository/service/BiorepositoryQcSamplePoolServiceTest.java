package org.openelisglobal.biorepository.service;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;
import org.openelisglobal.biorepository.valueholder.BioSample;
import org.openelisglobal.biorepository.valueholder.BioSample.WorkflowStatus;
import org.openelisglobal.biorepository.valueholder.BiorepositoryQCInspection;
import org.openelisglobal.common.services.IStatusService;
import org.openelisglobal.common.services.StatusService.SampleStatus;
import org.openelisglobal.notebook.service.NoteBookService;
import org.openelisglobal.notebook.service.NotebookDepartmentScopeService;
import org.openelisglobal.sampleitem.valueholder.SampleItem;
import org.openelisglobal.storage.service.SampleStorageService;
import org.openelisglobal.storage.service.StorageLocationService;
import org.openelisglobal.storage.valueholder.StorageDevice;
import org.openelisglobal.storage.valueholder.StorageShelf;
import org.openelisglobal.test.service.TestSectionService;
import org.openelisglobal.test.valueholder.TestSection;

@RunWith(MockitoJUnitRunner.class)
public class BiorepositoryQcSamplePoolServiceTest {

    private static final int NOTEBOOK_ID = 42;
    private static final int DEPT_ID = 100;

    @InjectMocks
    private BiorepositoryQcSamplePoolServiceImpl poolService;

    @Mock
    private SampleStorageService sampleStorageService;

    @Mock
    private BioSampleService bioSampleService;

    @Mock
    private BiorepositoryQCInspectionService qcInspectionService;

    @Mock
    private StorageLocationService storageLocationService;

    @Mock
    private NoteBookService noteBookService;

    @Mock
    private NotebookDepartmentScopeService notebookDepartmentScopeService;

    @Mock
    private TestSectionService testSectionService;

    @Mock
    private IStatusService statusService;

    @Before
    public void setUp() {
        when(storageLocationService.getAllDevices()).thenReturn(List.of());
        when(storageLocationService.getAllShelves()).thenReturn(List.of());
        when(storageLocationService.getAllRacks()).thenReturn(List.of());
        when(storageLocationService.getAllBoxes()).thenReturn(List.of());

        TestSection department = new TestSection();
        department.setId(String.valueOf(DEPT_ID));
        department.setTestSectionName("Biorepository Laboratory");
        when(noteBookService.getNoteBookDepartments(NOTEBOOK_ID)).thenReturn(Set.of(department));
        when(notebookDepartmentScopeService.resolveNotebookDepartmentIds(eq(NOTEBOOK_ID), eq(true)))
                .thenReturn(Set.of(DEPT_ID));

        when(statusService.matches(any(), eq(SampleStatus.Disposed))).thenAnswer(invocation -> {
            String statusId = invocation.getArgument(0);
            return "disposed-status".equals(statusId);
        });
        when(qcInspectionService.getMostRecentByBioSampleIds(any())).thenReturn(Map.of());
        when(qcInspectionService.getBioSampleIdsWithAnyInspection(any())).thenReturn(Set.of());
        when(qcInspectionService.getBioSampleIdsInspectedBetween(any(), any(), any())).thenReturn(Set.of());
    }

    @Test
    public void buildStorageOverview_excludesDisposedAndUnassigned() {
        when(sampleStorageService.getAllSamplesWithAssignments()).thenReturn(List.of(
                assignmentRow("1", "Room > Freezer > Shelf > Rack > Box", DEPT_ID, "active"),
                assignmentRow("2", "Room > Freezer > Shelf > Rack > Box", DEPT_ID, "disposed-status"),
                assignmentRow("3", "", DEPT_ID, "active")));

        Map<String, Object> overview = poolService.buildStorageOverview(null, null, null, null, true, NOTEBOOK_ID);

        @SuppressWarnings("unchecked")
        Map<String, Object> diagnostics = (Map<String, Object>) overview.get("diagnostics");
        assertEquals(1, diagnostics.get("storageManagementActiveInScope"));
        assertEquals(0, diagnostics.get("qcPoolTotal"));
        verify(bioSampleService, never()).ensureBioSampleForStoredSampleItem(any(), any());
    }

    @Test
    public void buildStorageOverview_linksBioSampleViaBatchLookup() {
        Map<String, Object> row = assignmentRow("10", "Biorepository Laboratory > Freezer-A > Shelf-1 > Rack-1 > Box-1",
                DEPT_ID, "active");
        when(sampleStorageService.getAllSamplesWithAssignments()).thenReturn(List.of(row));

        BioSample existing = new BioSample();
        existing.setId(501);
        existing.setWorkflowStatus(WorkflowStatus.STORED);
        SampleItem sampleItem = new SampleItem();
        sampleItem.setId("10");
        existing.setSampleItem(sampleItem);
        when(bioSampleService.getBySampleItemIds(List.of(10))).thenReturn(List.of(existing));

        Map<String, Object> overview = poolService.buildStorageOverview(null, null, null, null, true, NOTEBOOK_ID);

        @SuppressWarnings("unchecked")
        Map<String, Object> diagnostics = (Map<String, Object>) overview.get("diagnostics");
        assertEquals(1, diagnostics.get("qcPoolTotal"));
        assertEquals(0, diagnostics.get("bioSamplesLazyLinked"));
        @SuppressWarnings("unchecked")
        Map<String, Object> scopeStats = (Map<String, Object>) overview.get("scopeStats");
        assertEquals(1, scopeStats.get("totalStored"));
    }

    @Test
    public void listSamplesForQcTable_returnsSampleItemId() {
        Map<String, Object> row = assignmentRow("11", "Biorepository Laboratory > Freezer-A > Shelf-1 > Rack-1 > Box-1",
                DEPT_ID, "active");
        when(sampleStorageService.getAllSamplesWithAssignments()).thenReturn(List.of(row));

        BioSample existing = new BioSample();
        existing.setId(502);
        existing.setWorkflowStatus(WorkflowStatus.STORED);
        SampleItem sampleItem = new SampleItem();
        sampleItem.setId("11");
        existing.setSampleItem(sampleItem);
        when(bioSampleService.getBySampleItemIds(List.of(11))).thenReturn(List.of(existing));

        List<Map<String, Object>> samples = poolService.listSamplesForQcTable(NOTEBOOK_ID);
        assertEquals(1, samples.size());
        assertEquals("11", String.valueOf(samples.get(0).get("sampleItemId")));
        assertNotNull(samples.get(0).get("bioSampleId"));
    }

    @Test
    public void listSamplesForQcTable_mapsMostRecentInspectionForImmediateDisplay() {
        Map<String, Object> row = assignmentRow("12", "Biorepository Laboratory > Freezer-A > Shelf-1 > Rack-1 > Box-1",
                DEPT_ID, "active");
        when(sampleStorageService.getAllSamplesWithAssignments()).thenReturn(List.of(row));

        BioSample existing = new BioSample();
        existing.setId(503);
        existing.setWorkflowStatus(WorkflowStatus.STORED);
        SampleItem sampleItem = new SampleItem();
        sampleItem.setId("12");
        existing.setSampleItem(sampleItem);
        when(bioSampleService.getBySampleItemIds(List.of(12))).thenReturn(List.of(existing));

        BiorepositoryQCInspection inspection = new BiorepositoryQCInspection();
        inspection.setId(9001);
        inspection.setBioSample(existing);
        inspection.setQcResult(BiorepositoryQCInspection.QCResult.DISCREPANCY_FOUND);
        inspection.setCorrectionActionType("UPDATE_LOCATION");
        inspection.setInspectionDate(new java.sql.Timestamp(System.currentTimeMillis()));
        when(qcInspectionService.getMostRecentByBioSampleIds(List.of(503))).thenReturn(Map.of(503, inspection));
        when(qcInspectionService.getBioSampleIdsWithAnyInspection(List.of(503))).thenReturn(Set.of(503));

        List<Map<String, Object>> samples = poolService.listSamplesForQcTable(NOTEBOOK_ID);
        assertEquals(1, samples.size());
        @SuppressWarnings("unchecked")
        Map<String, Object> lastQCInspection = (Map<String, Object>) samples.get(0).get("lastQCInspection");
        assertNotNull(lastQCInspection);
        assertEquals("DISCREPANCY_FOUND", String.valueOf(lastQCInspection.get("qcResult")));
        assertEquals("FAILED_CORRECTED", String.valueOf(lastQCInspection.get("lifecycleOutcome")));
        assertNotNull(lastQCInspection.get("inspectionDate"));
    }

    @Test
    public void buildStorageOverview_returnsAllStructuredShelvesWhenNoDeviceFilter() {
        StorageDevice freezerA1 = buildBiorepositoryDevice(1, "ULT Freezer A1");
        StorageDevice freezerA2 = buildBiorepositoryDevice(2, "ULT Freezer A2");
        StorageDevice freezerB1 = buildBiorepositoryDevice(3, "ULT Freezer B1");
        StorageDevice freezerB2 = buildBiorepositoryDevice(4, "ULT Freezer B2");
        List<StorageShelf> shelves = List.of(buildShelf(101, "Shelf A", freezerA1),
                buildShelf(102, "Shelf B", freezerA1), buildShelf(201, "Shelf A", freezerA2),
                buildShelf(202, "Shelf B", freezerA2), buildShelf(301, "Shelf A", freezerB1),
                buildShelf(302, "Shelf B", freezerB1), buildShelf(401, "Shelf A", freezerB2),
                buildShelf(402, "Shelf B", freezerB2));

        when(storageLocationService.getAllDevices()).thenReturn(List.of(freezerA1, freezerA2, freezerB1, freezerB2));
        when(storageLocationService.getAllShelves()).thenReturn(shelves);
        when(storageLocationService.getAllRacks()).thenReturn(List.of());
        when(storageLocationService.getAllBoxes()).thenReturn(List.of());
        when(sampleStorageService.getAllSamplesWithAssignments()).thenReturn(List.of());

        Map<String, Object> overview = poolService.buildStorageOverview(null, null, null, null, true, NOTEBOOK_ID);

        @SuppressWarnings("unchecked")
        Map<String, Object> filters = (Map<String, Object>) overview.get("filters");
        @SuppressWarnings("unchecked")
        List<Map<String, String>> shelfFilters = (List<Map<String, String>>) filters.get("shelves");
        assertEquals(8, shelfFilters.size());
        assertEquals(8, ((Map<String, Object>) overview.get("counts")).get("shelves"));
        assertTrue(shelfFilters.stream().anyMatch(option -> "ULT Freezer A1|Shelf A".equals(option.get("value"))));
        assertTrue(shelfFilters.stream().anyMatch(option -> "ULT Freezer B2|Shelf B".equals(option.get("value"))));
    }

    @Test
    public void buildStorageOverview_scopesStructuredShelfFiltersToSelectedDevice() {
        StorageDevice freezerA1 = buildBiorepositoryDevice(1, "ULT Freezer A1");
        StorageDevice freezerA2 = buildBiorepositoryDevice(2, "ULT Freezer A2");
        StorageShelf shelfA1A = buildShelf(101, "Shelf A", freezerA1);
        StorageShelf shelfA1B = buildShelf(102, "Shelf B", freezerA1);
        StorageShelf shelfA2A = buildShelf(201, "Shelf A", freezerA2);
        StorageShelf shelfA2B = buildShelf(202, "Shelf B", freezerA2);

        when(storageLocationService.getAllDevices()).thenReturn(List.of(freezerA1, freezerA2));
        when(storageLocationService.getAllShelves()).thenReturn(List.of(shelfA1A, shelfA1B, shelfA2A, shelfA2B));
        when(storageLocationService.getAllRacks()).thenReturn(List.of());
        when(storageLocationService.getAllBoxes()).thenReturn(List.of());
        when(sampleStorageService.getAllSamplesWithAssignments()).thenReturn(List.of());

        Map<String, Object> overview = poolService.buildStorageOverview("ULT Freezer A1", null, null, null, true,
                NOTEBOOK_ID);

        @SuppressWarnings("unchecked")
        Map<String, Object> filters = (Map<String, Object>) overview.get("filters");
        @SuppressWarnings("unchecked")
        List<Map<String, String>> shelves = (List<Map<String, String>>) filters.get("shelves");
        assertEquals(2, shelves.size());
        assertTrue(shelves.stream().allMatch(option -> option.get("value").startsWith("ULT Freezer A1|")));
        assertTrue(shelves.stream().anyMatch(option -> "ULT Freezer A1|Shelf A".equals(option.get("value"))));
        assertTrue(shelves.stream().anyMatch(option -> "ULT Freezer A1|Shelf B".equals(option.get("value"))));

        @SuppressWarnings("unchecked")
        Map<String, Object> counts = (Map<String, Object>) overview.get("counts");
        assertEquals(1, counts.get("freezers"));
        assertEquals(2, counts.get("shelves"));
    }

    private static StorageDevice buildBiorepositoryDevice(int id, String name) {
        StorageDevice device = new StorageDevice();
        device.setId(id);
        device.setName(name);
        device.setType(StorageDevice.DeviceType.FREEZER.getValue());
        device.setActive(true);
        device.setBiorepositoryStorage(true);
        return device;
    }

    private static StorageShelf buildShelf(int id, String label, StorageDevice parentDevice) {
        StorageShelf shelf = new StorageShelf();
        shelf.setId(id);
        shelf.setLabel(label);
        shelf.setActive(true);
        shelf.setParentDevice(parentDevice);
        return shelf;
    }

    private static Map<String, Object> assignmentRow(String id, String location, int departmentId, String status) {
        Map<String, Object> row = new HashMap<>();
        row.put("id", id);
        row.put("location", location);
        row.put("departmentTestSectionId", departmentId);
        row.put("departmentName", "Biorepository Laboratory");
        row.put("deviceName", "Freezer-A");
        row.put("status", status);
        row.put("positionCoordinate", "A1");
        return row;
    }
}
