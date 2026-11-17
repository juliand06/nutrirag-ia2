"""NutriGlobal RAG & Vision — interfaz Streamlit (Proyecto IA2).

Basado en la estructura inicial de `tribuna_global` y adaptado a:
- Consejos de calorías, carbohidratos y nutrición con RAG (fragmentos, vectores y citas por página).
- Guardrail tranquilo cuando la consulta o imagen no tiene relación con alimentación.
- Análisis multimodal de fotos de comidas (calorías, carbohidratos, proteínas y grasas).
- Flujo de indexación de PDFs con eliminación verificada del archivo temporal.

Ejecutar con:  streamlit run app.py
"""
from __future__ import annotations

import json
import os
import uuid

import streamlit as st

import analisis as an
import almacenamiento as alm

st.set_page_config(page_title="NutriGlobal RAG & Vision — IA2", page_icon="🥗", layout="wide")

EMOJI = {
    "deficit_calorico": "🔥",
    "control_carbohidratos": "🌾",
    "aumento_masa_muscular": "💪",
    "bienestar_general": "🥗",
}
ETIQUETAS = {
    "deficit_calorico": "Déficit Calórico",
    "control_carbohidratos": "Control de Carbohidratos",
    "aumento_masa_muscular": "Masa Muscular y Proteína",
    "bienestar_general": "Bienestar General",
}
SECCIONES = (
    "Consultar y analizar comidas (Chat + Visión RAG)",
    "Indexar expedientes PDF (Arquitectura RAG)",
    "Consultar historial persistente",
)

# ----------------------------------------------------------------------------
# Catálogo y estado de sesión
# ----------------------------------------------------------------------------
try:
    OBJETIVOS = alm.cargar_objetivos()
except alm.ErrorAlmacenamiento as e:
    st.error(f"No se pudo cargar el catálogo de objetivos nutricionales: {e}")
    st.stop()

POR_ID = {o["id"]: o for o in OBJETIVOS}

if "chat" not in st.session_state:
    st.session_state.chat = []


def nueva_conversacion() -> None:
    """Limpia el chat de la sesión; los archivos en disco no se tocan."""
    st.session_state.chat = []


# ----------------------------------------------------------------------------
# Procesamiento de un envío (recuperar RAG -> analizar -> guardar)
# ----------------------------------------------------------------------------
def procesar(entrada: dict) -> None:
    """Completa una entrada del chat o análisis de imagen. Reintentos reutilizan
    el análisis ya obtenido y el mismo UUID, por lo que nunca duplican el registro."""
    # 1) Recuperación híbrida RAG (Pasos 10 al 13 del requerimiento)
    evidencias = alm.recuperar_fragmentos_rag(entrada["consulta"])
    entrada["evidencias_rag"] = evidencias
    texto_evidencias = "\n".join(
        f"- [{ev['cita_formateada']}]: {ev['contenido']}" for ev in evidencias
    )
    cita_principal = (
        evidencias[0]["cita_formateada"]
        if evidencias
        else "Guia_Clinica_Calorias_y_Macronutrientes_OMS.pdf (Pág. 1)"
    )

    # 2) Clasificación / Análisis con LangChain + Pydantic
    if entrada["analisis"] is None:
        try:
            if entrada.get("imagen_bytes"):
                entrada["analisis"] = an.analizar_imagen_comida(
                    entrada["objetivo"],
                    entrada["imagen_bytes"],
                    mime_type=entrada.get("mime_type", "image/jpeg"),
                    nota_usuario=entrada["consulta"],
                    evidencias_rag=texto_evidencias,
                )
            else:
                entrada["analisis"] = an.analizar_consulta(
                    entrada["objetivo"],
                    entrada["consulta"],
                    evidencias_rag=texto_evidencias,
                )
        except an.ErrorConfiguracion as e:
            entrada.update(estado="error_clasificacion", mensaje=str(e))
            return
        except an.ErrorEntrada as e:
            entrada.update(estado="error_entrada", mensaje=str(e))
            return
        except an.ErrorClasificacion as e:
            entrada.update(estado="error_clasificacion", mensaje=str(e))
            return

    analisis = entrada["analisis"]

    # 3) Guardrail tranquilo: mensaje o imagen ajena a nutrición no se guarda como registro válido
    if not analisis.es_pertinente:
        entrada.update(
            estado="no_pertinente",
            mensaje=(
                f"🛡️ Guardrail Nutricional (No se guardó en el historial): "
                f"{analisis.recomendacion}"
            ),
        )
        return

    # 4) Guardado atómico en JSON
    try:
        registro = alm.crear_registro(
            entrada["objetivo"],
            entrada["consulta"],
            analisis,
            cita_principal,
            an.nombre_modelo(),
            an.VERSION_PROMPT,
            registro_id=entrada["id"],
        )
        escrito = alm.guardar_consulta(alm.RUTA_CONSULTAS, registro)
    except alm.ErrorAlmacenamiento as e:
        entrada.update(estado="error_guardado", mensaje=str(e))
        return

    entrada.update(
        estado="guardada" if escrito else "ya_existia",
        cita_principal=cita_principal,
        mensaje="Consulta nutricional guardada." if escrito else "Esta consulta ya estaba guardada; no se duplicó.",
    )


def mostrar_entrada(entrada: dict) -> None:
    obj = entrada["objetivo"]
    with st.chat_message("user"):
        st.markdown(f"**{obj['nombre']}** · Meta: {obj['meta_kcal']}")
        st.write(entrada["consulta"])
        if entrada.get("imagen_bytes"):
            st.image(entrada["imagen_bytes"], caption="Comida enviada para análisis calórico", width=260)

    with st.chat_message("assistant"):
        estado = entrada["estado"]
        a = entrada["analisis"]
        if estado in ("guardada", "ya_existia"):
            st.markdown(f"{EMOJI[a.categoria]} **{ETIQUETAS[a.categoria]}**")
            c1, c2, c3, c4 = st.columns(4)
            c1.metric("Calorías", f"{a.calorias_estimadas} kcal")
            c2.metric("Carbohidratos", f"{a.carbohidratos_g} g")
            c3.metric("Proteínas", f"{a.proteinas_g} g")
            c4.metric("Grasas", f"{a.grasas_g} g")
            st.write(a.recomendacion)
            st.caption(f"📚 Cita RAG: `{entrada.get('cita_principal', '')}`")
            if estado == "guardada":
                st.success(entrada["mensaje"])
            else:
                st.info(entrada["mensaje"])
        elif estado == "no_pertinente":
            st.warning(entrada["mensaje"])
        else:
            etiqueta = {
                "error_entrada": "Entrada no válida",
                "error_clasificacion": "Error de análisis IA",
                "error_guardado": "El análisis se obtuvo, pero NO se guardó",
            }[estado]
            st.error(f"{etiqueta}: {entrada['mensaje']}")
            if estado != "error_entrada" and st.button("Reintentar", key=f"reintentar_{entrada['id']}"):
                with st.spinner("Reintentando..."):
                    procesar(entrada)
                st.rerun()


# ----------------------------------------------------------------------------
# Barra lateral
# ----------------------------------------------------------------------------
with st.sidebar:
    st.header("🥗 NutriGlobal RAG")
    seccion = st.radio("Sección", SECCIONES, key="seccion")
    st.divider()

    objetivo_id = st.selectbox(
        "Objetivo Nutricional",
        options=[o["id"] for o in OBJETIVOS],
        format_func=lambda i: f"{POR_ID[i]['nombre']} ({POR_ID[i]['meta_kcal']})",
        key="objetivo_id",
        help="La consulta o imagen de comida se evalúa según el objetivo seleccionado.",
    )
    st.button("🧹 Nueva conversación", on_click=nueva_conversacion, use_container_width=True)
    st.caption("Limpia el chat de la sesión. Los registros guardados y el índice RAG se conservan.")
    st.divider()
    st.subheader("🔑 Configuración de API IA")
    prov_actual = os.getenv("LLM_PROVIDER", "gemini").strip().lower()
    prov_sel = st.selectbox(
        "Proveedor LLM",
        options=["gemini", "groq", "openrouter", "openai", "ollama"],
        index=["gemini", "groq", "openrouter", "openai", "ollama"].index(
            prov_actual if prov_actual in ("gemini", "groq", "openrouter", "openai", "ollama") else "gemini"
        ),
    )
    os.environ["LLM_PROVIDER"] = prov_sel
    var_clave = an.PROVEEDORES[prov_sel]["clave"]
    if var_clave:
        clave_actual = os.getenv(var_clave, "")
        if clave_actual == "TU_API_KEY_AQUI":
            clave_actual = ""
        nueva_clave = st.text_input(
            f"API Key ({var_clave})",
            value=clave_actual,
            type="password",
            placeholder="Pega aquí tu API Key (ej. AIzaSy...)",
            help="También puedes configurarla en el archivo nutri_global/.env",
        )
        if nueva_clave.strip():
            os.environ[var_clave] = nueva_clave.strip()

    st.caption(f"Modelo: `{an.nombre_modelo()}` · prompt v{an.VERSION_PROMPT}")
    if an.clave_configurada() and os.getenv(var_clave or "", "") != "TU_API_KEY_AQUI":
        st.success("API Key configurada y lista para analizar.")
    else:
        st.warning(
            "Pega tu API Key arriba o en `nutri_global/.env` (ej. GEMINI_API_KEY de https://aistudio.google.com/apikey)."
        )


# ----------------------------------------------------------------------------
# Sección 1: Chat RAG Nutricional + Analizador de Imágenes de Comida
# ----------------------------------------------------------------------------
def seccion_emitir() -> None:
    st.title("Asistente de Alimentación, Calorías y Análisis de Comidas (RAG)")
    objetivo = POR_ID[objetivo_id]
    st.caption(
        f"Objetivo activo: **{objetivo['nombre']}** ({objetivo['meta_kcal']}). "
        "Puedes preguntar sobre calorías y carbohidratos o subir una foto de tu comida."
    )

    with st.expander("📸 Opcional: Adjuntar imagen de una comida para calcular calorías y carbohidratos"):
        archivo_img = st.file_uploader(
            "Sube una foto de tu plato (JPG, PNG, WEBP)",
            type=["jpg", "jpeg", "png", "webp"],
            key="uploader_comida",
        )

    texto = st.chat_input(
        f"Pregunta sobre calorías, carbohidratos o describe tu comida ({an.MIN_CARACTERES}–{an.MAX_CARACTERES} caracteres)"
    )

    if texto is not None:
        try:
            limpio = an.normalizar_consulta(texto)
        except an.ErrorEntrada as e:
            st.warning(f"{e} Texto recibido: «{texto.strip()[:200]}»")
        else:
            img_bytes = archivo_img.getvalue() if archivo_img is not None else None
            mime = archivo_img.type if archivo_img is not None else "image/jpeg"
            entrada = {
                "id": str(uuid.uuid4()),
                "objetivo": dict(objetivo),
                "consulta": limpio,
                "imagen_bytes": img_bytes,
                "mime_type": mime,
                "analisis": None,
                "estado": "pendiente",
                "mensaje": "",
            }
            with st.spinner("Recuperando evidencias RAG y analizando nutrientes..."):
                procesar(entrada)
            st.session_state.chat.append(entrada)

    if not st.session_state.chat:
        st.info(
            "Selecciona tu objetivo nutricional en la barra lateral, adjunta una foto de comida si lo deseas y escribe tu consulta abajo."
        )
    for entrada in st.session_state.chat:
        mostrar_entrada(entrada)


# ----------------------------------------------------------------------------
# Sección 2: Indexación de PDFs con Borrado Temporal (Pasos 3 al 9)
# ----------------------------------------------------------------------------
def seccion_indexar_rag() -> None:
    st.title("Indexación de Expedientes PDF (Arquitectura RAG sin retener el PDF)")
    st.markdown(
        "El archivo se procesa temporalmente, se divide en fragmentos con metadatos de **página y sección**, "
        "se calculan sus embeddings y **se elimina la copia temporal del servidor** para que el PDF original "
        "permanezca únicamente en el computador del cliente."
    )

    nombre_pdf = st.text_input("Nombre del documento PDF", value="Guia_Personalizada_Macros.pdf")
    texto_pag1 = st.text_area(
        "Contenido extraído / OCR de la Página 1",
        value="Los carbohidratos complejos como la avena (389 kcal/100g, 66g carbohidratos) y el arroz integral aportan fibra y energía sostenida.",
    )
    if st.button("Indexar fragmentos y eliminar copia temporal del PDF"):
        meta = alm.indexar_pdf_temporal(
            nombre_archivo=nombre_pdf,
            contenido_bytes=texto_pag1.encode("utf-8"),
            paginas_texto=[texto_pag1],
        )
        st.success(
            f"Documento «{meta['nombre_archivo']}» indexado ({meta['total_fragmentos']} fragmentos). "
            f"Copia temporal eliminada: {meta['temp_pdf_eliminado']} · SHA-256: {meta['sha256_hash'][:24]}..."
        )

    indice = alm.cargar_indice_rag()
    st.subheader(f"Documentos indexados ({len(indice.get('documentos', []))})")
    st.dataframe(indice.get("documentos", []), hide_index=True)


# ----------------------------------------------------------------------------
# Sección 3: Consultar Historial (Sin llamadas al modelo)
# ----------------------------------------------------------------------------
def seccion_consultar() -> None:
    st.title("Consultar historial de análisis nutricionales")
    try:
        registros = alm.cargar_consultas()
    except alm.ErrorAlmacenamiento as e:
        st.error(str(e))
        return

    nombres = {o["id"]: o["nombre"] for o in OBJETIVOS}
    for r in registros:
        nombres.setdefault(r["objetivo_id"], r["objetivo_nombre"])

    c1, c2 = st.columns(2)
    with c1:
        f_obj = st.selectbox(
            "Objetivo",
            ["Todos"] + list(nombres),
            format_func=lambda i: i if i == "Todos" else nombres[i],
            key="f_objetivo",
        )
    with c2:
        f_cat = st.selectbox(
            "Categoría Nutricional",
            ["Todos", *alm.CATEGORIAS_NUTRICION],
            key="f_categoria",
        )

    filtrados = alm.consultar_historial(
        registros,
        None if f_obj == "Todos" else f_obj,
        None if f_cat == "Todos" else f_cat,
    )

    if not filtrados:
        st.info("No hay consultas nutricionales que coincidan con los filtros.")
        return

    conteo = alm.contar_por_categoria(filtrados)
    cols = st.columns(5)
    cols[0].metric("Total filtrado", len(filtrados))
    for col, cat in zip(cols[1:], alm.CATEGORIAS_NUTRICION):
        col.metric(f"{EMOJI[cat]} {ETIQUETAS[cat]}", conteo[cat])

    st.dataframe(
        [
            {
                "Fecha (UTC)": r["fecha_utc"],
                "Objetivo": r["objetivo_nombre"],
                "Consulta / Plato": r["consulta_original"],
                "Categoría": r["categoria"],
                "Kcal": r["calorias_estimadas"],
                "Carbs (g)": r["carbohidratos_g"],
                "Proteína (g)": r["proteinas_g"],
                "Cita RAG": r["cita_documento"],
            }
            for r in filtrados
        ],
        hide_index=True,
    )

    st.download_button(
        "⬇️ Descargar resultados filtrados (JSON)",
        data=json.dumps(filtrados, ensure_ascii=False, indent=2),
        file_name="consultas_nutricionales_filtradas.json",
        mime="application/json",
    )


if seccion == SECCIONES[0]:
    seccion_emitir()
elif seccion == SECCIONES[1]:
    seccion_indexar_rag()
else:
    seccion_consultar()

