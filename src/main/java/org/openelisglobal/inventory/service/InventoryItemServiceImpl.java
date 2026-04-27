package org.openelisglobal.inventory.service;

import java.sql.Timestamp;
import java.util.List;
import java.util.UUID;
import org.openelisglobal.common.service.AuditableBaseObjectServiceImpl;
import org.openelisglobal.inventory.dao.InventoryItemDAO;
import org.openelisglobal.inventory.dao.InventoryLotDAO;
import org.openelisglobal.inventory.valueholder.InventoryItem;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InventoryItemServiceImpl extends AuditableBaseObjectServiceImpl<InventoryItem, Long>
        implements InventoryItemService {

    @Autowired
    private InventoryItemDAO inventoryItemDAO;

    @Autowired
    private InventoryLotDAO inventoryLotDAO;

    public InventoryItemServiceImpl() {
        super(InventoryItem.class);
        this.auditTrailLog = true;
    }

    @Override
    protected InventoryItemDAO getBaseObjectDAO() {
        return inventoryItemDAO;
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> getAllItemTypes() {
        return inventoryItemDAO.getAllItemTypes();
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryItem> getAllActive() {
        return inventoryItemDAO.getAllActive();
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryItem> getByItemType(String itemType) {
        return inventoryItemDAO.getByItemType(itemType);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryItem> getByCategory(String category) {
        return inventoryItemDAO.getByCategory(category);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryItem> searchByName(String searchTerm) {
        return inventoryItemDAO.searchByName(searchTerm);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryItem> getLowStockItems() {
        return inventoryItemDAO.getLowStockItems();
    }

    @Override
    @Transactional(readOnly = true)
    public InventoryItem getByFhirUuid(String fhirUuid) {
        return inventoryItemDAO.getByFhirUuid(fhirUuid);
    }

    @Override
    @Transactional(readOnly = true)
    public Double getTotalCurrentStock(Long itemId) {
        Integer total = inventoryLotDAO.getTotalCurrentQuantity(itemId);
        return total != null ? total.doubleValue() : 0.0;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isInStock(Long itemId) {
        List<org.openelisglobal.inventory.valueholder.InventoryLot> availableLots = inventoryLotDAO
                .getAvailableLotsByItemFEFO(itemId);
        return availableLots != null && !availableLots.isEmpty();
    }

    @Override
    @Transactional
    public Long insert(InventoryItem item) {
        validateItemTypeSpecificFields(item);
        if (item.getFhirUuid() == null) {
            item.setFhirUuid(UUID.randomUUID());
        }
        return super.insert(item);
    }

    @Override
    @Transactional
    public InventoryItem update(InventoryItem item) {
        validateItemTypeSpecificFields(item);
        if (item.getId() != null && item.getFhirUuid() == null) {
            InventoryItem existing = get(item.getId());
            if (existing != null && existing.getFhirUuid() != null) {
                item.setFhirUuid(existing.getFhirUuid());
            }
        }
        return super.update(item);
    }

    @Override
    @Transactional
    public void deactivateItem(Long itemId, String sysUserId) {
        InventoryItem item = get(itemId);
        if (item != null) {
            inventoryItemDAO.evict(item);
            item.setIsActive("N");
            item.setSysUserId(sysUserId);
            item.setLastupdated(new Timestamp(System.currentTimeMillis()));
            update(item);
        }
    }

    @Override
    @Transactional
    public void activateItem(Long itemId, String sysUserId) {
        InventoryItem item = get(itemId);
        if (item != null) {
            inventoryItemDAO.evict(item);
            item.setIsActive("Y");
            item.setSysUserId(sysUserId);
            item.setLastupdated(new Timestamp(System.currentTimeMillis()));
            update(item);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryItem> getPagedItems(int limit, int offset, String sortBy, String sortOrder, String itemType,
            Boolean isActive, String searchTerm) {
        limit = Math.max(1, Math.min(limit, 1000));
        offset = Math.max(0, offset);
        return inventoryItemDAO.getPagedItems(limit, offset, sortBy, sortOrder, itemType, isActive, searchTerm);
    }

    @Override
    @Transactional(readOnly = true)
    public Long getPagedItemsCount(String itemType, Boolean isActive, String searchTerm) {
        return inventoryItemDAO.getPagedItemsCount(itemType, isActive, searchTerm);
    }

    private void validateItemTypeSpecificFields(InventoryItem item) {
        if (item.getItemType() == null || item.getItemType().trim().isEmpty()) {
            throw new IllegalArgumentException("Item type is required");
        }
        switch (item.getItemType()) {
        case "REAGENT":
            if (item.getStabilityAfterOpening() == null || item.getStabilityAfterOpening() <= 0) {
                throw new IllegalArgumentException("Stability after opening is required for reagents");
            }
            break;
        case "CARTRIDGE":
            if (item.getCompatibleAnalyzers() == null || item.getCompatibleAnalyzers().trim().isEmpty()) {
                throw new IllegalArgumentException("Compatible analyzers are required for cartridges");
            }
            break;
        case "RDT":
        case "HIV_KIT":
        case "SYPHILIS_KIT":
            if (item.getTestsPerKit() == null || item.getTestsPerKit() <= 0) {
                throw new IllegalArgumentException("Tests per kit is required and must be greater than 0");
            }
            break;
        default:
            break;
        }
    }
}
