# Registro de pruebas de aceptación — NutriGlobal RAG & Vision (IA2)

Basado en el formato de `tribuna_global`, ampliado con la verificación de la **Arquitectura RAG**, el **Guardrail Tranquilo Nutricional** y el **Análisis Multimodal de Imágenes de Comidas**.

| # | Caso | Entrada o acción | Resultado esperado | Cobertura automática | Resultado observado | ¿Coincide? / Explicación |
|---|------|------------------|--------------------|----------------------|---------------------|--------------------------|
| 1 | Consulta de calorías (RAG) | «¿Cuántas calorías y carbohidratos tiene mi desayuno de avena?» | Respuesta con kcal, gramos de carbohidratos y cita a Documento/Página | `test_resultado_valido_con_calorias_y_carbohidratos` + Manual | | |
| 2 | Control de carbohidratos | «Salmón al horno con quinua y brócoli» | Categoría `control_carbohidratos` con cita al PDF indexado | Manual | | |
| 3 | Aumento de masa muscular | «200g de pechuga de pollo con arroz post-entreno» | Categoría `aumento_masa_muscular` | Manual | | |
| 4 | Bienestar e hidratación | «¿Cuánta agua debo tomar al día y qué cenar ligero?» | Categoría `bienestar_general` con cita a Página 3 | Manual | | |
| 5 | Análisis de imagen de comida | Subir foto de plato saludable (pollo, arroz y aguacate) | Devuelve calorías totales, carbohidratos (g), proteínas (g), grasas (g) y consejo | `test_analisis_imagen_comida_valida_y_guardrail` + Manual | | |
| 6 | Guardrail en texto ajeno | «¿Quién ganó la Champions ayer?» o «La capital de Francia es París» | `es_pertinente=False`; responde con tranquilidad invitando a preguntar sobre nutrición; NO se guarda | `test_guardrail_tranquilo_cuando_no_es_pertinente` | | |
| 7 | Guardrail en imagen no alimenticia | Subir foto de un automóvil o captura de error de código | `es_pertinente=False`; responde con tranquilidad pidiendo subir la foto de un plato | `test_analisis_imagen_comida_valida_y_guardrail` | | |
| 8 | Indexación PDF y borrado temporal | Subir PDF nutricional en sección «Indexar expedientes PDF» | Se extraen fragmentos con página/sección, se generan embeddings y `temp_pdf_eliminado=True` | `test_indexacion_pdf_elimina_copia_temporal_y_recupera_citas` | | |
| 9 | Entrada vacía o muy corta | Espacios en blanco o menos de 5 caracteres | No se llama al modelo ni se guarda | `test_entrada_invalida_no_llama_al_modelo` | | |
| 10 | Persistencia y no duplicados | Guardar, reintentar con mismo UUID y reiniciar la app | Se conserva en `consultas.json` sin duplicarse | `test_persistencia_atomica_y_no_duplicados` | | |
| 11 | Archivo JSON dañado | JSON inválido en `datos/consultas.json` | Error visible y archivo original conservado sin sobrescribir | `test_json_invalido_se_conserva` | | |
| 12 | Límite 429 del plan gratuito | Simular error `429 RESOURCE_EXHAUSTED` | Mensaje claro indicando esperar y pulsar «Reintentar» | `test_error_429_da_mensaje_claro` | | |

