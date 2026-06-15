package org.openelisglobal.biorepository.service;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class BiorepositoryQcFilterHelperTest {

    @Test
    public void matchesShelfFilter_supportsCompositeValue() {
        assertTrue(
                BiorepositoryQcFilterHelper.matchesShelfFilter("ULT Freezer A1", "Shelf A", "ULT Freezer A1|Shelf A"));
        assertFalse(
                BiorepositoryQcFilterHelper.matchesShelfFilter("ULT Freezer A2", "Shelf A", "ULT Freezer A1|Shelf A"));
    }

    @Test
    public void matchesPoolLevels_supportsCompositeFilters() {
        String[] levels = { "ULT Freezer A1", "Shelf A", "Rack 1", "Box 1-1" };
        assertTrue(BiorepositoryQcFilterHelper.matchesPoolLevels(levels, "ULT Freezer A1", "ULT Freezer A1|Shelf A",
                "ULT Freezer A1|Shelf A|Rack 1", "ULT Freezer A1|Shelf A|Rack 1|Box 1-1"));
        assertFalse(BiorepositoryQcFilterHelper.matchesPoolLevels(levels, "ULT Freezer A2", null, null, null));
    }

    @Test
    public void shelfOption_buildsCompositeValue() {
        assertEquals("ULT Freezer A1|Shelf A",
                BiorepositoryQcFilterHelper.shelfOption("ULT Freezer A1", "Shelf A").get("value"));
    }
}
