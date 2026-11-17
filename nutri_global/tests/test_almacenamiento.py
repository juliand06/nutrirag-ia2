import json

import pytest

import almacenamiento as alm
from analisis import AnalisisNutricional

OBJETIVO = {"id": "obj01", "nombre": "Déficit Calórico Saludable", "meta_kcal": "1,650 kcal/día"}


def _analisis(cat="deficit_calorico", rec="Excelente aporte de fibra y proteína."):
    return AnalisisNutricional(
        es_pertinente=True,
        categoria=cat,
        calorias_estimadas=480,
        carbohidratos_g=45,
        proteinas_g=38,
        grasas_g=14,
        recomendacion=rec,
    )


def _registro(**kw):
    return alm.crear_registro(
        OBJETIVO,
        kw.pop("texto", "Pechuga de pollo con arroz integral"),
        _analisis(),
        "Guia_Clinica_Calorias_y_Macronutrientes_OMS.pdf (Pág. 1)",
        "gemini/gemini-flash-latest",
        "1.0",
        **kw,
    )


def test_catalogo_objetivos_valido():
    objs = alm.cargar_objetivos()
    assert len(objs) >= 6 and len({o["id"] for o in objs}) == len(objs)


def test_indexacion_pdf_elimina_copia_temporal_y_recupera_citas(tmp_path):
    ruta_indice = tmp_path / "indice_rag.json"
    meta = alm.indexar_pdf_temporal(
        nombre_archivo="Plan_Calorias_Paciente.pdf",
        contenido_bytes=b"%PDF-1.4 contenido simulado",
        paginas_texto=[
            "Seccion 1 Carbohidratos: Consumir 180g de carbohidratos complejos de avena y quinua al día.",
            "Seccion 2 Proteinas: Ingerir 140g de proteína magra de pollo, huevo o pescado.",
        ],
        ruta_indice=ruta_indice,
    )
    assert meta["temp_pdf_eliminado"] is True
    assert meta["total_paginas"] == 2
    assert meta["total_fragmentos"] == 2

    evidencias = alm.recuperar_fragmentos_rag(
        "¿Cuántos gramos de carbohidratos de avena debo consumir?",
        ruta_indice=ruta_indice,
    )
    assert len(evidencias) >= 1
    assert "Plan_Calorias_Paciente.pdf" in evidencias[0]["cita_formateada"]
    assert evidencias[0]["pagina"] == 1


def test_persistencia_atomica_y_no_duplicados(tmp_path):
    ruta = tmp_path / "consultas.json"
    r = _registro()
    assert alm.guardar_consulta(ruta, r) is True
    assert alm.guardar_consulta(ruta, r) is False
    assert len(alm.cargar_consultas(ruta)) == 1


def test_json_invalido_se_conserva(tmp_path):
    ruta = tmp_path / "consultas.json"
    ruta.write_text("{ json dañado", encoding="utf-8")
    with pytest.raises(alm.ErrorAlmacenamiento):
        alm.cargar_consultas(ruta)
    assert ruta.read_text(encoding="utf-8") == "{ json dañado"

