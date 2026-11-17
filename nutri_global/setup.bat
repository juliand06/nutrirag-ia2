@echo off
REM Crea el entorno virtual e instala dependencias (Windows).
python -m venv .venv
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements-dev.txt
echo Listo. Ejecuta: streamlit run app.py

