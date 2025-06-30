import os
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from dotenv import load_dotenv

load_dotenv()

# Ensure the instance folder exists as early as possible
# This is useful for flask cli commands like 'flask db migrate'
# Determine the root path of the application
project_root_path = os.path.dirname(os.path.abspath(__file__))
instance_path = os.path.join(project_root_path, 'instance')
try:
    os.makedirs(instance_path, exist_ok=True)
except OSError as e:
    print(f"Error creating instance folder: {e}") # Should not happen with exist_ok=True

app = Flask(__name__, instance_path=instance_path, instance_relative_config=True)

# Construct the absolute path for the database
db_path = os.path.join(instance_path, "options_log.sqlite3")
db_uri = f'sqlite:///{db_path}'

app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your_default_secret_key_12345!') # Add a default for safety
app.config['SQLALCHEMY_DATABASE_URI'] = db_uri # Directly use the absolute path
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# Correct UPLOAD_FOLDER to be inside 'static'
app.config['UPLOAD_FOLDER'] = os.path.join(project_root_path, 'static', 'uploads')

# Ensure the static folder exists (Flask usually handles this, but good for uploads subfolder)
static_path = os.path.join(project_root_path, 'static')
try:
    os.makedirs(static_path, exist_ok=True)
except OSError as e:
    print(f"Error creating static folder: {e}")

# Ensure the upload folder (static/uploads) exists
try:
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
except OSError as e:
    print(f"Error creating upload folder: {e}")


db = SQLAlchemy(app)
migrate = Migrate(app, db)

# --- Database Models ---
class Trade(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ticker = db.Column(db.String(20), nullable=False)
    entry_date = db.Column(db.DateTime, nullable=False, default=db.func.current_timestamp())
    notes = db.Column(db.Text, nullable=True)
    detected_strategy = db.Column(db.String(100), nullable=True)
    max_risk = db.Column(db.Float, nullable=True)
    max_profit = db.Column(db.Float, nullable=True)

    legs = db.relationship('Leg', backref='trade', lazy='joined', cascade="all, delete-orphan")
    images = db.relationship('Image', backref='trade', lazy='joined', cascade="all, delete-orphan")

    # New fields for closing trades
    status = db.Column(db.String(20), default='Abierta', nullable=False) # e.g., "Abierta", "Cerrada"
    closing_date = db.Column(db.DateTime, nullable=True)
    actual_pl = db.Column(db.Float, nullable=True)
    closing_notes = db.Column(db.Text, nullable=True)
    tags = db.Column(db.String(250), nullable=True) # Nuevo campo para etiquetas

    def to_dict(self):
        primary_exp_str = None
        if self.legs:
            valid_exp_dates = [leg.expiration_date for leg in self.legs if leg and leg.expiration_date]
            if valid_exp_dates:
                primary_exp_str = min(valid_exp_dates).isoformat()

        return {
            'id': self.id,
            'ticker': self.ticker,
            'entry_date': self.entry_date.isoformat() if self.entry_date else None,
            'notes': self.notes,
            'detected_strategy': self.detected_strategy,
            'max_risk': self.max_risk,
            'max_profit': self.max_profit,
            'legs': [leg.to_dict() for leg in self.legs],
            'images': [img.to_dict() for img in self.images],
            'primary_expiration_date_str': primary_exp_str,
            # Add new fields to serialization
            'status': self.status,
            'closing_date': self.closing_date.isoformat() if self.closing_date else None,
            'actual_pl': self.actual_pl,
            'closing_notes': self.closing_notes,
            'tags': self.tags # Añadir tags a la serialización
        }

    def __repr__(self):
        return f"<Trade {self.id} - {self.ticker} - {self.detected_strategy}>"

class Leg(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    trade_id = db.Column(db.Integer, db.ForeignKey('trade.id'), nullable=False)
    action = db.Column(db.String(10), nullable=False)  # 'BUY' or 'SELL'
    quantity = db.Column(db.Integer, nullable=False)
    option_type = db.Column(db.String(10), nullable=False)  # 'CALL' or 'PUT'
    expiration_date = db.Column(db.Date, nullable=False)
    strike = db.Column(db.Float, nullable=False)
    premium = db.Column(db.Float, nullable=False) # Price per contract

    def to_dict(self): # Ensure this method is correctly defined or updated if it exists
        return {
            'id': self.id,
            'action': self.action,
            'quantity': self.quantity,
            'option_type': self.option_type,
            'expiration_date': self.expiration_date.isoformat() if self.expiration_date else None,
            'strike': self.strike,
            'premium': self.premium
        }

    def __repr__(self):
        return f"<Leg {self.id} - {self.action} {self.quantity} {self.option_type} @ {self.strike} for {self.premium}>"

class Image(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    trade_id = db.Column(db.Integer, db.ForeignKey('trade.id'), nullable=False)
    filename = db.Column(db.String(200), nullable=False)
    # filepath = db.Column(db.String(300), nullable=False) # Storing full path might be redundant if UPLOAD_FOLDER is fixed

    def to_dict(self):
        image_url = ''
        try:
            image_url = url_for('static', filename=f'uploads/{self.filename}')
        except RuntimeError:
            image_url = f"/static/uploads/{self.filename}" # Fallback
        return {
            'id': self.id,
            'trade_id': self.trade_id,
            'filename': self.filename,
            'url': image_url
        }

    def __repr__(self):
        return f"<Image {self.id} - {self.filename}>"


import os
from flask import Flask, jsonify, request, render_template, redirect, url_for, flash
from werkzeug.utils import secure_filename
from datetime import datetime, date

from strategy_recognizer import recognize_strategy
from risk_calculator import calculate_max_risk_profit


# --- Routes ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/get_strategies')
def get_strategies():
    try:
        trades = Trade.query.order_by(Trade.entry_date.desc()).all()
        strategies_data = []
        for trade in trades:
            try:
                strategies_data.append(trade.to_dict())
            except Exception as e_serialize:
                print(f"Error serializing trade ID {trade.id}: {e_serialize}")
                # Decide si continuar o fallar todo. Por ahora, omitimos el trade problemático.
                # Alternativamente, podrías añadir un placeholder o un mensaje de error para ese trade.
        return jsonify(success=True, strategies=strategies_data)
    except Exception as e_query:
        print(f"CRITICAL Error fetching or processing strategies: {e_query}")
        import traceback
        traceback.print_exc() # Print full traceback to Flask console
        return jsonify(success=False, message=f"Error crítico al obtener estrategias: {str(e_query)}"), 500

@app.route('/api/hello') # Keep a distinct API endpoint if needed
def hello_api():
    return jsonify(message="Welcome to the Options Strategy Logger API!")

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/save_strategy', methods=['POST'])
def save_strategy():
    if request.method == 'POST':
        try:
            data = request.form
            files = request.files

            ticker = data.get('ticker')
            # Entry date is complex due to HTML input type text for datetime-local like format
            entry_date_str = data.get('entryDate')
            if entry_date_str:
                try:
                    # Attempt to parse ISO 8601 format (common from JS or datetime-local)
                    entry_date_obj = datetime.fromisoformat(entry_date_str)
                except ValueError:
                    # Fallback for other potential simple date formats if necessary, or handle error
                    flash('Formato de Fecha de Entrada inválido.', 'error')
                    # return redirect(url_for('index')) # Or return error JSON
                    return jsonify(success=False, message="Formato de Fecha de Entrada inválido."), 400
            else:
                entry_date_obj = datetime.utcnow() # Default if not provided, though it's readonly in form

            market_vision = data.get('marketVision')

            print("--- Received Strategy Data ---")
            print(f"Ticker: {ticker}")
            print(f"Entry Date: {entry_date_obj}")
            print(f"Market Vision: {market_vision}")

            legs_data = []
            leg_index = 0
            while True:
                action_key = f'legs[{leg_index}][action]'
                if action_key not in data:
                    break # No more legs

                action = data.get(action_key)
                quantity_str = data.get(f'legs[{leg_index}][quantity]')
                option_type = data.get(f'legs[{leg_index}][option_type]')
                expiration_date_str = data.get(f'legs[{leg_index}][expirationDate]')
                strike_str = data.get(f'legs[{leg_index}][strike]')
                premium_str = data.get(f'legs[{leg_index}][premium]')

                # Basic validation and type conversion
                if not all([action, quantity_str, option_type, expiration_date_str, strike_str, premium_str]):
                    flash(f'Datos incompletos para el Leg {leg_index + 1}.', 'error')
                    # return redirect(url_for('index'))
                    return jsonify(success=False, message=f'Datos incompletos para el Leg {leg_index + 1}.'), 400

                try:
                    quantity = int(quantity_str)
                    strike = float(strike_str)
                    premium = float(premium_str)
                    # Python's date.fromisoformat expects YYYY-MM-DD
                    expiration_date_obj = date.fromisoformat(expiration_date_str)
                except ValueError as e:
                    flash(f'Error en los datos numéricos o de fecha para el Leg {leg_index + 1}: {e}', 'error')
                    # return redirect(url_for('index'))
                    return jsonify(success=False, message=f'Error en los datos numéricos o de fecha para el Leg {leg_index + 1}.'), 400


                leg = {
                    'action': action,
                    'quantity': quantity,
                    'option_type': option_type,
                    'expiration_date': expiration_date_obj,
                    'strike': strike,
                    'premium': premium
                }
                legs_data.append(leg)
                print(f"  Leg {leg_index + 1}: {leg}")
                leg_index += 1

            if not legs_data:
                # flash('Debe añadir al menos un leg a la estrategia.', 'error')
                # return redirect(url_for('index'))
                return jsonify(success=False, message='Debe añadir al menos un leg a la estrategia.'), 400


            uploaded_filenames = []
            if 'images[]' in files:
                image_files = files.getlist('images[]')
                for file in image_files:
                    if file and file.filename and allowed_file(file.filename):
                        filename = secure_filename(file.filename)
                        # For now, just print. Saving will be handled in the DB step.
                        print(f"  Uploaded Image (to be saved): {filename}")
                        uploaded_filenames.append(filename)
                    elif file and file.filename and not allowed_file(file.filename):
                        print(f"  Skipped Image (invalid type): {file.filename}")


            # 1. Recognize Strategy
            detected_strategy_name = recognize_strategy(legs_data)
            print(f"Detected Strategy: {detected_strategy_name}")

            # 2. Calculate Risk/Profit
            risk_profit_profile = calculate_max_risk_profit(detected_strategy_name, legs_data)
            max_risk = risk_profit_profile.get('max_risk')
            max_profit = risk_profit_profile.get('max_profit')
            print(f"Max Risk: {max_risk}, Max Profit: {max_profit}")

            # 3. Save Trade object with its Legs and Images to DB
            new_trade = Trade(
                ticker=ticker,
                entry_date=entry_date_obj,
                notes=market_vision,
                detected_strategy=detected_strategy_name,
                max_risk=max_risk,
                max_profit=max_profit,
                tags=data.get('tags') # Nuevo campo tags
            )
            db.session.add(new_trade)
            # We need to flush to get new_trade.id for foreign keys if not using cascades properly before commit
            # However, with backref and cascade, appending to new_trade.legs should work before final commit.

            for leg_info in legs_data:
                new_leg = Leg(
                    trade=new_trade, # Association via backref
                    action=leg_info['action'],
                    quantity=leg_info['quantity'],
                    option_type=leg_info['option_type'],
                    expiration_date=leg_info['expiration_date'],
                    strike=leg_info['strike'],
                    premium=leg_info['premium']
                )
                # db.session.add(new_leg) # Not strictly necessary if added via new_trade.legs and cascade is set
                new_trade.legs.append(new_leg)

            # Handle image uploads
            saved_image_filenames = []
            if 'images[]' in files:
                image_files = files.getlist('images[]')
                for file in image_files:
                    if file and file.filename and allowed_file(file.filename):
                        filename = secure_filename(file.filename)
                        # Create a unique filename to avoid overwrites, e.g., by prefixing with timestamp or UUID
                        # For now, using original secure_filename. Consider uniqueness for production.
                        # Example: unique_filename = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}_{filename}"
                        save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                        file.save(save_path)

                        new_image = Image(
                            trade=new_trade,
                            filename=filename
                        )
                        new_trade.images.append(new_image)
                        saved_image_filenames.append(filename)

            db.session.commit()
            flash('Estrategia guardada exitosamente!', 'success')

            return jsonify(success=True,
                           message="Estrategia guardada exitosamente!",
                           trade_id=new_trade.id,
                           detected_strategy=detected_strategy_name,
                           max_risk=max_risk,
                           max_profit=max_profit)

        except Exception as e:
            db.session.rollback() # Rollback in case of error during DB operations
            print(f"Error processing request: {e}")
            flash(f'Error al procesar la solicitud: {str(e)}', 'error')
            # For API, JSON response is better than redirect
            return jsonify(success=False, message=f"Error interno del servidor: {str(e)}"), 500

    return jsonify(success=False, message="Método no permitido."), 405

@app.route('/api/delete_strategy/<int:trade_id>', methods=['DELETE'])
def delete_strategy(trade_id):
    try:
        trade_to_delete = Trade.query.get(trade_id)
        if not trade_to_delete:
            return jsonify(success=False, message="Estrategia no encontrada."), 404

        # Delete associated image files from server
        for image in trade_to_delete.images:
            try:
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], image.filename)
                if os.path.exists(filepath):
                    os.remove(filepath)
                    print(f"Deleted image file: {filepath}")
                else:
                    print(f"Image file not found, skipping deletion: {filepath}")
            except Exception as e:
                print(f"Error deleting image file {image.filename}: {e}")
                # Decide if this error should prevent trade deletion or just be logged
                # For now, we'll log and continue with trade deletion from DB

        db.session.delete(trade_to_delete)
        db.session.commit()

        # flash('Estrategia eliminada exitosamente.', 'success') # Not very useful for API
        return jsonify(success=True, message="Estrategia eliminada exitosamente.")

    except Exception as e:
        db.session.rollback()
        print(f"Error deleting strategy: {e}")
        # flash(f'Error al eliminar la estrategia: {str(e)}', 'error')
        return jsonify(success=False, message=f"Error interno del servidor al eliminar: {str(e)}"), 500

@app.route('/api/update_strategy/<int:trade_id>', methods=['PUT'])
def update_strategy(trade_id):
    try:
        trade_to_update = Trade.query.get(trade_id)
        if not trade_to_update:
            return jsonify(success=False, message="Estrategia no encontrada para actualizar."), 404

        data = request.form
        files = request.files

        # Actualizar campos escalares del Trade
        trade_to_update.ticker = data.get('ticker', trade_to_update.ticker)
        entry_date_str = data.get('entryDate')
        if entry_date_str:
            try:
                trade_to_update.entry_date = datetime.fromisoformat(entry_date_str)
            except ValueError:
                return jsonify(success=False, message="Formato de Fecha de Entrada inválido para actualizar."), 400
        trade_to_update.notes = data.get('marketVision', trade_to_update.notes)

        # Actualizar estado y campos de cierre
        new_status = data.get('status')
        if new_status:
            if new_status == 'Abierta':
                trade_to_update.status = 'Abierta'
                trade_to_update.actual_pl = None
                trade_to_update.closing_date = None
                trade_to_update.closing_notes = None
            elif new_status == 'Cerrada':
                trade_to_update.status = 'Cerrada'
                actual_pl_str = data.get('actual_pl')
                closing_date_str = data.get('closing_date_str') # Expecting YYYY-MM-DD
                closing_notes_val = data.get('closing_notes', trade_to_update.closing_notes) # Keep old if not provided

                if actual_pl_str is None or actual_pl_str == '': # P/L es obligatorio para cerrar
                    return jsonify(success=False, message="El P/L real es obligatorio si se establece el estado a 'Cerrada'."), 400
                try:
                    trade_to_update.actual_pl = float(actual_pl_str)
                except ValueError:
                    return jsonify(success=False, message="El P/L real debe ser un número."), 400

                if closing_date_str:
                    try:
                        trade_to_update.closing_date = datetime.strptime(closing_date_str, '%Y-%m-%d').date()
                    except ValueError:
                        return jsonify(success=False, message="Formato de fecha de cierre inválido. Usar YYYY-MM-DD."), 400
                elif not trade_to_update.closing_date: # Si no se provee y no había una antes, default a hoy
                    trade_to_update.closing_date = datetime.utcnow().date()

                trade_to_update.closing_notes = closing_notes_val
            else:
                return jsonify(success=False, message="Estado no válido."), 400
        elif trade_to_update.status == 'Cerrada': # Si no se envía status, pero está cerrada, permitir actualizar P/L, fecha, notas
            if data.get('actual_pl') is not None and data.get('actual_pl') != '':
                try:
                    trade_to_update.actual_pl = float(data.get('actual_pl'))
                except ValueError:
                    return jsonify(success=False, message="El P/L real debe ser un número."), 400
            if data.get('closing_date_str'):
                try:
                    trade_to_update.closing_date = datetime.strptime(data.get('closing_date_str'), '%Y-%m-%d').date()
                except ValueError:
                    return jsonify(success=False, message="Formato de fecha de cierre inválido. Usar YYYY-MM-DD."), 400
            if data.get('closing_notes') is not None: # Allow empty string for notes
                 trade_to_update.closing_notes = data.get('closing_notes')

        # Actualizar tags
        trade_to_update.tags = data.get('tags', trade_to_update.tags) # Usar valor existente si no se provee


        # Manejo de Legs: Eliminar los antiguos y crear nuevos
        # Solo si se envían nuevos legs, si no, mantener los existentes.
        # Para saber si se envían nuevos legs, podemos chequear la presencia de 'legs[0][action]'
        if 'legs[0][action]' in data:
            # Eliminar legs existentes
            for leg in trade_to_update.legs:
                db.session.delete(leg)
            trade_to_update.legs = [] # Limpiar la colección en el objeto

            new_legs_data = [] # Para recalcular estrategia y riesgo
            leg_index = 0
            while True:
                action_key = f'legs[{leg_index}][action]'
                if action_key not in data: # Esto terminará el bucle si no hay más legs enviados
                    break

                # Si llegamos aquí, es porque 'legs[0][action]' existía, así que esperamos un conjunto completo de legs.
                # Si un leg intermedio falta, el `data.get` devolverá None y la validación de abajo fallará.
                action = data.get(action_key)
                quantity_str = data.get(f'legs[{leg_index}][quantity]')
                option_type = data.get(f'legs[{leg_index}][option_type]')
                expiration_date_str = data.get(f'legs[{leg_index}][expirationDate]')
                strike_str = data.get(f'legs[{leg_index}][strike]')
                premium_str = data.get(f'legs[{leg_index}][premium]')

                if not all([action, quantity_str, option_type, expiration_date_str, strike_str, premium_str]):
                    # Si se envían legs (ej. legs[0][action] está presente) pero un leg está incompleto, es un error.
                    return jsonify(success=False, message=f'Datos incompletos para el Leg {leg_index + 1} en actualización.'), 400

                try:
                    quantity = int(quantity_str)
                    strike = float(strike_str)
                    premium = float(premium_str)
                    expiration_date_obj = date.fromisoformat(expiration_date_str)
                except ValueError as e:
                    return jsonify(success=False, message=f'Error en datos para Leg {leg_index + 1} en actualización: {e}'), 400

                new_leg_obj_data = {
                    'action': action, 'quantity': quantity, 'option_type': option_type,
                    'expiration_date': expiration_date_obj, 'strike': strike, 'premium': premium
                }
                new_legs_data.append(new_leg_obj_data)

                leg_to_add = Leg(
                    action=action, quantity=quantity, option_type=option_type,
                    expiration_date=expiration_date_obj, strike=strike, premium=premium,
                    trade_id=trade_to_update.id
                )
                trade_to_update.legs.append(leg_to_add)
                leg_index += 1

            if not new_legs_data and 'legs[0][action]' in data : # Si se intentó enviar legs pero resultaron vacíos (error)
                 return jsonify(success=False, message='Si se envían legs para actualizar, al menos uno debe ser válido.'), 400

            if new_legs_data: # Solo recalcular si efectivamente se procesaron nuevos legs
                trade_to_update.detected_strategy = recognize_strategy(new_legs_data)
                risk_profit_profile = calculate_max_risk_profit(trade_to_update.detected_strategy, new_legs_data)
                trade_to_update.max_risk = risk_profit_profile.get('max_risk')
                trade_to_update.max_profit = risk_profit_profile.get('max_profit')
        # else: (si no 'legs[0][action]' in data)
            # No se enviaron legs, por lo tanto, los legs existentes,
            # la estrategia detectada y el riesgo/beneficio no se modifican.

        # Manejo de Imágenes: Añadir nuevas imágenes, las existentes se mantienen.
        # La eliminación granular de imágenes no se implementa en este paso.
        if 'images[]' in files:
            image_files = files.getlist('images[]')
            for file in image_files:
                if file and file.filename and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                    file.save(save_path)
                    new_image = Image(filename=filename, trade_id=trade_to_update.id)
                    trade_to_update.images.append(new_image)

        db.session.commit()
        return jsonify(success=True, message="Estrategia actualizada exitosamente.", strategy=trade_to_update.to_dict())

    except Exception as e:
        db.session.rollback()
        print(f"Error updating strategy: {e}")
        return jsonify(success=False, message=f"Error interno del servidor al actualizar: {str(e)}"), 500

@app.route('/api/trade/<int:trade_id>/close', methods=['POST'])
def close_trade(trade_id):
    try:
        trade_to_close = Trade.query.get(trade_id)
        if not trade_to_close:
            return jsonify(success=False, message="Operación no encontrada."), 404

        if trade_to_close.status == 'Cerrada':
            return jsonify(success=False, message="Esta operación ya está cerrada."), 400

        data = request.get_json()
        if not data:
            return jsonify(success=False, message="No se recibieron datos para cerrar la operación."), 400

        actual_pl_str = data.get('actual_pl')
        closing_date_str = data.get('closing_date_str') # Expecting YYYY-MM-DD from flatpickr
        closing_notes = data.get('closing_notes', '')

        if actual_pl_str is None: # P/L es obligatorio para cerrar
            return jsonify(success=False, message="El P/L real es obligatorio para cerrar la operación."), 400

        try:
            actual_pl = float(actual_pl_str)
        except ValueError:
            return jsonify(success=False, message="El P/L real debe ser un número."), 400

        closing_date_obj = None
        if closing_date_str:
            try:
                closing_date_obj = datetime.strptime(closing_date_str, '%Y-%m-%d').date()
                # Si quieres guardar hora también, y el input es datetime:
                # closing_date_obj = datetime.fromisoformat(closing_date_str)
            except ValueError:
                return jsonify(success=False, message="Formato de fecha de cierre inválido. Usar YYYY-MM-DD."), 400
        else:
            closing_date_obj = datetime.utcnow().date() # Default to today (date part only)
            # Si quieres guardar hora también: closing_date_obj = datetime.utcnow()


        trade_to_close.status = 'Cerrada'
        trade_to_close.actual_pl = actual_pl
        trade_to_close.closing_date = closing_date_obj
        trade_to_close.closing_notes = closing_notes

        db.session.commit()
        return jsonify(success=True, message="Operación cerrada exitosamente.", strategy=trade_to_close.to_dict())

    except Exception as e:
        db.session.rollback()
        print(f"Error closing trade: {e}")
        return jsonify(success=False, message=f"Error interno del servidor al cerrar la operación: {str(e)}"), 500


# --- App Initialization ---
if __name__ == '__main__':
    # Ensure the instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass # Already exists

    # Ensure the upload folder exists
    upload_folder_path = os.path.join(app.root_path, app.config['UPLOAD_FOLDER'])
    try:
        os.makedirs(upload_folder_path)
    except OSError:
        pass # Already exists

    app.run()
