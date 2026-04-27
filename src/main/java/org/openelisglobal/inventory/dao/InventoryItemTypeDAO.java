package org.openelisglobal.inventory.dao;

import java.util.List;
import java.util.Optional;
import org.openelisglobal.common.dao.BaseDAO;
import org.openelisglobal.common.exception.LIMSRuntimeException;
import org.openelisglobal.inventory.valueholder.InventoryItemType;

public interface InventoryItemTypeDAO extends BaseDAO<InventoryItemType, Long> {

    List<InventoryItemType> getAllActive() throws LIMSRuntimeException;

    List<InventoryItemType> getAll() throws LIMSRuntimeException;

    Optional<InventoryItemType> getByCode(String code) throws LIMSRuntimeException;
}
