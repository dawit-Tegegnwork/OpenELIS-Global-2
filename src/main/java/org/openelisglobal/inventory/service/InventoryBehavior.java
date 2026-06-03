package org.openelisglobal.inventory.service;

import org.openelisglobal.inventory.valueholder.InventoryEnums.ItemType;
import org.openelisglobal.inventory.valueholder.InventoryItem;

public final class InventoryBehavior {

    private InventoryBehavior() {
    }

    public static boolean isPermanentEquipment(InventoryItem item) {
        return item != null && isPermanentEquipment(item.getItemType());
    }

    public static boolean isPermanentEquipment(ItemType itemType) {
        return itemType == ItemType.EQUIPMENT;
    }

    public static boolean isStockManaged(InventoryItem item) {
        return item != null && isStockManaged(item.getItemType());
    }

    public static boolean isStockManaged(ItemType itemType) {
        return itemType != null && !isPermanentEquipment(itemType);
    }

    public static boolean isLotReceivable(InventoryItem item) {
        return isStockManaged(item);
    }

    public static boolean isEquipmentAssetRegistration(InventoryItem item) {
        return isPermanentEquipment(item);
    }

    public static boolean isEquipmentAssetRegistration(ItemType itemType) {
        return isPermanentEquipment(itemType);
    }
}
