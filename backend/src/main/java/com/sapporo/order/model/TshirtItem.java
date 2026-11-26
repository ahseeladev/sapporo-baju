package com.sapporo.order.model;

import jakarta.validation.constraints.NotBlank;

public class TshirtItem {
    @NotBlank
    private String sizeCategory;

    @NotBlank
    private String size;

    private String shirtNumber;
    private String name;
    private String customName;
    private String relationship;
    private String memo;

    public TshirtItem() {}

    public String getSizeCategory() { return sizeCategory; }
    public void setSizeCategory(String sizeCategory) { this.sizeCategory = sizeCategory; }
    public String getSize() { return size; }
    public void setSize(String size) { this.size = size; }
    public String getShirtNumber() { return shirtNumber; }
    public void setShirtNumber(String shirtNumber) { this.shirtNumber = shirtNumber; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCustomName() { return customName; }
    public void setCustomName(String customName) { this.customName = customName; }
    public String getRelationship() { return relationship; }
    public void setRelationship(String relationship) { this.relationship = relationship; }
    public String getMemo() { return memo; }
    public void setMemo(String memo) { this.memo = memo; }
}
