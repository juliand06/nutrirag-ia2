# NutriRAG & Vision AI — Proyecto para la Clase IA2
**Arquitectura RAG con Java Spring Boot + PostgreSQL (`pgvector`) + Guardrails Nutricionales + Análisis Multimodal de Comidas**

---

## 1. Análisis de los Requerimientos y Adaptación al Dominio de Nutrición

El documento de arquitectura define un sistema **RAG (Retrieval-Augmented Generation)** con **privacidad de archivos locales** (el PDF original permanece en el computador del cliente y la copia temporal en el servidor se elimina tras indexar). Aquí está cómo cada punto se implementó para tu proyecto de **Nutrición, Calorías y Bienestar**:

| Punto del Documento | Requerimiento Técnico | Implementación en NutriRAG & Vision AI |
| :--- | :--- | :--- |
| **1. Objetivo** | Conservar los PDF originales en el PC del cliente mientras consulta su contenido indexado en el VPS con el PC apagado. | Los planes nutricionales, tablas de calorías y guías clínicas de cada usuario se fragmentan, vectorizan y consultan desde la base de datos sin retener el PDF original. |
| **2. Componentes** | Cliente Web HTTPS, Spring Boot, Procesador Asíncrono, Embeddings OpenAI/Gemini, PostgreSQL + `pgvector`, Motor RAG Híbrido. | Separado en `frontend/` (React + Vite), `backend/` (Spring Boot 3.3 + `@EnableAsync`) y `docker-compose.yml` (`pgvector/pgvector:pg16` + modo H2 de respaldo). |
| **3–5. Carga, Validación y OCR** | Carga temporal cifrada, validación de límites/hash SHA-256, extracción de texto y OCR para páginas escaneadas. | `PdfIndexingService.java` calcula el hash `SHA-256`, extrae texto por página con `Apache PDFBox` y activa el fallback de OCR cuando detecta páginas escaneadas. |
| **6–8. Segmentación y Embeddings** | Fragmentos de 500–1.000 tokens con solapamiento moderado conservando página, sección y orden; vectores en `pgvector`. | `DocumentChunk.java` e `init-db.sql` almacenan `page_number`, `section_title`, `chunk_order`, `token_count` y `embedding vector(1536)` con índice `HNSW`. |
| **9. Eliminación Temporal** | Verificar la indexación y eliminar la copia temporal del PDF en el servidor. | En el bloque `finally` de `PdfIndexingService.java` se ejecuta `Files.deleteIfExists(tempPdfPath)` y se registra `tempFileDeleted = true` con marca de tiempo. |
| **10–13. Flujo de Consulta Híbrida** | Embedding con el mismo modelo, filtro de tenant/autorización, combinación vectorial + textual y respuesta con citas. | `HybridRagService.java` y `nutriRagEngine.js` combinan similitud coseno (65%) + búsqueda léxica Full-Text (35%), filtran por `tenant_id` y citan **Documento, Página y Sección**. |
| **Req. Adicional #3** | **Guardrail Tranquilo ante errores o temas ajenos a la nutrición.** | `NutritionGuardrailService.java` detecta preguntas fuera de alimentación (fútbol, programación, política o errores de teclado) y responde con calma invitando a preguntar sobre nutrición y calorías. |
| **Req. Adicional #4** | **Análisis de Imágenes de Comidas (Calorías, Carbohidratos y Macros).** | `FoodVisionService.java` y la Pestaña 2 del Frontend analizan fotos de platos (desglosando calorías totales, carbohidratos, proteínas, grasas, fibra, carga glucémica e ingredientes) e incluyen Guardrail si la imagen subida no es comida. |

---

## 2. Cómo Ejecutar el Proyecto para la Presentación

### A. Iniciar el Frontend Interactivo (React + Vite)
El Frontend cuenta con conexión al Backend y además un **Motor RAG + Visión de Respaldo Integrado**, por lo que funciona inmediatamente con un solo comando:

```bash
cd frontend
npm install
npm run dev
```
Abre en tu navegador: `http://localhost:5173`

### B. Iniciar la Base de Datos PostgreSQL + `pgvector` (Opcional con Docker)
```bash
docker compose up -d
```

### C. Iniciar el Backend Java + Spring Boot
- **Modo Demo (Sin requerir Docker abierto):**
  ```bash
  cd backend
  mvn spring-boot:run
  ```
- **Modo Estricto PostgreSQL + `pgvector`:**
  ```bash
  cd backend
  mvn spring-boot:run -Dspring-boot.run.profiles=pgvector
  ```

