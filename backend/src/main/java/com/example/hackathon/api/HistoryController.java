package com.example.hackathon.api;

import com.example.hackathon.model.HistoryEntry;
import com.example.hackathon.repo.HistoryRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/history")
public class HistoryController {

    private final HistoryRepository historyRepository;

    public HistoryController(HistoryRepository historyRepository) {
        this.historyRepository = historyRepository;
    }

    @GetMapping
    public List<HistoryEntry> findAll() {
        return historyRepository.findAll()
                .stream()
                .sorted((a,b) -> b.getTs().compareTo(a.getTs()))
                .toList();
    }

    @PostMapping
    public ResponseEntity<HistoryEntry> create(@Valid @RequestBody HistoryEntry body) {
        if (body.getTs() == null) {
            body.setTs(Instant.now());
        }
        HistoryEntry saved = historyRepository.save(body);
        return ResponseEntity.ok(saved);
    }
}
