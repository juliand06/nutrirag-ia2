package com.ia2.nutrirag.controller;

import com.ia2.nutrirag.model.NutritionalDocument;
import com.ia2.nutrirag.repository.NutritionalDocumentRepository;
import com.ia2.nutrirag.service.FoodVisionService;
import com.ia2.nutrirag.service.HybridRagService;
import com.ia2.nutrirag.service.PdfIndexingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class NutriRagController {

    private final PdfIndexingService pdfIndexingService;
    private final HybridRagService hybridRagService;
    private final FoodVisionService foodVisionService;
    private final NutritionalDocumentRepository documentRepository;

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of(
                "status", "UP",
                "service", "NutriRAG & Vision AI - IA2 Backend",
                "architecture", "Spring Boot + PostgreSQL/pgvector + Hybrid RAG + Food Vision"
        );
    }

    @GetMapping("/documents")
    public List<NutritionalDocument> listDocuments(
            @RequestHeader(value = "X-Tenant-Id", defaultValue = "tenant-ia2-demo") String tenantId) {
        return documentRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
    }

    @PostMapping("/documents/upload")
    public ResponseEntity<NutritionalDocument> uploadAndIndexPdf(
            @RequestParam("file") MultipartFile file,
            @RequestHeader(value = "X-Tenant-Id", defaultValue = "tenant-ia2-demo") String tenantId,
            @RequestParam(value = "username", defaultValue = "estudiante_ia2") String username
    ) throws IOException {
        NutritionalDocument indexed = pdfIndexingService.processAndIndexPdf(file, tenantId, username);
        return ResponseEntity.ok(indexed);
    }

    @PostMapping("/rag/query")
    public ResponseEntity<HybridRagService.RagQueryResponse> queryRag(
            @RequestBody QueryRequest request,
            @RequestHeader(value = "X-Tenant-Id", defaultValue = "tenant-ia2-demo") String tenantId
    ) {
        String effectiveTenant = request.tenantId() != null && !request.tenantId().isBlank()
                ? request.tenantId() : tenantId;
        return ResponseEntity.ok(hybridRagService.queryRag(request.question(), effectiveTenant));
    }

    /**
     * Fase 3: Streaming SSE del Chat Coach con citas RAG al cierre.
     */
    @PostMapping(value = "/rag/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamRag(
            @RequestBody QueryRequest request,
            @RequestHeader(value = "X-Tenant-Id", defaultValue = "tenant-ia2-demo") String tenantId
    ) {
        String effectiveTenant = request.tenantId() != null && !request.tenantId().isBlank()
                ? request.tenantId() : tenantId;
        SseEmitter emitter = new SseEmitter(30_000L);
        HybridRagService.RagQueryResponse full = hybridRagService.queryRag(request.question(), effectiveTenant);

        new Thread(() -> {
            try {
                String[] words = full.answer().split(" ");
                StringBuilder chunk = new StringBuilder();
                for (int i = 0; i < words.length; i++) {
                    chunk.append(words[i]).append(" ");
                    if ((i + 1) % 6 == 0 || i == words.length - 1) {
                        emitter.send(SseEmitter.event().name("token").data(chunk.toString()));
                        chunk.setLength(0);
                        Thread.sleep(25);
                    }
                }
                emitter.send(SseEmitter.event().name("citations").data(full.citations()));
                emitter.send(SseEmitter.event().name("done").data("ok"));
                emitter.complete();
            } catch (Exception ex) {
                emitter.completeWithError(ex);
            }
        }).start();
        return emitter;
    }

    @PostMapping("/vision/analyze")
    public ResponseEntity<FoodVisionService.MealVisionAnalysis> analyzeMeal(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "note", required = false, defaultValue = "") String note,
            @RequestParam(value = "presetId", required = false, defaultValue = "") String presetId
    ) {
        String fileName = (file != null && file.getOriginalFilename() != null) ? file.getOriginalFilename() : "";
        return ResponseEntity.ok(foodVisionService.analyzeMealImage(fileName, note, presetId));
    }

    public record QueryRequest(String question, String tenantId) {}
}

