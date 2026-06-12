package org.openelisglobal.inventory.service;

import jakarta.servlet.http.HttpServletRequest;
import java.io.InputStream;
import java.util.Map;
import org.openelisglobal.inventory.form.InventoryImportResult;

public interface InventoryImportService {

    InventoryImportResult validateCatalogImport(InputStream inputStream, String fileName, String contentType,
            HttpServletRequest request, Integer defaultDepartmentId);

    Map<String, Object> importCatalog(InputStream inputStream, String fileName, String contentType, String sysUserId,
            HttpServletRequest request, Integer defaultDepartmentId);

    InventoryImportResult validateLotImport(InputStream inputStream, String fileName, String contentType,
            HttpServletRequest request);

    Map<String, Object> importLots(InputStream inputStream, String fileName, String contentType, String sysUserId,
            HttpServletRequest request);
}
