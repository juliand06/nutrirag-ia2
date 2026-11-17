# 🥗 NutriGlobal RAG & Vision — Proyecto IA2

Aplicación construida sobre la **estructura base oficial de la materia (`tribuna_global`)** y extendida con la **Arquitectura RAG**, el **Guardrail Tranquilo Nutricional** y el **Análisis Multimodal de Imágenes de Comidas (Calorías y Carbohidratos)**.

## Estructura Idéntica a `tribuna_global`
```text
nutri_global/
├── app.py               # Interfaz Streamlit (Chat + Visión RAG / Indexar PDFs / Consultar historial)
├── analisis.py          # Prompt RAG, contrato Pydantic AnalisisNutricional, análisis multimodal de imágenes
├── almacenamiento.py    # Catálogo, indexación RAG con borrado del PDF temporal, escritura atómica y consultas
├── datos/
│   ├── objetivos_nutricionales.json  # 8 perfiles y metas calóricas
│   ├── indice_rag.json               # Fragmentos indexados de PDFs con embeddings, página, sección y hash SHA-256
│   └── consultas.json                # Registros persistentes de consultas y análisis de comidas
├── tests/               # pytest con CadenaFalsa (sin llamar a la API)
│   ├── conftest.py
│   ├── test_almacenamiento.py
│   └── test_analisis.py
├── docs/registro_pruebas.md          # Matriz de pruebas de aceptación de 12 casos
├── requirements.txt · requirements-dev.txt · .env.example · setup.bat · setup.sh
└── .vscode/             # Configuración F5 y tareas de prueba
```

## Decisiones de Diseño Conservadas de `tribuna_global` + Nuevos Requerimientos IA2
1. **Separación de responsabilidades (`app.py` / `analisis.py` / `almacenamiento.py`)**:
   - `almacenamiento.py` no conoce Streamlit ni el LLM; maneja escrituras atómicas (`tempfile.mkstemp` + `os.replace`) y conserva archivos JSON corruptos sin sobrescribirlos.
2. **Salida Estructurada con Pydantic (`with_structured_output`) y Validación de Coherencia (`validar_analisis`)**:
   - El modelo devuelve `AnalisisNutricional` con `es_pertinente`, `categoria`, `calorias_estimadas`, `carbohidratos_g`, `proteinas_g`, `grasas_g` y `recomendacion`.
3. **Guardrail Tranquilo (Requerimiento #3)**:
   - Si el usuario escribe un error común o pregunta sobre algo ajeno a la alimentación (fútbol, geografía, programación), `es_pertinente=False`, `categoria=None`, **no se guarda como registro falso** y devuelve un mensaje tranquilo invitando a preguntar sobre nutrición y calorías.
4. **Análisis Multimodal de Imágenes de Comida (Requerimiento #4)**:
   - `analizar_imagen_comida()` recibe la foto del plato y calcula calorías, carbohidratos, proteínas y grasas, o activa el Guardrail tranquilo si la imagen subida no es de comida.
5. **Flujo RAG con Eliminación Temporal del PDF (Requerimientos #1 y #2)**:
   - `indexar_pdf_temporal()` guarda temporalmente el PDF, calcula su hash `SHA-256`, segmenta por página y sección, genera embeddings y **elimina la copia temporal del servidor (`temp_pdf_eliminado=True`)** para que el original permanezca en el computador del cliente.

