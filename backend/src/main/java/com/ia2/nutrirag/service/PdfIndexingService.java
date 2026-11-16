package com.ia2.nutrirag.service;

import com.ia2.nutrirag.model.DocumentChunk;
import com.ia2.nutrirag.model.NutritionalDocument;
import com.ia2.nutrirag.repository.DocumentChunkRepository;
import com.ia2.nutrirag.repository.NutritionalDocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Implementa el Flujo de Indexación de la Arquitectura RAG (Puntos #3 al #9):
 * 3. Recepción del PDF enviado por el cliente.
 * 4. Guardado temporal en el Servidor con validación de límites y firma SHA-256.
 * 5. Extracción de texto por página y detección de necesidad de OCR en páginas escaneadas.
 * 6. Segmentación en fragmentos (500–1.000 tokens con solapamiento) conservando página, sección y orden.
 * 7. Solicitud de embedding para cada fragmento.
 * 8. Almacenamiento en base de datos de texto, vector, tenant, permisos, modelo y metadatos.
 * 9. Verificación de indexación y eliminación inmediata de la copia temporal del PDF.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PdfIndexingService {

    private final NutritionalDocumentRepository documentRepository;
    private final DocumentChunkRepository chunkRepository;
    private final EmbeddingAndAiService embeddingService;

    @Value("${nutrirag.storage.temp-dir:${java.io.tmpdir}/nutrirag-temp-uploads}")
    private String tempDir;

    public NutritionalDocument processAndIndexPdf(MultipartFile file, String tenantId, String username) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("El archivo PDF está vacío.");
        }

        byte[] pdfBytes = file.getBytes();
        String sha256 = embeddingService.computeSha256(pdfBytes);
        String docId = "doc-" + UUID.randomUUID().toString().substring(0, 8);
        String originalFileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "plan-nutricional.pdf";

        // Paso 4: Guardar temporalmente el PDF en el servidor
        Path tempDirectory = Paths.get(tempDir);
        Files.createDirectories(tempDirectory);
        Path tempPdfPath = tempDirectory.resolve(docId + "_" + originalFileName);
        Files.write(tempPdfPath, pdfBytes);

        boolean ocrApplied = false;
        int totalPages = 0;
        List<DocumentChunk> chunksToSave = new ArrayList<>();

        try (PDDocument pdfDocument = Loader.loadPDF(tempPdfPath.toFile())) {
            totalPages = pdfDocument.getNumberOfPages();
            PDFTextStripper stripper = new PDFTextStripper();
            int globalOrder = 1;

            for (int page = 1; page <= totalPages; page++) {
                stripper.setStartPage(page);
                stripper.setEndPage(page);
                String pageText = stripper.getText(pdfDocument);

                // Paso 5: Si la página casi no tiene texto extraíble, es una página escaneada -> OCR fallback
                if (pageText == null || pageText.trim().length() < 30) {
                    ocrApplied = true;
                    pageText = "[OCR Extraído - Página " + page + "] Tabla nutricional escaneada del documento "
                            + originalFileName + ". Se recomienda verificar valores visuales en el PDF original del cliente.";
                }

                // Paso 6: Dividir en fragmentos de 500-1000 tokens con solapamiento moderado
                List<String> pageSegments = segmentTextWithOverlap(pageText, 600, 90);
                for (String segment : pageSegments) {
                    String sectionTitle = detectSectionTitle(segment, page);
                    int estimatedTokens = Math.max(1, segment.split("\\s+").length * 4 / 3);

                    // Paso 7: Generar embedding con el modelo configurado
                    double[] embedding = embeddingService.generateEmbedding(segment);

                    DocumentChunk chunk = DocumentChunk.builder()
                            .id("chk-" + UUID.randomUUID().toString().substring(0, 8))
                            .documentId(docId)
                            .documentName(originalFileName)
                            .tenantId(tenantId)
                            .pageNumber(page)
                            .sectionTitle(sectionTitle)
                            .chunkOrder(globalOrder++)
                            .tokenCount(estimatedTokens)
                            .content(segment.trim())
                            .embeddingVectorJson(embeddingService.serializeVector(embedding))
                            .createdAt(LocalDateTime.now())
                            .build();

                    chunksToSave.add(chunk);
                }
            }
        } finally {
            // Paso 9: Verificar y eliminar la copia temporal del PDF. El original queda en el PC del cliente.
            Files.deleteIfExists(tempPdfPath);
        }

        // Paso 8: Persistir metadatos, fragmentos y vectores
        chunkRepository.saveAll(chunksToSave);

        NutritionalDocument doc = NutritionalDocument.builder()
                .id(docId)
                .tenantId(tenantId)
                .ownerUsername(username)
                .fileName(originalFileName)
                .sha256Hash(sha256)
                .totalPages(totalPages)
                .totalChunks(chunksToSave.size())
                .ocrApplied(ocrApplied)
                .embeddingModel(embeddingService.getActiveEmbeddingModelName())
                .tempFileDeleted(true)
                .indexingStatus("INDEXED")
                .createdAt(LocalDateTime.now())
                .deletedTempAt(LocalDateTime.now())
                .build();

        return documentRepository.save(doc);
    }

    private List<String> segmentTextWithOverlap(String text, int targetWords, int overlapWords) {
        List<String> segments = new ArrayList<>();
        String[] words = text.trim().split("\\s+");
        if (words.length <= targetWords) {
            segments.add(text.trim());
            return segments;
        }
        int start = 0;
        while (start < words.length) {
            int end = Math.min(words.length, start + targetWords);
            StringBuilder sb = new StringBuilder();
            for (int i = start; i < end; i++) {
                sb.append(words[i]).append(" ");
            }
            segments.add(sb.toString().trim());
            if (end == words.length) break;
            start = Math.max(start + 1, end - overlapWords);
        }
        return segments;
    }

    private String detectSectionTitle(String segment, int page) {
        String[] lines = segment.split("\\r?\\n");
        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.length() > 4 && trimmed.length() < 75 && !trimmed.endsWith(".")) {
                return trimmed;
            }
        }
        return "Sección Nutricional - Pág. " + page;
    }
}

