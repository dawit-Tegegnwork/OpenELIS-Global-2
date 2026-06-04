package org.openelisglobal.systemuser.service;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import java.util.List;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;
import org.openelisglobal.common.constants.rbac.AHRITestSectionCatalog;
import org.openelisglobal.common.util.IdValuePair;
import org.openelisglobal.test.service.TestSectionService;
import org.openelisglobal.test.valueholder.TestSection;

@RunWith(MockitoJUnitRunner.class)
public class AHRIUserManagementCatalogServiceTest {

    @InjectMocks
    private AHRIUserManagementCatalogService service;

    @Mock
    private TestSectionService testSectionService;

    @Test
    public void filterLabUnitTestSectionsIncludesOnlyAllowlistedDepartments() {
        TestSection bacteriology = section("168", "Bacteriology");
        TestSection biorepository = section("200", "Biorepository Laboratory");
        TestSection hematology = section("1", "Hematology");
        TestSection serology = section("99", "Serology");

        when(testSectionService.get("168")).thenReturn(bacteriology);
        when(testSectionService.get("200")).thenReturn(biorepository);
        when(testSectionService.get("1")).thenReturn(hematology);
        when(testSectionService.get("99")).thenReturn(serology);

        List<IdValuePair> active = List.of(pair("168", "Bacteriology"), pair("200", "Biorepository Laboratory"),
                pair("1", "Hematology"), pair("99", "Serology"));

        List<IdValuePair> filtered = service.filterLabUnitTestSections(active);

        assertEquals(2, filtered.size());
        assertTrue(filtered.stream().anyMatch(row -> "168".equals(row.getId())));
        assertTrue(filtered.stream().anyMatch(row -> "200".equals(row.getId())));
        assertFalse(filtered.stream().anyMatch(row -> "1".equals(row.getId())));
        assertFalse(filtered.stream().anyMatch(row -> "99".equals(row.getId())));
    }

    @Test
    public void filterLabUnitTestSectionsDoesNotFallbackToFullListWhenNoMatches() {
        TestSection hematology = section("1", "Hematology");
        when(testSectionService.get(anyString())).thenReturn(hematology);

        List<IdValuePair> active = List.of(pair("1", "Hematology"), pair("2", "Biochemistry"));

        List<IdValuePair> filtered = service.filterLabUnitTestSections(active);

        assertTrue(filtered.isEmpty());
    }

    @Test
    public void filterLabUnitTestSectionsIncludesCtdAndLegacyNames() {
        TestSection ctd = section("181", "CTD");
        TestSection medicalLab = section("182", "Medical Laboratory");
        TestSection ctdDeptDisplay = section("183", "CTD");
        TestSection hematology = section("1", "Hematology");

        when(testSectionService.get("181")).thenReturn(ctd);
        when(testSectionService.get("182")).thenReturn(medicalLab);
        when(testSectionService.get("183")).thenReturn(ctdDeptDisplay);
        when(testSectionService.get("1")).thenReturn(hematology);

        List<IdValuePair> active = List.of(pair("181", "CTD"), pair("182", "Medical Laboratory"),
                pair("183", "CTD Department"), pair("1", "Hematology"));

        List<IdValuePair> filtered = service.filterLabUnitTestSections(active);

        assertEquals(3, filtered.size());
        assertTrue(filtered.stream().anyMatch(row -> "181".equals(row.getId())));
        assertTrue(filtered.stream().anyMatch(row -> "182".equals(row.getId())));
        assertTrue(filtered.stream().anyMatch(row -> "183".equals(row.getId())));
        assertFalse(filtered.stream().anyMatch(row -> "1".equals(row.getId())));
    }

    @Test
    public void catalogRejectsLegacyNonAhriDepartmentNames() {
        assertTrue(AHRITestSectionCatalog.contains("Bacteriology"));
        assertTrue(AHRITestSectionCatalog.contains("Biorepository Laboratory"));
        assertTrue(AHRITestSectionCatalog.contains("CTD"));
        assertTrue(AHRITestSectionCatalog.contains("CTD Department"));
        assertTrue(AHRITestSectionCatalog.contains("Medical Laboratory"));
        assertFalse(AHRITestSectionCatalog.contains("Hematology"));
        assertFalse(AHRITestSectionCatalog.contains("Serology"));
        assertFalse(AHRITestSectionCatalog.contains("Biochemistry"));
    }

    private static IdValuePair pair(String id, String value) {
        return new IdValuePair(id, value);
    }

    private static TestSection section(String id, String name) {
        TestSection section = new TestSection();
        section.setId(id);
        section.setTestSectionName(name);
        return section;
    }
}
