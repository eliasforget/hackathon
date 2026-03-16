package com.example.hackathon.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
public class RootController {

    @GetMapping("/")
    public ResponseEntity<Map<String, Object>> root() {
        return ResponseEntity.ok(Map.of(
                "message", "API en ligne",
                "ts", Instant.now().toString(),
                "health", "/api/health",
                "auth", "/api/auth/token"
        ));
    }
}
