# NutriStudio AI — NutriRAG & Vision AI (Plataforma Clínica de Nutrición IA2)

**Plataforma Integral de Nutrición Clínica AI-Native + Arquitectura RAG Híbrida (`pgvector`) + Visión Multimodal + Red Federada HL7 FHIR + Productividad Alimenticia por País**

---

## 1. Visión y Capacidades Principales

**NutriStudio AI** une lo mejor de las plataformas líderes de nutrición (**MyFitnessPal, Cronometer Pro, Yuka, Eat This Much, Fitia, Nutrium y MacroFactor**) con una **arquitectura RAG clínica híbrida con privacidad local de PDFs**:

- **Portada Editorial + Onboarding Biométrico en 3 Pasos:** Pantalla de bienvenida con fotografías editoriales, frases motivacionales y registro guiado (*Cuenta/País → Cuerpo/Edad/Metabolismo → Objetivo/Salud Clínica*) que calcula **TMB, GET, IMC, calorías, macros y agua** desde el primer segundo.
- **Dashboard Visual Premium (Modo Claro y Modo Oscuro Clínico):**
  - **Anillo Circular SVG de Calorías** + barras de macros diferenciadas por color + **Hidratación visual interactiva de 8 vasos** + **Ventana de Crononutrición / Ayuno (14h)**.
  - **Diario Visual por 4 Tiempos de Comida** (*Desayuno, Almuerzo, Merienda, Cena*) + **Micronutrientes (Cronometer)** + **Gráfica SVG de tendencia de peso**.
- **Base de Datos Extensa (40+ alimentos globales y regionales):** Buscador instantáneo con **Nutri-Score A–E / Calidad Yuka (0–100)**, **NOVA 1–4**, índice glucémico, micronutrientes (*fibra, sodio, potasio, hierro, calcio, vitamina C, Omega-3*) y prioridad automática por país.
- **IA Integrada en Todo el Seguimiento (AI-Native):**
  - **Motor Metabólico Adaptativo (estilo MacroFactor):** Recalibra calorías según la tendencia real de peso e ingesta.
  - **Menú Automático Diario + Lista de Mercado Semanal IA (7 días)** agrupada por pasillo y adaptada al país y presupuesto (*Colombia, México, Perú, Argentina, Chile, Ecuador, España y EE. UU.*).
  - **Evaluación en vivo de comidas + Smart Swaps** y **Copiloto IA Omnipresente** con movilidad en toda la app.
- **Medicina Nutricional Especializada + Red Federada HL7 FHIR:**
  - Corpus clínico basado en **OMS/FAO, ADA, AHA/DASH, ISSN, ESPEN, KDIGO y EASL**.
  - Consolidación autorizada de expediente clínico por correo verificado (**SMART on FHIR / OAuth2**), **Rúbrica de Coordinación de 5 criterios (0–100%)**, alertas de biomarcadores, interacciones fármaco-nutriente y **Reporte Clínico Exportable a PDF**.
- **Privacidad RAG + Gobernanza de Tokens:**
  - Los PDFs originales se conservan en el PC del usuario; la copia temporal en el servidor se elimina tras indexar (`SHA-256` + `Files.deleteIfExists`).
  - Compresión de memoria (~120 tokens), tope estricto (`900` entrada / `420` salida), caché de `0 tokens`, Guardrail Tranquilo pre-LLM y presupuesto diario (`12,000 tokens`) con degradación elegante al motor RAG local.

---

## 2. Arquitectura del Repositorio

| Módulo | Tecnología | Descripción |
| :--- | :--- | :--- |
| **`frontend/`** | React 18 + Vite | Aplicación web completa **NutriStudio AI** (`App.jsx`, `nutriRagEngine.js`, `foodDatabase.js`, `countryNutritionData.js`, `clinicalKnowledgeBase.js`, `clinicalSyncService.js`, `aiWorkflowEngine.js`, `userStorage.js`). |
| **`backend/`** | Java 17 + Spring Boot 3.3 | API REST (`NutriRagController`, `ClinicalPlatformController`), ingesta de PDF con Apache PDFBox + OCR fallback, RAG híbrido (65% coseno + 35% léxico), Guardrail Tranquilo y Visión Multimodal. |
| **`docker/`** | PostgreSQL 16 + `pgvector` | Esquema relacional completo (`init-db.sql`): tablas externas de país y rúbricas clínicas, tablas internas biométricas/comidas/progreso, expediente HL7 FHIR, auditoría federada, telemetría IA y chunks vectoriales (`HNSW` + `GIN`). |
| **`nutri_global/`** | Python + Streamlit + LangChain + Pydantic | Versión alineada a la estructura base `tribuna_global` con salida estructurada Pydantic, escritura atómica y pruebas unitarias `pytest`. |

---

## 3. Cómo Ejecutar el Proyecto

### A. Frontend Interactivo (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Abre en tu navegador: `http://localhost:5173`

### B. Base de Datos PostgreSQL + `pgvector` (Docker)
```bash
docker compose up -d
```

### C. Backend Java + Spring Boot
```bash
cd backend
mvn spring-boot:run
# O con perfil PostgreSQL + pgvector:
mvn spring-boot:run -Dspring-boot.run.profiles=pgvector
```
