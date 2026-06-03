import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  TextInput,
  ComboBox,
  DatePicker,
  DatePickerInput,
  FormLabel,
  Stack,
  InlineNotification,
} from "@carbon/react";
import { FormattedMessage, useIntl } from "react-intl";
import { InventoryItemAPI, InventoryManagementAPI } from "./InventoryService";
import StorageHierarchySelector from "../notebook/workflow/StorageHierarchySelector";
import { buildEquipmentCatalogOptions } from "./catalog/lotCatalogPicker";

const EquipmentRegistrationModal = ({
  open,
  onClose,
  onSave,
  preselectedItem = null,
}) => {
  const intl = useIntl();

  const [formData, setFormData] = useState({
    inventoryItem: null,
    serialNumber: "",
    receiptDate: new Date(),
  });

  const [storageSelection, setStorageSelection] = useState({
    room: null,
    device: null,
    shelf: null,
    rack: null,
    box: null,
  });

  const [items, setItems] = useState([]);
  const [itemsLoaded, setItemsLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchItems = useCallback(async () => {
    setItemsLoaded(false);
    try {
      const response = await InventoryItemAPI.getAll({
        isActive: true,
        itemType: "EQUIPMENT",
      });
      const validItems = Array.isArray(response) ? response : [];
      setItems(buildEquipmentCatalogOptions(validItems));
    } catch (err) {
      console.error("Error fetching equipment catalog items:", err);
      setItems([]);
    } finally {
      setItemsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchItems();
      setError(null);
      setFormData({
        inventoryItem: preselectedItem || null,
        serialNumber: preselectedItem?.serialNumber || "",
        receiptDate: new Date(),
      });
      setStorageSelection({
        room: null,
        device: null,
        shelf: null,
        rack: null,
        box: null,
      });
    }
  }, [open, preselectedItem, fetchItems]);

  const buildStoragePathFromSelection = (selection) => {
    const parts = [];
    if (selection.room) parts.push(selection.room.label);
    if (selection.device) parts.push(selection.device.label);
    if (selection.shelf) parts.push(selection.shelf.label);
    if (selection.rack) parts.push(selection.rack.label);
    if (selection.box) parts.push(selection.box.label);
    return parts.join(" > ");
  };

  const getLocationInfo = () => {
    if (storageSelection.box && storageSelection.box.id) {
      return { locationId: storageSelection.box.id, locationType: "box" };
    }
    if (storageSelection.rack && storageSelection.rack.id) {
      return { locationId: storageSelection.rack.id, locationType: "rack" };
    }
    if (storageSelection.shelf && storageSelection.shelf.id) {
      return { locationId: storageSelection.shelf.id, locationType: "shelf" };
    }
    if (storageSelection.device && storageSelection.device.id) {
      return {
        locationId: storageSelection.device.id,
        locationType: "device",
      };
    }
    if (storageSelection.room && storageSelection.room.id) {
      return { locationId: storageSelection.room.id, locationType: "room" };
    }
    return { locationId: null, locationType: null };
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validate = () => {
    if (!formData.inventoryItem) {
      setError("Please select an equipment catalog item");
      return false;
    }
    if (!formData.serialNumber?.trim()) {
      setError("Serial / asset ID is required");
      return false;
    }
    if (!storageSelection.room) {
      setError("Please select a storage location (at least a room)");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    setError(null);

    try {
      const locationInfo = getLocationInfo();
      const storagePath = buildStoragePathFromSelection(storageSelection);

      await InventoryManagementAPI.receive({
        inventoryItem: { id: formData.inventoryItem.id },
        lotNumber: formData.serialNumber.trim(),
        currentQuantity: 1,
        initialQuantity: 1,
        unitSize: "1 each",
        expirationDate: null,
        receiptDate: formData.receiptDate.toISOString(),
        qcStatus: "PASSED",
        status: "ACTIVE",
        locationId: locationInfo.locationId,
        locationType: locationInfo.locationType,
        storagePath: storagePath,
      });
      onSave();
    } catch (err) {
      console.error("Error registering equipment:", err);
      setError(err.message || "Error registering equipment");
    } finally {
      setSaving(false);
    }
  };

  const selectedComboItem = formData.inventoryItem
    ? items.find((i) => i.id === formData.inventoryItem.id) || null
    : null;

  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      onRequestSubmit={handleSave}
      modalHeading={intl.formatMessage({
        id: "equipment.register.title",
        defaultMessage: "Register Equipment",
      })}
      primaryButtonText={intl.formatMessage({
        id: "button.save",
        defaultMessage: "Save",
      })}
      secondaryButtonText={intl.formatMessage({
        id: "button.cancel",
        defaultMessage: "Cancel",
      })}
      primaryButtonDisabled={saving}
      size="lg"
    >
      <Stack gap={5}>
        {error && (
          <div style={{ color: "red", marginBottom: "1rem" }}>{error}</div>
        )}

        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="Equipment asset registration"
          subtitle="Search catalog equipment, enter the serial/asset ID, and assign a storage location. Each registered unit is tracked as a single asset (quantity 1)."
        />

        {itemsLoaded && items.length === 0 && (
          <InlineNotification
            kind="warning"
            lowContrast
            hideCloseButton
            title="No equipment catalog items"
            subtitle="Add equipment in Catalog first, then return here to register the physical asset."
          />
        )}

        <ComboBox
          id="equipmentCatalogItem"
          title={
            <FormattedMessage
              id="equipment.register.selectItem"
              defaultMessage="Equipment Catalog Item"
            />
          }
          placeholder={
            items.length === 0 && itemsLoaded
              ? "No equipment catalog items"
              : "Search by name, model, or manufacturer…"
          }
          items={items}
          itemToString={(item) => (item ? item.text : "")}
          shouldFilterItem={({ item, inputValue }) => {
            if (!inputValue) {
              return true;
            }
            const needle = inputValue.trim().toLowerCase();
            return item?.searchText?.includes(needle) ?? false;
          }}
          selectedItem={selectedComboItem}
          onChange={({ selectedItem }) => {
            const catalogItem = selectedItem?.item || null;
            handleChange("inventoryItem", catalogItem);
            if (catalogItem?.serialNumber && !formData.serialNumber) {
              handleChange("serialNumber", catalogItem.serialNumber);
            }
          }}
          disabled={itemsLoaded && items.length === 0}
        />

        <TextInput
          id="equipmentSerialNumber"
          labelText={
            <FormattedMessage
              id="equipment.register.serial"
              defaultMessage="Serial / Asset ID *"
            />
          }
          value={formData.serialNumber}
          onChange={(e) => handleChange("serialNumber", e.target.value)}
          placeholder="e.g., QS3-2024-001"
          required
        />

        <DatePicker datePickerType="single">
          <DatePickerInput
            id="equipmentReceiptDate"
            placeholder="mm/dd/yyyy"
            labelText={
              <FormattedMessage
                id="lot.receiptDate"
                defaultMessage="Receipt Date"
              />
            }
            value={formData.receiptDate}
            onChange={(e) =>
              handleChange("receiptDate", new Date(e.target.value))
            }
          />
        </DatePicker>

        <div>
          <FormLabel>
            <FormattedMessage
              id="lot.storageLocation"
              defaultMessage="Storage Location *"
            />
          </FormLabel>
          <StorageHierarchySelector
            value={storageSelection}
            onChange={setStorageSelection}
          />
        </div>
      </Stack>
    </Modal>
  );
};

export default EquipmentRegistrationModal;
