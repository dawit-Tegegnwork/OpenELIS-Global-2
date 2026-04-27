package org.openelisglobal.inventory.service;

import java.util.List;
import java.util.Optional;
import org.openelisglobal.common.service.AuditableBaseObjectServiceImpl;
import org.openelisglobal.inventory.dao.InventoryItemTypeDAO;
import org.openelisglobal.inventory.valueholder.InventoryItemType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class InventoryItemTypeServiceImpl extends AuditableBaseObjectServiceImpl<InventoryItemType, Long>
        implements InventoryItemTypeService {

    @Autowired
    private InventoryItemTypeDAO inventoryItemTypeDAO;

    public InventoryItemTypeServiceImpl() {
        super(InventoryItemType.class);
    }

    @Override
    protected InventoryItemTypeDAO getBaseObjectDAO() {
        return inventoryItemTypeDAO;
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryItemType> getAllActive() {
        return inventoryItemTypeDAO.getAllActive();
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryItemType> getAll() {
        return inventoryItemTypeDAO.getAll();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<InventoryItemType> getByCode(String code) {
        return inventoryItemTypeDAO.getByCode(code);
    }
}
