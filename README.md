# Bitácora de Estrategias de Opciones

Esta aplicación web permite registrar operaciones de opciones, las clasifica por estrategia, calcula el riesgo/beneficio máximo y permite la entrada de operaciones complejas multi-leg.

## Características

- **Constructor de Estrategias Dinámico:** Interfaz para construir operaciones "leg" por "leg".
- **Reconocimiento Automático de Estrategias:** El backend identifica estrategias comunes (Long Call, Iron Condor, etc.) o las marca como "Personalizada".
- **Cálculo de Riesgo/Beneficio:** Estimación inicial de Máximo Riesgo y Máximo Beneficio para las estrategias reconocidas.
- **Almacenamiento de Datos:** Guarda las operaciones, incluyendo detalles de cada leg y notas del usuario.
- **Carga de Imágenes:** Permite adjuntar imágenes (gráficos, perfiles de riesgo) a cada operación.
- **Visualización Mejorada:**
    - **Tema Oscuro Moderno y Dinámico:** Interfaz con un diseño profesional oscuro, efectos de relieve, colores neón sutiles en elementos clave y animaciones para una experiencia más fluida.
    - **Panel Lateral de Navegación:** Permite filtrar estrategias por mes de vencimiento con retroalimentación visual mejorada.
    - **Vista Detallada Interactiva:** Detalles de estrategias expandibles con transiciones suaves.
    - **Calendario Personalizado:** Selector de fecha de vencimiento mejorado y temático (Flatpickr).
    - **Notificaciones Pop-up Interactivas:** Confirmaciones de guardado y errores con animaciones (incluyendo "destellos" para éxito).
    - **Gestión de Operaciones:**
        - **Creación:** Entrada detallada de operaciones multi-leg.
        - **Edición:** Permite modificar todos los aspectos de una operación guardada (incluyendo legs e imágenes).
        - **Cierre de Operaciones:** Permite marcar operaciones como "Cerrada", registrando el P/L real, fecha de cierre y notas de cierre. La interfaz se actualiza para reflejar este estado.
        - **Eliminación:** Permite eliminar registros de estrategias con confirmación (incluyendo la eliminación de imágenes asociadas del servidor).
    - **Visualización de Imágenes Mejorada:** Las imágenes adjuntas se muestran en un modal (pop-up) dentro de la página en lugar de abrir en una nueva pestaña.
    - **Visualización Agrupada:** Muestra las estrategias guardadas, agrupadas por mes de vencimiento, con animaciones de carga.


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
├── static/                   # Archivos estáticos (CSS, JS)
│   ├── css/style.css
│   ├── js/main.js
│   └── uploads/              # Directorio para imágenes cargadas por el usuario (DENTRO de static)
└── templates/                # Plantillas HTML (index.html)
    └── index.html
```

holamundo