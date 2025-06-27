# Bitácora de Estrategias de Opciones

Esta aplicación web permite registrar operaciones de opciones, las clasifica por estrategia, calcula el riesgo/beneficio máximo y permite la entrada de operaciones complejas multi-leg.

## Características

- **Constructor de Estrategias Dinámico:** Interfaz para construir operaciones "leg" por "leg".
- **Reconocimiento Automático de Estrategias:** El backend identifica estrategias comunes (Long Call, Iron Condor, etc.) o las marca como "Personalizada".
- **Cálculo de Riesgo/Beneficio:** Estimación inicial de Máximo Riesgo y Máximo Beneficio para las estrategias reconocidas.
- **Almacenamiento de Datos:** Guarda las operaciones, incluyendo detalles de cada leg y notas del usuario.
- **Carga de Imágenes:** Permite adjuntar imágenes (gráficos, perfiles de riesgo) a cada operación.
- **Visualización Agrupada:** Muestra las estrategias guardadas, agrupadas por mes de vencimiento, con detalles expandibles.

## Tecnologías Utilizadas

- **Backend:** Python (Flask)
  - Flask-SQLAlchemy: ORM para interacción con la base de datos.
  - Flask-Migrate: Para manejo de migraciones de esquema de base de datos.
- **Base de Datos:** SQLite (simple, basada en archivos)
- **Frontend:** HTML, CSS, Vanilla JavaScript
- **Reconocimiento de Estrategias y Cálculo de Riesgo:** Lógica personalizada en Python.

## Configuración y Ejecución del Proyecto

### Prerrequisitos

- Python 3.8+
- pip (manejador de paquetes de Python)

### Pasos de Configuración

1.  **Clonar el Repositorio (si aplica):**
    ```bash
    # git clone <repository-url>
    # cd <repository-name>
    ```

2.  **Crear un Entorno Virtual (Recomendado):**
    ```bash
    python -m venv venv
    ```
    Activarlo:
    - En macOS/Linux: `source venv/bin/activate`
    - En Windows: `venv\\Scripts\\activate`

3.  **Instalar Dependencias:**
    El archivo `requirements.txt` no ha sido generado aún en este proyecto. Las dependencias principales son:
    ```bash
    pip install Flask Flask-SQLAlchemy Flask-Migrate python-dotenv
    ```
    (Nota: Se generará un `requirements.txt` antes del submit final).

4.  **Variables de Entorno:**
    El archivo `.flaskenv` ya está configurado con valores por defecto:
    ```
    FLASK_APP=app.py
    FLASK_DEBUG=True
    DATABASE_URL=sqlite:///instance/options_log.sqlite3
    ```
    No se requieren cambios para la ejecución básica. La `SECRET_KEY` se genera dinámicamente en `app.py` si no está presente, pero para producción se debería setear una fija.

5.  **Inicializar la Base de Datos:**
    Las carpetas `instance/` y `uploads/` se crean automáticamente al iniciar la aplicación o ejecutar comandos de Flask.
    Los siguientes comandos de Flask inicializan y actualizan la base de datos según las migraciones:
    ```bash
    flask db init  # Solo si la carpeta 'migrations' no existe (ya debería existir)
    flask db migrate -m "Initial setup" # Si hay cambios en modelos y no hay script de migración
    flask db upgrade # Aplica las migraciones a la base de datos
    ```
    Para este proyecto, las migraciones ya están configuradas. Si es la primera vez, `flask db upgrade` creará el archivo `instance/options_log.sqlite3`.

### Ejecutar la Aplicación

Una vez configurado el entorno y la base de datos:
```bash
flask run
```
La aplicación estará disponible en `http://127.0.0.1:5000` por defecto.

## Estructura del Proyecto (Simplificada)

```
/
├── app.py                    # Lógica principal de Flask, modelos, rutas API
├── strategy_recognizer.py    # Motor de reconocimiento de estrategias
├── risk_calculator.py        # Calculadora de riesgo/beneficio
├── .flaskenv                 # Variables de entorno para Flask
├── requirements.txt          # (Se generará) Dependencias de Python
├── migrations/               # Archivos de Flask-Migrate para la base de datos
├── instance/                 # Contiene la base de datos SQLite (options_log.sqlite3)
│   └── options_log.sqlite3
├── static/                   # Archivos estáticos (CSS, JS, imágenes subidas)
│   ├── css/style.css
│   ├── js/main.js
│   └── uploads/              # Directorio para imágenes cargadas por el usuario
└── templates/                # Plantillas HTML (index.html)
    └── index.html
```

holamundo