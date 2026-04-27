package org.openelisglobal.inventory.daoimpl;

import java.util.List;
import java.util.Optional;
import org.openelisglobal.common.daoimpl.BaseDAOImpl;
import org.openelisglobal.common.exception.LIMSRuntimeException;
import org.openelisglobal.inventory.dao.InventoryItemTypeDAO;
import org.openelisglobal.inventory.valueholder.InventoryItemType;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Transactional
public class InventoryItemTypeDAOImpl extends BaseDAOImpl<InventoryItemType, Long> implements InventoryItemTypeDAO {

    public InventoryItemTypeDAOImpl() {
        super(InventoryItemType.class);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryItemType> getAllActive() throws LIMSRuntimeException {
        try {
            return entityManager
                    .createQuery("FROM InventoryItemType t WHERE t.isActive = 'Y' ORDER BY t.name",
                            InventoryItemType.class)
                    .getResultList();
        } catch (Exception e) {
            throw new LIMSRuntimeException("Error getting active inventory item types", e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryItemType> getAll() throws LIMSRuntimeException {
        try {
            return entityManager
                    .createQuery("FROM InventoryItemType t ORDER BY t.name", InventoryItemType.class)
                    .getResultList();
        } catch (Exception e) {
            throw new LIMSRuntimeException("Error getting all inventory item types", e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<InventoryItemType> getByCode(String code) throws LIMSRuntimeException {
        try {
            List<InventoryItemType> results = entityManager
                    .createQuery("FROM InventoryItemType t WHERE t.code = :code", InventoryItemType.class)
                    .setParameter("code", code)
                    .getResultList();
            return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
        } catch (Exception e) {
            throw new LIMSRuntimeException("Error getting inventory item type by code", e);
        }
    }
}
