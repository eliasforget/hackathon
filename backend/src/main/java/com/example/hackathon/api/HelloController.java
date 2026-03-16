package com.example.hackathon.api;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class HelloController {

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "ok",
                "timestamp", Instant.now().toString()
        ));
    }

    @GetMapping("/hello")
    public ResponseEntity<Map<String, Object>> hello(@AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(Map.of(
                "message", "Bienvenue sur l'API",
                "user", user != null ? user.getUsername() : "anonymous",
                "ts", Instant.now().toString()
        ));
    }
}
