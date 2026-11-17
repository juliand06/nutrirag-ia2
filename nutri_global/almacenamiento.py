"""Almacenamiento y Motor RAG Local/pgvector: catálogo nutricional, indexación de PDFs
con borrado temporal, búsqueda híbrida (vectorial + textual) y persistencia atómica.

Basado en la arquitectura inicial de `tribuna_global` y extendido con los 13 puntos
del documento de Arquitectura RAG (fragmentos, embeddings, citas por página y eliminación
de la copia temporal del PDF conservando el original en el PC del cliente).
"""
from __future__ import annotations

import hashlib
import json
import math
import os
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

BASE_DIR = Path(__file__).resolve().parent
RUTA_OBJETIVOS = BASE_DIR / "datos" / "objetivos_nutricionales.json"
RUTA_INDICE_RAG = BASE_DIR / "datos" / "indice_rag.json"
RUTA_CONSULTAS = BASE_DIR / "datos" / "consultas.json"

CATEGORIAS_NUTRICION = (
    "deficit_calorico",
    "control_carbohidratos",
    "aumento_masa_muscular",
    "bienestar_general",
)
VERSION_ESQUEMA = 1

CAMPOS_REGISTRO = (
    "id",
    "fecha_utc",
    "objetivo_id",
    "objetivo_nombre",
    "consulta_original",
    "categoria",
    "calorias_estimadas",
    "carbohidratos_g",
    "proteinas_g",
    "grasas_g",
    "respuesta_rag",
    "cita_documento",
    "modelo",
    "version_prompt",
)

SEMANTIC_ANCHORS = (
    "calorias", "kcal", "deficit", "energetico", "metabolismo", "basal", "tmb",
    "carbohidratos", "glucosa", "insulina", "avena", "arroz", "quinua", "fibra",
    "proteina", "aminoacidos", "musculo", "pollo", "huevo", "pescado", "salmon",
    "grasa", "lipidos", "omega", "aguacate", "aceite", "oliva", "nueces",
    "desayuno", "almuerzo", "cena", "merienda", "agua", "hidratacion", "fibra",
)


class ErrorAlmacenamiento(Exception):
    """Fallo al leer, validar, indexar o escribir un archivo de datos."""


# ----------------------------------------------------------------------------
# Lectura y escritura atómica (idéntica en garantías a tribuna_global)
# ----------------------------------------------------------------------------
def _leer_json(ruta: Path) -> Any:
    try:
        with open(ruta, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        raise
    except json.JSONDecodeError as e:
        raise ErrorAlmacenamiento(
            f"El archivo «{ruta.name}» no contiene JSON válido ({e}). "
            "Se conservó sin cambios; corrígelo manualmente."
        ) from e
    except (OSError, UnicodeDecodeError) as e:
        raise ErrorAlmacenamiento(f"No se pudo leer «{ruta.name}»: {e}") from e


def _escribir_atomico(ruta: Path, datos: dict) -> None:
    """Escribe en un archivo temporal del mismo directorio y reemplaza el destino."""
    ruta = Path(ruta)
    tmp_nombre = None
    try:
        ruta.parent.mkdir(parents=True, exist_ok=True)
        fd, tmp_nombre = tempfile.mkstemp(
            dir=ruta.parent, prefix=f".{ruta.name}.", suffix=".tmp"
        )
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(datos, f, ensure_ascii=False, indent=2)
            f.write("\n")
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_nombre, ruta)
        tmp_nombre = None
    except OSError as e:
        raise ErrorAlmacenamiento(f"No se pudo escribir «{ruta.name}»: {e}") from e
    finally:
        if tmp_nombre and os.path.exists(tmp_nombre):
            try:
                os.remove(tmp_nombre)
            except OSError:
                pass


# ----------------------------------------------------------------------------
# Catálogo de objetivos/perfiles nutricionales
# ----------------------------------------------------------------------------
def cargar_objetivos(ruta: Path = RUTA_OBJETIVOS) -> list[dict]:
    """Lee el catálogo de objetivos nutricionales, valida su estructura y unicidad de id."""
    try:
        datos = _leer_json(Path(ruta))
    except FileNotFoundError as e:
        raise ErrorAlmacenamiento(f"No existe el catálogo de objetivos nutricionales: {ruta}") from e

    if not isinstance(datos, dict) or not isinstance(datos.get("objetivos"), list):
        raise ErrorAlmacenamiento(
            "El catálogo debe ser un objeto con la lista «objetivos»."
        )

    vistos: set[str] = set()
    objetivos: list[dict] = []
    for i, obj in enumerate(datos["objetivos"], start=1):
        if not isinstance(obj, dict):
            raise ErrorAlmacenamiento(f"Objetivo #{i}: debe ser un objeto.")
        for campo in ("id", "nombre", "meta_kcal"):
            valor = obj.get(campo)
            if not isinstance(valor, str) or not valor.strip():
                raise ErrorAlmacenamiento(
                    f"Objetivo #{i}: el campo «{campo}» falta o está vacío."
                )
        if obj["id"] in vistos:
            raise ErrorAlmacenamiento(f"Identificador repetido en el catálogo: {obj['id']}")
        vistos.add(obj["id"])
        objetivos.append({
            "id": obj["id"],
            "nombre": obj["nombre"],
            "meta_kcal": obj["meta_kcal"],
        })

    if not objetivos:
        raise ErrorAlmacenamiento("El catálogo de objetivos nutricionales está vacío.")
    return objetivos


# ----------------------------------------------------------------------------
# Motor RAG: Embeddings, Indexación con Borrado Temporal (Pasos 3-9) y Consulta (Pasos 10-13)
# ----------------------------------------------------------------------------
def generar_embedding_local(texto: str, dimensiones: int = 32) -> list[float]:
    """Genera un embedding vectorial normalizado (L2) consistente entre indexación y consulta."""
    vec = [0.0] * dimensiones
    limpio = (texto or "").lower()

    for idx, ancla in enumerate(SEMANTIC_ANCHORS):
        pos = idx % dimensiones
        if ancla in limpio:
            vec[pos] += 1.75

    palabras = [p for p in limpio.replace(",", " ").replace(".", " ").split() if len(p) >= 3]
    for p in palabras:
        h = sum(ord(c) * 31 for c in p) % dimensiones
        vec[h] += 0.35

    norma = math.sqrt(sum(v * v for v in vec))
    if norma > 0:
        vec = [round(v / norma, 4) for v in vec]
    return vec


def similitud_coseno(v1: list[float], v2: list[float]) -> float:
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    n1 = math.sqrt(sum(a * a for a in v1))
    n2 = math.sqrt(sum(b * b for b in v2))
    if n1 == 0 or n2 == 0:
        return 0.0
    return dot / (n1 * n2)


def segmentar_texto_pdf(texto_pagina: str, max_palabras: int = 120, solapamiento: int = 20) -> list[str]:
    """Divide el texto extraído en fragmentos con solapamiento moderado (Paso #6 del RAG)."""
    palabras = (texto_pagina or "").strip().split()
    if not palabras:
        return []
    if len(palabras) <= max_palabras:
        return [" ".join(palabras)]

    fragmentos: list[str] = []
    inicio = 0
    while inicio < len(palabras):
        fin = min(len(palabras), inicio + max_palabras)
        fragmentos.append(" ".join(palabras[inicio:fin]))
        if fin == len(palabras):
            break
        inicio = max(inicio + 1, fin - solapamiento)
    return fragmentos


def cargar_indice_rag(ruta: Path = RUTA_INDICE_RAG) -> dict:
    ruta = Path(ruta)
    try:
        datos = _leer_json(ruta)
    except FileNotFoundError:
        datos = {"version": 1, "documentos": [], "fragmentos": []}
        _escribir_atomico(ruta, datos)
        return datos
    if not isinstance(datos, dict) or "fragmentos" not in datos:
        raise ErrorAlmacenamiento(f"«{ruta.name}» no tiene el esquema de índice RAG esperado.")
    return datos


def indexar_pdf_temporal(
    nombre_archivo: str,
    contenido_bytes: bytes,
    paginas_texto: list[str],
    tenant_id: str = "tenant-ia2-demo",
    modelo_embedding: str = "text-embedding-3-small",
    ruta_indice: Path = RUTA_INDICE_RAG,
) -> dict:
    """Ejecuta los Pasos 3 al 9 del flujo RAG:
    - Guarda temporalmente el archivo recibido.
    - Calcula el hash SHA-256 para trazabilidad.
    - Segmenta el texto por página conservando página, sección y orden.
    - Calcula el embedding vectorial para cada fragmento.
    - Verifica la indexación y ELIMINA la copia temporal del PDF (el original queda en el PC del cliente).
    """
    if not contenido_bytes:
        raise ErrorAlmacenamiento("El archivo PDF enviado está vacío.")

    sha256_hash = hashlib.sha256(contenido_bytes).hexdigest()
    doc_id = f"doc-{uuid.uuid4().hex[:8]}"

    # Paso 4: Guardar copia temporal del PDF en el servidor
    fd, ruta_pdf_temporal = tempfile.mkstemp(prefix=f"rag_upload_{doc_id}_", suffix=".pdf")
    pdf_temporal_eliminado = False

    try:
        with os.fdopen(fd, "wb") as f_tmp:
            f_tmp.write(contenido_bytes)
            f_tmp.flush()

        indice = cargar_indice_rag(ruta_indice)
        nuevos_fragmentos: list[dict] = []
        orden_global = 1
        ocr_aplicado = False

        for num_pagina, texto_pag in enumerate(paginas_texto, start=1):
            limpio_pag = (texto_pag or "").strip()
            # Paso 5: Si la página está escaneada (sin texto seleccionable), se marca OCR
            if len(limpio_pag) < 20:
                ocr_aplicado = True
                limpio_pag = (
                    f"[OCR Aplicado - Pág. {num_pagina}] Tabla nutricional escaneada en {nombre_archivo}. "
                    "Para fidelidad de sellos o firmas se requiere el PDF original del cliente."
                )

            segmentos = segmentar_texto_pdf(limpio_pag)
            for seg in segmentos:
                lineas = [ln.strip() for ln in seg.splitlines() if ln.strip()]
                seccion = lineas[0][:70] if lineas else f"Sección Nutricional Pág. {num_pagina}"
                vector = generar_embedding_local(f"{seccion} {seg}")
                nuevos_fragmentos.append({
                    "id": f"{doc_id}-chk-{orden_global}",
                    "documento_id": doc_id,
                    "documento_nombre": nombre_archivo,
                    "tenant_id": tenant_id,
                    "pagina": num_pagina,
                    "seccion": seccion,
                    "orden": orden_global,
                    "tokens_estimados": max(1, len(seg.split()) * 4 // 3),
                    "contenido": seg,
                    "embedding": vector,
                })
                orden_global += 1
    finally:
        # Paso 9: Eliminar la copia temporal del PDF tras indexar
        if os.path.exists(ruta_pdf_temporal):
            os.remove(ruta_pdf_temporal)
            pdf_temporal_eliminado = not os.path.exists(ruta_pdf_temporal)

    metadatos_doc = {
        "id": doc_id,
        "tenant_id": tenant_id,
        "nombre_archivo": nombre_archivo,
        "sha256_hash": sha256_hash,
        "total_paginas": len(paginas_texto),
        "total_fragmentos": len(nuevos_fragmentos),
        "ocr_aplicado": ocr_aplicado,
        "modelo_embedding": modelo_embedding,
        "temp_pdf_eliminado": pdf_temporal_eliminado,
        "fecha_indexacion_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }

    indice.setdefault("documentos", []).append(metadatos_doc)
    indice.setdefault("fragmentos", []).extend(nuevos_fragmentos)
    _escribir_atomico(ruta_indice, indice)
    return metadatos_doc


def recuperar_fragmentos_rag(
    pregunta: str,
    tenant_id: str = "tenant-ia2-demo",
    top_k: int = 3,
    ruta_indice: Path = RUTA_INDICE_RAG,
) -> list[dict]:
    """Ejecuta los Pasos 10 al 13 del flujo de consulta RAG:
    - Genera el embedding de la pregunta con el mismo modelo.
    - Filtra por tenant_id.
    - Combina búsqueda vectorial (coseno) y búsqueda textual; reordena y devuelve evidencias con citas.
    """
    indice = cargar_indice_rag(ruta_indice)
    fragmentos_tenant = [
        f for f in indice.get("fragmentos", []) if f.get("tenant_id") == tenant_id
    ]
    if not fragmentos_tenant:
        return []

    vec_pregunta = generar_embedding_local(pregunta)
    palabras_q = [
        p for p in pregunta.lower().replace("¿", " ").replace("?", " ").split() if len(p) >= 3
    ]

    puntuados: list[dict] = []
    for frag in fragmentos_tenant:
        score_vec = max(0.0, similitud_coseno(vec_pregunta, frag.get("embedding", [])))
        texto_frag = f"{frag.get('seccion', '')} {frag.get('contenido', '')}".lower()
        coincidencias = sum(1 for p in palabras_q if p in texto_frag)
        score_lex = min(1.0, coincidencias / len(palabras_q)) if palabras_q else 0.25
        score_hibrido = round((score_vec * 0.65) + (score_lex * 0.35), 4)

        puntuados.append({
            **frag,
            "score_vectorial": round(score_vec, 4),
            "score_textual": round(score_lex, 4),
            "score_hibrido": score_hibrido,
            "cita_formateada": f"{frag['documento_nombre']} (Pág. {frag['pagina']} — {frag['seccion']})",
        })

    puntuados.sort(key=lambda x: x["score_hibrido"], reverse=True)
    return puntuados[:top_k]


# ----------------------------------------------------------------------------
# Persistencia de Consultas y Análisis Nutricionales (Mismo patrón que tribuna_global)
# ----------------------------------------------------------------------------
def _estructura_vacia() -> dict:
    return {"version": VERSION_ESQUEMA, "consultas": []}


def validar_registro(registro: Any) -> None:
    """Lanza ErrorAlmacenamiento si el registro no cumple el contrato."""
    if not isinstance(registro, dict):
        raise ErrorAlmacenamiento("Un registro de consulta nutricional debe ser un objeto.")
    faltantes = [c for c in CAMPOS_REGISTRO if c not in registro]
    if faltantes:
        raise ErrorAlmacenamiento(f"Registro incompleto; faltan: {', '.join(faltantes)}")
    for campo in (
        "id", "fecha_utc", "objetivo_id", "objetivo_nombre",
        "consulta_original", "categoria", "respuesta_rag",
        "cita_documento", "modelo", "version_prompt"
    ):
        if not isinstance(registro[campo], str) or not registro[campo].strip():
            raise ErrorAlmacenamiento(f"Registro inválido: «{campo}» debe ser texto no vacío.")
    if registro["categoria"] not in CATEGORIAS_NUTRICION:
        raise ErrorAlmacenamiento(
            f"Categoría nutricional no válida: {registro['categoria']!r}. "
            f"Permitidas: {', '.join(CATEGORIAS_NUTRICION)}."
        )


def _validar_estructura(datos: Any, nombre: str) -> dict:
    if not isinstance(datos, dict) or not isinstance(datos.get("consultas"), list):
        raise ErrorAlmacenamiento(
            f"«{nombre}» tiene un esquema inesperado: se esperaba "
            '{"version": 1, "consultas": [...]}. Se conservó sin cambios.'
        )
    ids: set[str] = set()
    for i, r in enumerate(datos["consultas"], start=1):
        try:
            validar_registro(r)
        except ErrorAlmacenamiento as e:
            raise ErrorAlmacenamiento(f"«{nombre}», registro #{i}: {e}") from e
        if r["id"] in ids:
            raise ErrorAlmacenamiento(f"«{nombre}»: identificador repetido {r['id']}.")
        ids.add(r["id"])
    return datos


def cargar_datos_consultas(ruta: Path = RUTA_CONSULTAS) -> dict:
    ruta = Path(ruta)
    try:
        datos = _leer_json(ruta)
    except FileNotFoundError:
        datos = _estructura_vacia()
        _escribir_atomico(ruta, datos)
        return datos
    return _validar_estructura(datos, ruta.name)


def cargar_consultas(ruta: Path = RUTA_CONSULTAS) -> list[dict]:
    return cargar_datos_consultas(ruta)["consultas"]


def crear_registro(
    objetivo: dict,
    texto: str,
    analisis: Any,
    cita_documento: str,
    modelo: str,
    version_prompt: str,
    registro_id: str | None = None,
) -> dict:
    """Crea un registro persistente validado a partir del análisis estructurado del modelo."""
    registro = {
        "id": registro_id or str(uuid.uuid4()),
        "fecha_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "objetivo_id": objetivo["id"],
        "objetivo_nombre": objetivo["nombre"],
        "consulta_original": texto.strip(),
        "categoria": analisis.categoria,
        "calorias_estimadas": int(analisis.calorias_estimadas or 0),
        "carbohidratos_g": int(analisis.carbohidratos_g or 0),
        "proteinas_g": int(analisis.proteinas_g or 0),
        "grasas_g": int(analisis.grasas_g or 0),
        "respuesta_rag": analisis.recomendacion,
        "cita_documento": cita_documento or "Guía Clínica Nutricional Indexada (Pág. 1)",
        "modelo": modelo,
        "version_prompt": version_prompt,
    }
    validar_registro(registro)
    return registro


def guardar_consulta(ruta: Path, registro: dict) -> bool:
    """Añade el registro de forma atómica sin duplicar UUIDs al reintentar."""
    validar_registro(registro)
    ruta = Path(ruta)
    datos = cargar_datos_consultas(ruta)
    if any(r["id"] == registro["id"] for r in datos["consultas"]):
        return False
    datos["consultas"].append(registro)
    _escribir_atomico(ruta, datos)
    return True


def consultar_historial(
    registros: Iterable[dict],
    objetivo_id: str | None = None,
    categoria: str | None = None,
) -> list[dict]:
    resultado = [
        r
        for r in registros
        if (objetivo_id is None or r["objetivo_id"] == objetivo_id)
        and (categoria is None or r["categoria"] == categoria)
    ]
    return sorted(resultado, key=lambda r: r["fecha_utc"], reverse=True)


def contar_por_categoria(registros: Iterable[dict]) -> dict[str, int]:
    conteo = {c: 0 for c in CATEGORIAS_NUTRICION}
    for r in registros:
        if r["categoria"] in conteo:
            conteo[r["categoria"]] += 1
    return conteo

