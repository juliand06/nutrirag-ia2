import pytest

import analisis as an

OBJ = {"id": "obj01", "nombre": "Déficit Calórico Saludable", "meta_kcal": "1,650 kcal/día"}


class CadenaFalsa:
    def __init__(self, resultado=None, error=None):
        self.resultado, self.error, self.llamadas = resultado, error, []

    def invoke(self, datos):
        self.llamadas.append(datos)
        if self.error:
            raise self.error
        return self.resultado


@pytest.mark.parametrize("texto", ["", "     ", "\n\t ", None, "abcd", "x" * 1001])
def test_entrada_invalida_no_llama_al_modelo(texto):
    c = CadenaFalsa(
        an.AnalisisNutricional(
            es_pertinente=True,
            categoria="deficit_calorico",
            calorias_estimadas=450,
            carbohidratos_g=40,
            proteinas_g=35,
            grasas_g=12,
            recomendacion="Plato equilibrado.",
        )
    )
    with pytest.raises(an.ErrorEntrada):
        an.analizar_consulta(OBJ, texto, cadena=c)
    assert c.llamadas == []


def test_resultado_valido_con_calorias_y_carbohidratos():
    c = CadenaFalsa(
        an.AnalisisNutricional(
            es_pertinente=True,
            categoria="control_carbohidratos",
            calorias_estimadas=520,
            carbohidratos_g=48,
            proteinas_g=40,
            grasas_g=16,
            recomendacion="Excelente control glucémico según Pág. 2 del PDF.",
        )
    )
    res = an.analizar_consulta(OBJ, "  Pollo con quinua y brócoli  ", evidencias_rag="Evidencia Pág. 2", cadena=c)
    assert res.categoria == "control_carbohidratos"
    assert res.calorias_estimadas == 520
    assert res.carbohidratos_g == 48


def test_guardrail_tranquilo_cuando_no_es_pertinente():
    c = CadenaFalsa(
        an.AnalisisNutricional(
            es_pertinente=False,
            categoria=None,
            calorias_estimadas=0,
            carbohidratos_g=0,
            proteinas_g=0,
            grasas_g=0,
            recomendacion="Hola, con tranquilidad te comento que mi especialidad es la nutrición y las calorías.",
        )
    )
    res = an.analizar_consulta(OBJ, "La capital de Francia es París", cadena=c)
    assert res.es_pertinente is False
    assert res.categoria is None
    assert "tranquilidad" in res.recomendacion


@pytest.mark.parametrize(
    "res",
    [
        an.AnalisisNutricional(es_pertinente=True, categoria=None, recomendacion="r"),
        an.AnalisisNutricional(es_pertinente=False, categoria="deficit_calorico", recomendacion="r"),
        "no es un objeto pydantic",
    ],
)
def test_incoherencia_se_rechaza(res):
    with pytest.raises(an.ErrorClasificacion):
        an.analizar_consulta(OBJ, "Consulta de prueba nutricional", cadena=CadenaFalsa(res))


def test_analisis_imagen_comida_valida_y_guardrail():
    c_comida = CadenaFalsa(
        an.AnalisisNutricional(
            es_pertinente=True,
            categoria="aumento_masa_muscular",
            calorias_estimadas=610,
            carbohidratos_g=55,
            proteinas_g=45,
            grasas_g=18,
            recomendacion="Plato rico en proteína y carbohidratos complejos.",
        )
    )
    res_ok = an.analizar_imagen_comida(OBJ, b"fake_jpeg_bytes", "image/jpeg", "Almuerzo", cadena_vision=c_comida)
    assert res_ok.es_pertinente is True
    assert res_ok.calorias_estimadas == 610

    c_no_comida = CadenaFalsa(
        an.AnalisisNutricional(
            es_pertinente=False,
            categoria=None,
            recomendacion="Parece que la imagen no es comida; sube un plato cuando gustes.",
        )
    )
    res_guardrail = an.analizar_imagen_comida(OBJ, b"fake_jpeg_bytes", "image/jpeg", "Auto", cadena_vision=c_no_comida)
    assert res_guardrail.es_pertinente is False


def test_error_429_da_mensaje_claro():
    c = CadenaFalsa(error=RuntimeError("429 RESOURCE_EXHAUSTED"))
    with pytest.raises(an.ErrorClasificacion, match="límite del plan gratuito"):
        an.analizar_consulta(OBJ, "Consulta nutricional válida", cadena=c)

