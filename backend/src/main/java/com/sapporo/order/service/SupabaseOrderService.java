package com.sapporo.order.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sapporo.order.model.OrderRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class SupabaseOrderService {
    private final String supabaseUrl;
    private final String secretKey;
    private final String publishableKey;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public SupabaseOrderService(@Value("${supabase.url:}") String supabaseUrl,
                                @Value("${supabase.secret-key:}") String secretKey,
                                @Value("${supabase.publishable-key:}") String publishableKey) {
        this.supabaseUrl = trimSlash(supabaseUrl);
        this.secretKey = secretKey == null ? "" : secretKey;
        this.publishableKey = publishableKey == null ? "" : publishableKey;
    }

    public OrderRequest create(OrderRequest order) throws Exception {
        ensureAdminConfigured();

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("name", order.getName());
        row.put("parent_order_id", order.getParentOrderId());
        row.put("relationship", order.getRelationship());
        row.put("size_category", order.getSizeCategory());
        row.put("size", order.getSize());
        row.put("custom_display_number", blankToNull(order.getCustomDisplayNumber()));
        row.put("custom_display_name", blankToNull(order.getCustomDisplayName()));
        row.put("memo", blankToNull(order.getMemo()));
        row.put("delete_flag", false);

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(supabaseUrl + "/rest/v1/orders"))
            .header("Content-Type", "application/json")
            .header("apikey", secretKey)
            .header("Authorization", "Bearer " + secretKey)
            .header("Prefer", "return=representation")
            .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(List.of(row))))
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        ensureSuccess(response);

        List<Map<String, Object>> inserted = objectMapper.readValue(response.body(), new TypeReference<>() {});
        if (inserted.isEmpty()) return order;
        return mapRow(inserted.get(0));
    }

    public List<OrderRequest> findAll() throws Exception {
        ensureAdminConfigured();

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(supabaseUrl + "/rest/v1/orders?delete_flag=eq.false&select=*&order=created_at.desc"))
            .header("apikey", secretKey)
            .header("Authorization", "Bearer " + secretKey)
            .GET()
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        ensureSuccess(response);

        List<Map<String, Object>> rows = objectMapper.readValue(response.body(), new TypeReference<>() {});
        List<OrderRequest> orders = new ArrayList<>();
        for (Map<String, Object> row : rows) orders.add(mapRow(row));
        return orders;
    }

    public OrderRequest linkToParent(OrderRequest order) throws Exception {
        ensureConfigured();
        String adminKey = secretKey.isBlank() ? publishableKey : secretKey;

        Map<String, Object> changes = new LinkedHashMap<>();
        changes.put("parent_order_id", order.getParentOrderId());

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(supabaseUrl + "/rest/v1/orders?order_id=eq." + order.getOrderId()))
            .header("Content-Type", "application/json")
            .header("apikey", adminKey)
            .header("Authorization", "Bearer " + adminKey)
            .header("Prefer", "return=representation")
            .method("PATCH", HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(changes)))
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        ensureSuccess(response);
        return order;
    }

    public List<Map<String, Object>> findPublicList() throws Exception {
        ensureConfigured();
        String publicKey = publishableKey.isBlank() ? secretKey : publishableKey;

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(supabaseUrl + "/rest/v1/ordered_shirt_list?select=order_id,name,parent_order_id,size_category,size,custom_display_number,custom_display_name,relationship,created_at&order=created_at.desc"))
            .header("apikey", publicKey)
            .header("Authorization", "Bearer " + publicKey)
            .GET()
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        ensureSuccess(response);
        return objectMapper.readValue(response.body(), new TypeReference<List<Map<String, Object>>>() {});
    }

    public String createEditAccess(Long orderId, String customName, String customNumber) throws Exception {
        ensureAdminConfigured();
        String token = normalizeEditCode(customName, customNumber);

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("order_id", orderId);
        row.put("token_hash", sha256(token));

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(supabaseUrl + "/rest/v1/order_edit_access"))
            .header("Content-Type", "application/json")
            .header("apikey", secretKey)
            .header("Authorization", "Bearer " + secretKey)
            .header("Prefer", "return=minimal")
            .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(List.of(row))))
            .build();
        ensureSuccess(httpClient.send(request, HttpResponse.BodyHandlers.ofString()));
        return token;
    }

    public boolean verifyEditAccess(Long orderId, String token) throws Exception {
        ensureAdminConfigured();
        String normalized = token == null ? "" : token.trim().replaceAll("\\s+", "").toUpperCase();
        if (!normalized.matches("[A-Z0-9]{1,10}_[0-9]{2}")) return false;
        String hash = sha256(normalized);
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(supabaseUrl + "/rest/v1/order_edit_access?order_id=eq." + orderId + "&token_hash=eq." + hash + "&select=access_id&revoked_at=is.null"))
            .header("apikey", secretKey)
            .header("Authorization", "Bearer " + secretKey)
            .GET()
            .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        ensureSuccess(response);
        List<Map<String, Object>> rows = objectMapper.readValue(response.body(), new TypeReference<>() {});
        return !rows.isEmpty();
    }

    public void updateOrder(Long orderId, OrderRequest order) throws Exception {
        ensureAdminConfigured();
        Map<String, Object> changes = new LinkedHashMap<>();
        changes.put("name", order.getName());
        changes.put("size_category", order.getSizeCategory());
        changes.put("size", order.getSize());
        changes.put("custom_display_number", blankToNull(order.getCustomDisplayNumber()));
        changes.put("custom_display_name", blankToNull(order.getCustomDisplayName()));
        changes.put("memo", blankToNull(order.getMemo()));

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(supabaseUrl + "/rest/v1/orders?order_id=eq." + orderId))
            .header("Content-Type", "application/json")
            .header("apikey", secretKey)
            .header("Authorization", "Bearer " + secretKey)
            .header("Prefer", "return=minimal")
            .method("PATCH", HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(changes)))
            .build();
        ensureSuccess(httpClient.send(request, HttpResponse.BodyHandlers.ofString()));
    }

    public void softDeleteFamily(Long orderId) throws Exception {
        ensureAdminConfigured();
        Map<String, Object> changes = new LinkedHashMap<>();
        changes.put("delete_flag", true);

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(supabaseUrl + "/rest/v1/orders?order_id=eq." + orderId))
            .header("Content-Type", "application/json")
            .header("apikey", secretKey)
            .header("Authorization", "Bearer " + secretKey)
            .header("Prefer", "return=minimal")
            .method("PATCH", HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(changes)))
            .build();
        ensureSuccess(httpClient.send(request, HttpResponse.BodyHandlers.ofString()));

        Map<String, Object> revoked = Map.of("revoked_at", java.time.Instant.now().toString());
        HttpRequest revokeRequest = HttpRequest.newBuilder()
            .uri(URI.create(supabaseUrl + "/rest/v1/order_edit_access?order_id=eq." + orderId))
            .header("Content-Type", "application/json")
            .header("apikey", secretKey)
            .header("Authorization", "Bearer " + secretKey)
            .method("PATCH", HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(revoked)))
            .build();
        ensureSuccess(httpClient.send(revokeRequest, HttpResponse.BodyHandlers.ofString()));
    }

    public String updateOrderAndRotateCode(Long orderId, OrderRequest order) throws Exception {
        ensureAdminConfigured();
        Map<String, Object> changes = new LinkedHashMap<>();
        changes.put("name", order.getName());
        changes.put("size_category", order.getSizeCategory());
        changes.put("size", order.getSize());
        changes.put("custom_display_number", blankToNull(order.getCustomDisplayNumber()));
        changes.put("custom_display_name", blankToNull(order.getCustomDisplayName()));
        changes.put("memo", blankToNull(order.getMemo()));

        HttpRequest updateRequest = HttpRequest.newBuilder()
            .uri(URI.create(supabaseUrl + "/rest/v1/orders?order_id=eq." + orderId + "&select=order_id,parent_order_id"))
            .header("Content-Type", "application/json")
            .header("apikey", secretKey)
            .header("Authorization", "Bearer " + secretKey)
            .header("Prefer", "return=representation")
            .method("PATCH", HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(changes)))
            .build();
        HttpResponse<String> updateResponse = httpClient.send(updateRequest, HttpResponse.BodyHandlers.ofString());
        ensureSuccess(updateResponse);

        List<Map<String, Object>> updated = objectMapper.readValue(updateResponse.body(), new TypeReference<>() {});
        if (updated.isEmpty()) throw new IllegalStateException("Order not found");

        Long parentId = longValue(updated.get(0).get("parent_order_id"));
        Long ownerId = parentId == null ? orderId : parentId;

        if (parentId == null) {
            String newToken = normalizeEditCode(order.getCustomDisplayName(), order.getCustomDisplayNumber());
            Map<String, Object> codeChange = Map.of("token_hash", sha256(newToken));
            HttpRequest codeRequest = HttpRequest.newBuilder()
                .uri(URI.create(supabaseUrl + "/rest/v1/order_edit_access?order_id=eq." + ownerId))
                .header("Content-Type", "application/json")
                .header("apikey", secretKey)
                .header("Authorization", "Bearer " + secretKey)
                .method("PATCH", HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(codeChange)))
                .build();
            ensureSuccess(httpClient.send(codeRequest, HttpResponse.BodyHandlers.ofString()));
            return newToken;
        }

        return null;
    }

    private OrderRequest mapRow(Map<String, Object> row) {
        OrderRequest order = new OrderRequest();
        order.setOrderId(longValue(row.get("order_id")));
        order.setName(stringValue(row.get("name")));
        order.setParentOrderId(longValue(row.get("parent_order_id")));
        order.setRelationship(stringValue(row.get("relationship")));
        order.setSizeCategory(stringValue(row.get("size_category")));
        order.setSize(stringValue(row.get("size")));
        order.setCustomDisplayNumber(stringValue(row.get("custom_display_number")));
        order.setCustomDisplayName(stringValue(row.get("custom_display_name")));
        order.setMemo(stringValue(row.get("memo")));
        Object deleteFlag = row.get("delete_flag");
        order.setDeleteFlag(deleteFlag instanceof Boolean ? (Boolean) deleteFlag : false);
        Object createdAt = row.get("created_at");
        if (createdAt != null) order.setCreatedAt(Instant.parse(createdAt.toString()));
        return order;
    }

    private void ensureConfigured() {
        if (supabaseUrl.isBlank()) {
            throw new IllegalStateException("SUPABASE_URL must be configured on the server");
        }
        if (publishableKey.isBlank() && secretKey.isBlank()) {
            throw new IllegalStateException("SUPABASE_PUBLISHABLE_KEY or SUPABASE_SECRET_KEY must be configured on the server");
        }
    }

    private void ensureAdminConfigured() {
        if (supabaseUrl.isBlank()) {
            throw new IllegalStateException("SUPABASE_URL must be configured on the server");
        }
        if (secretKey.isBlank()) {
            throw new IllegalStateException("SUPABASE_SECRET_KEY must be configured on the server for admin operations");
        }
        if (secretKey.startsWith("sb_publishable_")) {
            throw new IllegalStateException("SUPABASE_SECRET_KEY contains a publishable key. Set the sb_secret_... key instead");
        }
    }

    private void ensureSuccess(HttpResponse<String> response) {
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException("Supabase request failed (" + response.statusCode() + "): " + response.body());
        }
    }

    private static String trimSlash(String value) {
        if (value == null) return "";
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private static String blankToNull(String value) {
        return value == null || value.trim().isEmpty() ? null : value.trim();
    }

    private static String stringValue(Object value) {
        return value == null ? null : value.toString();
    }

    private static Long longValue(Object value) {
        if (value == null) return null;
        if (value instanceof Number number) return number.longValue();
        return Long.parseLong(value.toString());
    }

    private static String sha256(String value) throws Exception {
        java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        return java.util.HexFormat.of().formatHex(hash);
    }

    private String normalizeEditCode(String customName, String customNumber) {
        String name = customName == null ? "" : customName.trim().replaceAll("\\s+", "").toUpperCase();
        String number = customNumber == null ? "" : customNumber.trim().replaceAll("[^0-9]", "");
        if (name.isBlank() || number.isBlank()) {
            throw new IllegalArgumentException("Custom display name and number are required to create the edit code");
        }
        return name + "_" + number;
    }

    public void updateOrderKeepCode(Long orderId, OrderRequest order) throws Exception {
        ensureAdminConfigured();
        Map<String, Object> changes = new LinkedHashMap<>();
        changes.put("name", order.getName());
        changes.put("size_category", order.getSizeCategory());
        changes.put("size", order.getSize());
        changes.put("custom_display_number", blankToNull(order.getCustomDisplayNumber()));
        changes.put("custom_display_name", blankToNull(order.getCustomDisplayName()));
        changes.put("memo", blankToNull(order.getMemo()));

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(supabaseUrl + "/rest/v1/orders?order_id=eq." + orderId))
            .header("Content-Type", "application/json")
            .header("apikey", secretKey)
            .header("Authorization", "Bearer " + secretKey)
            .header("Prefer", "return=minimal")
            .method("PATCH", HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(changes)))
            .build();
        ensureSuccess(httpClient.send(request, HttpResponse.BodyHandlers.ofString()));
    }
}
