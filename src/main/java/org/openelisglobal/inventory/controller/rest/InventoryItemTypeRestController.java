package org.openelisglobal.inventory.controller.rest;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import lombok.Getter;
import lombok.Setter;
import org.openelisglobal.common.log.LogEvent;
import org.openelisglobal.common.rest.BaseRestController;
import org.openelisglobal.inventory.service.InventoryItemTypeService;
import org.openelisglobal.inventory.valueholder.InventoryItemType;
import org.openelisglobal.login.valueholder.UserSessionData;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/rest/inventory/item-types")
public class InventoryItemTypeRestController extends BaseRestController {

    @Autowired
    private InventoryItemTypeService inventoryItemTypeService;

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<InventoryItemType>> getAllActive() {
        try {
            return ResponseEntity.ok(inventoryItemTypeService.getAllActive());
        } catch (Exception e) {
            LogEvent.logError(e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping(value = "/all", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<InventoryItemType>> getAll() {
        try {
            return ResponseEntity.ok(inventoryItemTypeService.getAll());
        } catch (Exception e) {
            LogEvent.logError(e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<InventoryItemType> getById(@PathVariable Long id) {
        try {
            InventoryItemType type = inventoryItemTypeService.get(id);
            return type != null ? ResponseEntity.ok(type) : ResponseEntity.notFound().build();
        } catch (Exception e) {
            LogEvent.logError(e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> create(@RequestBody InventoryItemType itemType, HttpServletRequest request) {
        try {
            // Validate code uniqueness
            if (inventoryItemTypeService.getByCode(itemType.getCode()).isPresent()) {
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse("Item type with code '" + itemType.getCode() + "' already exists"));
            }
            UserSessionData usd = (UserSessionData) request.getSession().getAttribute(USER_SESSION_DATA);
            itemType.setSysUserId(String.valueOf(usd.getSystemUserId()));
            Long id = inventoryItemTypeService.insert(itemType);
            return ResponseEntity.status(HttpStatus.CREATED).body(inventoryItemTypeService.get(id));
        } catch (Exception e) {
            LogEvent.logError(e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody InventoryItemType itemType,
            HttpServletRequest request) {
        try {
            if (inventoryItemTypeService.get(id) == null) {
                return ResponseEntity.notFound().build();
            }
            // Check code uniqueness (excluding self)
            inventoryItemTypeService.getByCode(itemType.getCode()).ifPresent(existing -> {
                if (!existing.getId().equals(id)) {
                    throw new IllegalArgumentException(
                            "Item type with code '" + itemType.getCode() + "' already exists");
                }
            });
            itemType.setId(id);
            UserSessionData usd = (UserSessionData) request.getSession().getAttribute(USER_SESSION_DATA);
            itemType.setSysUserId(String.valueOf(usd.getSystemUserId()));
            return ResponseEntity.ok(inventoryItemTypeService.update(itemType));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        } catch (Exception e) {
            LogEvent.logError(e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping(value = "/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, HttpServletRequest request) {
        try {
            InventoryItemType type = inventoryItemTypeService.get(id);
            if (type == null) {
                return ResponseEntity.notFound().build();
            }
            // Soft-delete: mark inactive
            UserSessionData usd = (UserSessionData) request.getSession().getAttribute(USER_SESSION_DATA);
            type.setIsActive("N");
            type.setSysUserId(String.valueOf(usd.getSystemUserId()));
            inventoryItemTypeService.update(type);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            LogEvent.logError(e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Getter
    @Setter
    public static class ErrorResponse {
        private String error;

        public ErrorResponse(String error) {
            this.error = error;
        }
    }
}
