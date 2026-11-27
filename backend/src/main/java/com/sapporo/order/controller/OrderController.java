package com.sapporo.order.controller;

import com.sapporo.order.model.OrderRequest;
import com.sapporo.order.model.TshirtItem;
import com.sapporo.order.service.SupabaseOrderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*")
public class OrderController {
    private final SupabaseOrderService service;

    public OrderController(SupabaseOrderService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody OrderRequest request) {
        try {
            List<OrderRequest> created = new ArrayList<>();
            Long parentOrderId = null;

            for (int itemIndex = 0; itemIndex < request.getItems().size(); itemIndex++) {
                TshirtItem item = request.getItems().get(itemIndex);
                OrderRequest row = new OrderRequest();
                row.setName(item.getName() == null || item.getName().trim().isEmpty()
                    ? request.getName()
                    : item.getName().trim());
                row.setParentOrderId(itemIndex == 0 ? null : parentOrderId);
                row.setRelationship(itemIndex == 0 ? "Head" : "Other");
                row.setSizeCategory(item.getSizeCategory());
                row.setSize(item.getSize());
                row.setCustomDisplayNumber(item.getShirtNumber());
                row.setCustomDisplayName(item.getCustomName());
                row.setMemo(item.getMemo() == null ? request.getMemo() : item.getMemo());

                OrderRequest saved = service.create(row);
                created.add(saved);

                if (parentOrderId == null && saved.getOrderId() != null) {
                    parentOrderId = saved.getOrderId();
                }
            }

            java.util.Map<String, String> editCodes = new java.util.LinkedHashMap<>();
            for (OrderRequest createdOrder : created) {
                if (createdOrder.getOrderId() == null) continue;
                String editToken = service.createEditAccess(
                    createdOrder.getOrderId(),
                    createdOrder.getCustomDisplayName(),
                    createdOrder.getCustomDisplayNumber()
                );
                editCodes.put(createdOrder.getOrderId().toString(), editToken);
            }

            return ResponseEntity.ok(java.util.Map.of(
                "orders", created,
                "editCodes", editCodes
            ));
        } catch (Exception exception) {
            return ResponseEntity.status(502).body(java.util.Map.of("message", exception.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> all() {
        try {
            return ResponseEntity.ok(service.findAll());
        } catch (Exception exception) {
            return ResponseEntity.status(502).body(exception.getMessage());
        }
    }

    @GetMapping("/export.csv")
    public ResponseEntity<String> exportCsv() {
        try {
            StringBuilder csv = new StringBuilder("Order ID,Name,Parent Order ID,Relationship,Size Category,Size,Custom Display Number,Custom Display Name,Memo,Created At\n");
            for (OrderRequest order : service.findAll()) {
                csv.append(order.getOrderId()).append(',')
                    .append(csvValue(order.getName())).append(',')
                    .append(order.getParentOrderId() == null ? "" : order.getParentOrderId()).append(',')
                    .append(csvValue(order.getRelationship())).append(',')
                    .append(csvValue(order.getSizeCategory())).append(',')
                    .append(csvValue(order.getSize())).append(',')
                    .append(csvValue(order.getCustomDisplayNumber())).append(',')
                    .append(csvValue(order.getCustomDisplayName())).append(',')
                    .append(csvValue(order.getMemo())).append(',')
                    .append(order.getCreatedAt()).append('\n');
            }
            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=shirt-orders.csv")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(csv.toString());
        } catch (Exception exception) {
            return ResponseEntity.status(502).body("Supabase export failed: " + exception.getMessage());
        }
    }

    @GetMapping("/public-list")
    public ResponseEntity<?> publicList() {
        try {
            return ResponseEntity.ok(service.findPublicList());
        } catch (Exception exception) {
            return ResponseEntity.status(502).body(exception.getMessage());
        }
    }

    @PatchMapping("/{orderId}")
    public ResponseEntity<?> updateOrder(@PathVariable Long orderId,
                                         @RequestHeader("X-Edit-Token") String editToken,
                                         @Valid @RequestBody OrderRequest order) {
        try {
            if (!service.verifyEditAccess(orderId, editToken)) {
                return ResponseEntity.status(403).body("Invalid or expired edit token");
            }
            service.updateOrderKeepCode(orderId, order);
            return ResponseEntity.ok(java.util.Map.of("updated", true));
        } catch (Exception exception) {
            return ResponseEntity.status(502).body(exception.getMessage());
        }
    }

    @DeleteMapping("/{orderId}")
    public ResponseEntity<?> deleteOrder(@PathVariable Long orderId,
                                         @RequestHeader("X-Edit-Token") String editToken) {
        try {
            if (!service.verifyEditAccess(orderId, editToken)) {
                return ResponseEntity.status(403).body("Invalid or expired edit token");
            }
            service.softDeleteFamily(orderId);
            return ResponseEntity.ok().build();
        } catch (Exception exception) {
            return ResponseEntity.status(502).body(exception.getMessage());
        }
    }

    @PostMapping("/{orderId}/verify-edit")
    public ResponseEntity<?> verifyEdit(@PathVariable Long orderId,
                                        @RequestHeader("X-Edit-Token") String editToken) {
        try {
            if (!service.verifyEditAccess(orderId, editToken)) {
                return ResponseEntity.status(403).body(java.util.Map.of("message", "Invalid or expired private code"));
            }
            return ResponseEntity.ok(java.util.Map.of("verified", true));
        } catch (Exception exception) {
            return ResponseEntity.status(502).body(java.util.Map.of("message", exception.getMessage()));
        }
    }

    private String csvValue(String value) {
        if (value == null) return "";
        return '"' + value.replace("\"", "\"\"") + '"';
    }
}
