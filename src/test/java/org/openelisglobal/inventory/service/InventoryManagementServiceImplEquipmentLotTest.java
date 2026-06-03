package org.openelisglobal.inventory.service;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.fail;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;
import org.openelisglobal.inventory.dao.InventoryLotDAO;
import org.openelisglobal.inventory.valueholder.InventoryEnums.ItemType;
import org.openelisglobal.inventory.valueholder.InventoryItem;
import org.openelisglobal.inventory.valueholder.InventoryLot;
import org.springframework.test.util.ReflectionTestUtils;

@RunWith(MockitoJUnitRunner.class)
public class InventoryManagementServiceImplEquipmentLotTest {

    @InjectMocks
    private InventoryLotServiceImpl inventoryLotService;

    @Mock
    private InventoryItemService inventoryItemService;

    @Mock
    private InventoryLotDAO inventoryLotDAO;

    @Mock
    private InventoryTransactionService transactionService;

    private InventoryItem equipmentItem;
    private InventoryLot lot;

    @Before
    public void setUp() {
        ReflectionTestUtils.setField(inventoryLotService, "auditTrailLog", false);
        ReflectionTestUtils.setField(inventoryLotService, "inventoryLotDAO", inventoryLotDAO);
        ReflectionTestUtils.setField(inventoryLotService, "inventoryItemService", inventoryItemService);
        ReflectionTestUtils.setField(inventoryLotService, "transactionService", transactionService);

        equipmentItem = new InventoryItem();
        equipmentItem.setId(99L);
        equipmentItem.setItemType(ItemType.EQUIPMENT);
        equipmentItem.setName("Freezer");

        lot = new InventoryLot();
        lot.setInventoryItem(equipmentItem);
        lot.setLotNumber("SN-001");
        lot.setCurrentQuantity(1.0);
        lot.setSysUserId("1");
    }

    @Test
    public void insertAcceptsValidEquipmentAssetRegistration() {
        when(inventoryLotDAO.insert(any(InventoryLot.class))).thenReturn(100L);

        Long lotId = inventoryLotService.insert(lot);

        assertEquals(Long.valueOf(100L), lotId);
        verify(inventoryLotDAO).insert(any(InventoryLot.class));
        verify(inventoryItemService).update(equipmentItem);
        assertEquals("SN-001", equipmentItem.getSerialNumber());
    }

    @Test
    public void insertRejectsEquipmentWithoutSerial() {
        lot.setLotNumber("  ");

        try {
            inventoryLotService.insert(lot);
            fail("Expected equipment registration without serial to be rejected");
        } catch (IllegalArgumentException e) {
            assertEquals(InventoryLotServiceImpl.EQUIPMENT_SERIAL_REQUIRED_MESSAGE, e.getMessage());
        }

        verify(inventoryLotDAO, never()).insert(any(InventoryLot.class));
    }

    @Test
    public void insertRejectsEquipmentWithInvalidQuantity() {
        lot.setCurrentQuantity(2.0);

        try {
            inventoryLotService.insert(lot);
            fail("Expected equipment registration with quantity != 1 to be rejected");
        } catch (IllegalArgumentException e) {
            assertEquals(InventoryLotServiceImpl.EQUIPMENT_QUANTITY_MESSAGE, e.getMessage());
        }

        verify(inventoryLotDAO, never()).insert(any(InventoryLot.class));
    }
}
