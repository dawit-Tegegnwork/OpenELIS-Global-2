package org.openelisglobal.inventory.service;

import java.util.List;
import java.util.Optional;
import org.openelisglobal.common.service.BaseObjectService;
import org.openelisglobal.inventory.valueholder.InventoryItemType;

public interface InventoryItemTypeService extends BaseObjectService<InventoryItemType, Long> {

    List<InventoryItemType> getAllActive();

    List<InventoryItemType> getAll();

    Optional<InventoryItemType> getByCode(String code);
}
