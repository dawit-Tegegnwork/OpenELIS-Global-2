package org.openelisglobal.inventory.valueholder;

import jakarta.persistence.Access;
import jakarta.persistence.AccessType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.openelisglobal.common.valueholder.BaseObject;

@Getter
@Setter
@Entity
@Table(name = "inventory_item_type")
@Access(AccessType.FIELD)
public class InventoryItemType extends BaseObject<Long> {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "inventory_item_type_generator")
    @SequenceGenerator(name = "inventory_item_type_generator", sequenceName = "inventory_item_type_seq", allocationSize = 1)
    @Column(name = "id")
    private Long id;

    /** Unique code used as the stored value in inventory_item.item_type */
    @Column(name = "code", nullable = false, unique = true, length = 50)
    @NotNull
    @Size(min = 1, max = 50)
    private String code;

    /** Human-readable display name */
    @Column(name = "name", nullable = false, length = 100)
    @NotNull
    @Size(min = 1, max = 100)
    private String name;

    @Column(name = "description", length = 255)
    private String description;

    @Column(name = "is_active", length = 1, nullable = false)
    private String isActive = "Y";

    @Version
    @Column(name = "version", nullable = false)
    private Integer version = 0;
}
