from flask import Flask, request, jsonify
import requests
import time
import random
import os

app = Flask(__name__)

# URL del servicio data_processor, asumirá que está en la misma red Docker
# El nombre 'data_processor_app' viene del container_name en docker-compose.yml
DATA_PROCESSOR_URL = os.environ.get('DATA_PROCESSOR_URL', 'http://data_processor_app:3001/api/data') # Esta URL cambiará en Render

@app.route('/')
def home():
    return "Sensor Collector Service is running. Use POST to /send_data to simulate sending data."

@app.route('/send_data', methods=['POST'])
def send_data():
    """
    Endpoint para recibir una solicitud para generar y enviar datos simulados.
    En un escenario real, este servicio podría estar leyendo de sensores físicos.
    """
    try:
        # Simular datos de sensores
        sensor_id = request.json.get('sensor_id', f"sensor_{random.randint(1, 100)}")
        possible_status = ["NORMAL", "WARNING", "ERROR"]
        
        data = {
            "sensor_id": sensor_id,
            "temperature": round(random.uniform(15.0, 35.0), 2), # Rango un poco más amplio
            "humidity": round(random.uniform(30.0, 70.0), 2),   # Rango un poco más amplio
            "pressure": round(random.uniform(980.0, 1050.0), 2), # Rango un poco más amplio
            "vibration": round(random.uniform(0.0, 5.0), 3),    # Nivel de vibración en G (0 para simular sin vibración a veces)
            "status": random.choice(possible_status),           # Estado del sensor/máquina
            "timestamp": time.time()
        }
        
        app.logger.info(f"Generated data: {data}")

        # Enviar datos al servicio data_processor
        # Usamos el nombre del servicio definido en docker-compose como hostname
        response = requests.post(DATA_PROCESSOR_URL, json=data, timeout=10) # Aumentado timeout
        response.raise_for_status()  # Lanza una excepción para códigos de error HTTP (4xx o 5xx)
        
        app.logger.info(f"Data sent to processor. Response: {response.status_code} - {response.text}")
        return jsonify({"message": "Data sent successfully to processor", "data_sent": data, "processor_response": response.json()}), 200

    except requests.exceptions.Timeout:
        app.logger.error(f"Timeout sending data to processor at {DATA_PROCESSOR_URL}")
        return jsonify({"error": f"Timeout: Failed to send data to processor at {DATA_PROCESSOR_URL}"}), 504
    except requests.exceptions.ConnectionError:
        app.logger.error(f"Connection error sending data to processor at {DATA_PROCESSOR_URL}")
        return jsonify({"error": f"Connection Error: Failed to connect to processor at {DATA_PROCESSOR_URL}. Is it running?"}), 503
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Error sending data to processor: {e}")
        return jsonify({"error": f"Failed to send data to processor: {str(e)}"}), 500
    except Exception as e:
        app.logger.error(f"An unexpected error occurred: {e}")
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

if __name__ == '__main__':
    # Habilitar logs de Flask para verlos en la consola de Docker
    import logging
    logging.basicConfig(level=logging.INFO)
    # Usar el puerto asignado por Render, o 5001 por defecto para local
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False) # debug=False para producción, True para desarrollo