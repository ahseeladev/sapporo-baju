package com.sapporo.order.model;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class OrderRequest {
    private Long orderId;

    @NotBlank
    @Size(max = 100)
    private String name;

    private Long parentOrderId;

    @Pattern(regexp = "Head|Spouse|Child|Other|Standalone")
    private String relationship = "Standalone";

    private String customDisplayNumber;
    private String customDisplayName;
    private String memo;
    private Boolean deleteFlag = false;
    private Instant createdAt;

    @NotEmpty
    @Valid
    private List<TshirtItem> items = new ArrayList<>();

    private String sizeCategory;

    @Size(max = 20)
    private String size;

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Long getParentOrderId() { return parentOrderId; }
    public void setParentOrderId(Long parentOrderId) { this.parentOrderId = parentOrderId; }
    public String getRelationship() { return relationship; }
    public void setRelationship(String relationship) { this.relationship = relationship; }
    public String getCustomDisplayNumber() { return customDisplayNumber; }
    public void setCustomDisplayNumber(String customDisplayNumber) { this.customDisplayNumber = customDisplayNumber; }
    public String getCustomDisplayName() { return customDisplayName; }
    public void setCustomDisplayName(String customDisplayName) { this.customDisplayName = customDisplayName; }
    public String getMemo() { return memo; }
    public void setMemo(String memo) { this.memo = memo; }
    public Boolean getDeleteFlag() { return deleteFlag; }
    public void setDeleteFlag(Boolean deleteFlag) { this.deleteFlag = deleteFlag; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public List<TshirtItem> getItems() { return items; }
    public void setItems(List<TshirtItem> items) { this.items = items; }
    public String getSizeCategory() { return sizeCategory; }
    public void setSizeCategory(String sizeCategory) { this.sizeCategory = sizeCategory; }
    public String getSize() { return size; }
    public void setSize(String size) { this.size = size; }
}
