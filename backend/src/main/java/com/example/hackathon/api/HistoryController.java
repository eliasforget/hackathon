package com.example.hackathon.api;

import com.example.hackathon.model.HistoryEntry;
import com.example.hackathon.repo.HistoryRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

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

    @PutMapping("/{id}")
    public ResponseEntity<HistoryEntry> update(@PathVariable Long id, @Valid @RequestBody HistoryEntry body) {
        return historyRepository.findById(id)
                .map(existing -> {
                    body.setId(id);
                    if (body.getTs() == null) {
                        body.setTs(existing.getTs());
                    }
                    HistoryEntry saved = historyRepository.save(body);
                    return ResponseEntity.ok(saved);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Optional<HistoryEntry> existing = historyRepository.findById(id);
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        historyRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
