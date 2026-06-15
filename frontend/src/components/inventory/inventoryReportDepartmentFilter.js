import { useCallback, useEffect, useMemo, useState } from "react";
import { hasUnrestrictedDepartmentAccess } from "../../security/departmentAccess";
import { InventoryItemAPI } from "./InventoryService";

/**
 * Department scope for inventory reports — matches Dashboard/Catalog filters.
 * Restricted users rely on backend session scope; admins may pick a department.
 */
export function useInventoryReportDepartmentFilter(userSessionDetails) {
  const [assignableDepartments, setAssignableDepartments] = useState([]);
  const [departmentFilter, setDepartmentFilter] = useState("ALL");

  const unrestricted = useCallback(
    () => hasUnrestrictedDepartmentAccess(userSessionDetails),
    [userSessionDetails],
  );

  useEffect(() => {
    if (!unrestricted()) {
      setAssignableDepartments([]);
      setDepartmentFilter("ALL");
      return;
    }

    InventoryItemAPI.getAssignableDepartments()
      .then((rows) => {
        const options = Array.isArray(rows)
          ? rows.map((row) => ({
              id: String(row.id),
              text: row.value,
            }))
          : [];
        setAssignableDepartments(options);
      })
      .catch(() => setAssignableDepartments([]));
  }, [unrestricted]);

  const departmentIdForApi = useMemo(() => {
    if (!unrestricted() || departmentFilter === "ALL") {
      return undefined;
    }
    return departmentFilter;
  }, [unrestricted, departmentFilter]);

  const departmentDropdownItems = useMemo(
    () => [{ id: "ALL", text: "All departments" }, ...assignableDepartments],
    [assignableDepartments],
  );

  const selectedDepartmentItem = useMemo(
    () =>
      departmentDropdownItems.find((item) => item.id === departmentFilter) ||
      departmentDropdownItems[0],
    [departmentDropdownItems, departmentFilter],
  );

  const scopedDepartmentLabel =
    userSessionDetails?.loginLabUnit ||
    userSessionDetails?.loginLabUnitName ||
    null;

  return {
    showDepartmentDropdown: unrestricted() && assignableDepartments.length > 0,
    assignableDepartments,
    departmentFilter,
    setDepartmentFilter,
    departmentDropdownItems,
    selectedDepartmentItem,
    departmentIdForApi,
    scopedDepartmentLabel,
  };
}
