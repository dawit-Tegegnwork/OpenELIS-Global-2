package org.openelisglobal.inventory.dao;

import java.util.List;
import org.openelisglobal.common.dao.BaseDAO;
import org.openelisglobal.common.exception.LIMSRuntimeException;
import org.openelisglobal.inventory.valueholder.InventoryItem;

public interface InventoryItemDAO extends BaseDAO<InventoryItem, Long> {

    List<InventoryItem> getAllActive() throws LIMSRuntimeException;

    List<InventoryItem> getByItemType(String itemType) throws LIMSRuntimeException;

    List<InventoryItem> getByCategory(String category) throws LIMSRuntimeException;

    List<InventoryItem> searchByName(String name) throws LIMSRuntimeException;

    InventoryItem getByFhirUuid(String fhirUuid) throws LIMSRuntimeException;

    List<InventoryItem> getLowStockItems() throws LIMSRuntimeException;

    List<String> getAllItemTypes();

    List<InventoryItem> getPagedItems(int limit, int offset, String sortBy, String sortOrder, String itemType,
            Boolean isActive, String searchTerm) throws LIMSRuntimeException;

    Long getPagedItemsCount(String itemType, Boolean isActive, String searchTerm) throws LIMSRuntimeException;
}
