import React, { useState, useEffect, useContext, useCallback } from "react";
import {
  DataTable,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Button,
  Modal,
  TextInput,
  TextArea,
  Tag,
  OverflowMenu,
  OverflowMenuItem,
  Stack,
} from "@carbon/react";
import { Add } from "@carbon/icons-react";
import { FormattedMessage, useIntl } from "react-intl";
import { NotificationContext } from "../layout/Layout";
import { AlertDialog, NotificationKinds } from "../common/CustomNotification";
import { InventoryItemTypeAPI } from "./InventoryService";

const emptyForm = { code: "", name: "", description: "" };

const InventoryItemTypeManager = () => {
  const intl = useIntl();
  const { notificationVisible, setNotificationVisible, addNotification } =
    useContext(NotificationContext);

  const notify = useCallback(
    ({ kind, title, subtitle }) => {
      setNotificationVisible(true);
      addNotification({ kind, title, subtitle });
    },
    [addNotification, setNotificationVisible],
  );

  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = create
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState(null);

  const headers = [
    { key: "code", header: "Code" },
    { key: "name", header: "Name" },
    { key: "description", header: "Description" },
    { key: "status", header: "Status" },
    { key: "actions", header: intl.formatMessage({ id: "label.button.action" }) },
  ];

  const fetchTypes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await InventoryItemTypeAPI.getAll();
      setTypes(data || []);
    } catch {
      notify({
        kind: NotificationKinds.error,
        title: intl.formatMessage({ id: "notification.error" }),
        subtitle: "Failed to load item types",
      });
    } finally {
      setLoading(false);
    }
  }, [intl, notify]);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const openCreate = () => {
    setEditing(null);
    setFormData(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (type) => {
    setEditing(type);
    setFormData({ code: type.code, name: type.name, description: type.description || "" });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      setFormError("Code and Name are required");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await InventoryItemTypeAPI.update(editing.id, {
          ...editing,
          code: formData.code.trim(),
          name: formData.name.trim(),
          description: formData.description.trim() || null,
        });
      } else {
        await InventoryItemTypeAPI.create({
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          isActive: "Y",
        });
      }
      setModalOpen(false);
      fetchTypes();
      notify({
        kind: NotificationKinds.success,
        title: intl.formatMessage({ id: "notification.success" }),
        subtitle: editing ? "Item type updated" : "Item type created",
      });
    } catch (err) {
      setFormError(err.message || "Failed to save item type");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!typeToDelete) return;
    try {
      await InventoryItemTypeAPI.deactivate(typeToDelete.id);
      setDeleteModalOpen(false);
      setTypeToDelete(null);
      fetchTypes();
      notify({
        kind: NotificationKinds.success,
        title: intl.formatMessage({ id: "notification.success" }),
        subtitle: "Item type deactivated",
      });
    } catch {
      notify({
        kind: NotificationKinds.error,
        title: intl.formatMessage({ id: "notification.error" }),
        subtitle: "Failed to deactivate item type",
      });
    }
  };

  const rows = types.map((t) => ({
    id: String(t.id),
    code: t.code,
    name: t.name,
    description: t.description || "-",
    status: t.isActive === "Y" ? "Active" : "Inactive",
  }));

  return (
    <>
      {notificationVisible && <AlertDialog />}

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
        <Button renderIcon={Add} onClick={openCreate}>
          <FormattedMessage id="inventory.addItemType.button" defaultMessage="Add Item Type" />
        </Button>
      </div>

      <DataTable rows={rows} headers={headers} isSortable>
        {({ rows: tableRows, headers: tableHeaders, getHeaderProps, getRowProps, getTableProps, getTableContainerProps }) => (
          <TableContainer {...getTableContainerProps()}>
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  {tableHeaders.map((h) => (
                    <TableHeader key={h.key} {...getHeaderProps({ header: h })}>{h.header}</TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5}>Loading...</TableCell></TableRow>
                ) : tableRows.length === 0 ? (
                  <TableRow><TableCell colSpan={5}>No item types found</TableCell></TableRow>
                ) : (
                  tableRows.map((row, idx) => {
                    const type = types[idx];
                    return (
                      <TableRow key={row.id} {...getRowProps({ row })}>
                        {row.cells.map((cell) => {
                          if (cell.info.header === "status") {
                            return (
                              <TableCell key={cell.id}>
                                <Tag type={cell.value === "Active" ? "green" : "gray"}>{cell.value}</Tag>
                              </TableCell>
                            );
                          }
                          if (cell.info.header === "actions") {
                            return (
                              <TableCell key={cell.id}>
                                <OverflowMenu size="sm" flipped aria-label="Actions">
                                  <OverflowMenuItem
                                    itemText={intl.formatMessage({ id: "button.edit" })}
                                    onClick={() => openEdit(type)}
                                  />
                                  {type.isActive === "Y" && (
                                    <OverflowMenuItem
                                      itemText="Deactivate"
                                      isDelete
                                      onClick={() => { setTypeToDelete(type); setDeleteModalOpen(true); }}
                                    />
                                  )}
                                </OverflowMenu>
                              </TableCell>
                            );
                          }
                          return <TableCell key={cell.id}>{cell.value}</TableCell>;
                        })}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onRequestClose={() => setModalOpen(false)}
        onRequestSubmit={handleSave}
        modalHeading={editing ? "Edit Item Type" : "Add Item Type"}
        primaryButtonText={intl.formatMessage({ id: "button.save" })}
        secondaryButtonText={intl.formatMessage({ id: "button.cancel" })}
        primaryButtonDisabled={saving}
        size="sm"
      >
        <Stack gap={5}>
          {formError && <div style={{ color: "red" }}>{formError}</div>}
          <TextInput
            id="it-code"
            labelText="Code *"
            helperText="Unique identifier used internally (e.g. REAGENT, HIV_KIT)"
            value={formData.code}
            onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))}
            disabled={!!editing}
          />
          <TextInput
            id="it-name"
            labelText="Name *"
            helperText="Display name shown to users"
            value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
          />
          <TextArea
            id="it-description"
            labelText="Description"
            value={formData.description}
            onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
            rows={2}
          />
        </Stack>
      </Modal>

      {/* Deactivate Confirm Modal */}
      <Modal
        open={deleteModalOpen}
        danger
        modalHeading="Deactivate Item Type"
        primaryButtonText="Deactivate"
        secondaryButtonText={intl.formatMessage({ id: "button.cancel" })}
        onRequestSubmit={confirmDelete}
        onSecondarySubmit={() => { setDeleteModalOpen(false); setTypeToDelete(null); }}
        onRequestClose={() => { setDeleteModalOpen(false); setTypeToDelete(null); }}
      >
        <p>Deactivate <strong>{typeToDelete?.name}</strong>? It will no longer appear in the catalog form.</p>
      </Modal>
    </>
  );
};

export default InventoryItemTypeManager;
