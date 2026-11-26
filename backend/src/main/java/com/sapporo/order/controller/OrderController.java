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

            for (TshirtItem item : request.getItems()) {
                OrderRequest row = new OrderRequest();
                row.setName(item.getName() == null || item.getName().trim().isEmpty()
                    ? request.getName()
                    : item.getName().trim());
                row.setParentOrderId(parentOrderId);
                row.setRelationship(parentOrderId == null
                    ? (item.getRelationship() == null ? "Head" : item.getRelationship())
                    : (item.getRelationship() == null ? "Other" : item.getRelationship()));
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

            return ResponseEntity.ok(created);
        } catch (Exception exception) {
            return ResponseEntity.status(502).body(exception.getMessage());
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

    private String csvValue(String value) {
        if (value == null) return "";
        return '"' + value.replace("\"", "\"\"") + '"';
    }
}
