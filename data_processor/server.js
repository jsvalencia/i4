const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // 1. Importa el paquete cors

const app = express();
const port = process.env.PORT || 3001; // Render asignará process.env.PORT

// Middleware
app.use(cors()); // 2. Usa el middleware cors. Esto permitirá todas las solicitudes de origen cruzado.
app.use(bodyParser.json());

// Almacenamiento en memoria para los datos (para simplificar)
let receivedDataStore = [];
let processedDataSummary = {
    totalMessages: 0,
    averageTemperature: 0,
    temperatures: [],
    averageVibration: 0,
    vibrations: [],
    statusCounts: {
        NORMAL: 0,
        WARNING: 0,
        ERROR: 0
    },
    lastReceivedData: null,
    sensorActivity: {} // Para rastrear la actividad por sensor
};

app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`
        <html>
            <head>
                <title>Data Processor - I4.0 Demo</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; background-color: #f4f4f4; color: #333; }
                    .container { max-width: 800px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                    h1 { color: #0056b3; }
                    p { font-size: 1.1em; }
                    ul { list-style-type: none; padding: 0; }
                    li { background-color: #fff; margin-bottom: 10px; padding: 10px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
                    code { background-color: #e9ecef; padding: 2px 4px; border-radius: 3px;}
                    a { color: #007bff; text-decoration: none; }
                    a:hover { text-decoration: underline; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Bienvenido al Servicio de Procesamiento de Datos Industria 4.0</h1>
                    <p>Este servicio recibe, procesa y resume datos de sensores simulados, demostrando un flujo de datos básico en un contexto de Industria 4.0.</p>
                    <p><strong>Endpoints disponibles:</strong></p>
                    <ul>
                        <li><code>POST /api/data</code>: Para enviar nuevos datos de sensores.</li>
                        <li><code>GET /dashboard</code>: Para ver un panel de control simple con los datos procesados (HTML, se actualiza automáticamente).</li>
                        <li><code>GET /api/summary</code>: Para ver un resumen de los datos procesados (JSON).</li>
                        <li><code>GET /api/alldata</code>: Para ver todos los datos crudos recibidos (JSON, para depuración).</li>
                    </ul>
                    <p>Este proyecto utiliza dos contenedores Docker: uno para recolectar datos de sensores (<code>sensor_collector</code>) y este para procesarlos (<code>data_processor</code>).</p>
                </div>
            </body>
        </html>
    `);
});

// Endpoint para recibir datos del recolector de sensores
app.post('/api/data', (req, res) => {
    const data = req.body;
    console.log('Received data:', data);

    if (!data || typeof data.temperature === 'undefined' || typeof data.vibration === 'undefined' || typeof data.status === 'undefined' || !data.sensor_id) {
        return res.status(400).json({ error: 'Invalid data format, missing required fields (sensor_id, temperature, vibration, status).' });
    }

    receivedDataStore.push(data);

    // Procesamiento de datos
    processedDataSummary.totalMessages += 1;
    
    processedDataSummary.temperatures.push(data.temperature);
    const sumTemp = processedDataSummary.temperatures.reduce((acc, temp) => acc + temp, 0);
    processedDataSummary.averageTemperature = parseFloat((sumTemp / processedDataSummary.temperatures.length).toFixed(2));

    processedDataSummary.vibrations.push(data.vibration);
    const sumVib = processedDataSummary.vibrations.reduce((acc, vib) => acc + vib, 0);
    processedDataSummary.averageVibration = parseFloat((sumVib / processedDataSummary.vibrations.length).toFixed(3));

    if (processedDataSummary.statusCounts[data.status.toUpperCase()] !== undefined) {
        processedDataSummary.statusCounts[data.status.toUpperCase()]++;
    }
    processedDataSummary.lastReceivedData = data;

    // Rastrear actividad por sensor
    if (!processedDataSummary.sensorActivity[data.sensor_id]) {
        processedDataSummary.sensorActivity[data.sensor_id] = { count: 0, last_status: null };
    }
    processedDataSummary.sensorActivity[data.sensor_id].count++;
    processedDataSummary.sensorActivity[data.sensor_id].last_status = data.status;


    // console.log('Current data store size:', receivedDataStore.length);
    // console.log('Current summary:', processedDataSummary);

    res.status(201).json({ message: 'Data received and processed successfully', received_data: data });
});

// Endpoint para obtener un resumen de los datos procesados en JSON
app.get('/api/summary', (req, res) => {
    res.status(200).json({
        message: "Data summary",
        summary: processedDataSummary,
    });
});

// Endpoint para un dashboard HTML simple
app.get('/dashboard', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    let lastDataHtml = '<li>No data received yet.</li>';
    if (processedDataSummary.lastReceivedData) {
        const ld = processedDataSummary.lastReceivedData;
        lastDataHtml = `
            <li><strong>Sensor ID:</strong> ${ld.sensor_id}</li>
            <li><strong>Temperatura:</strong> ${ld.temperature}°C</li>
            <li><strong>Humedad:</strong> ${ld.humidity}%</li>
            <li><strong>Presión:</strong> ${ld.pressure} hPa</li>
            <li><strong>Vibración:</strong> ${ld.vibration} G</li>
            <li class="status-${ld.status.toLowerCase()}"><strong>Estado:</strong> ${ld.status}</li>
            <li><strong>Timestamp:</strong> ${new Date(ld.timestamp * 1000).toLocaleString()}</li>
        `;
    }

    let sensorActivityHtml = '<li>No activity yet.</li>';
    if (Object.keys(processedDataSummary.sensorActivity).length > 0) {
        sensorActivityHtml = Object.entries(processedDataSummary.sensorActivity)
            .map(([id, activity]) => `<li><strong>${id}:</strong> ${activity.count} lecturas (último estado: <span class="status-${activity.last_status.toLowerCase()}">${activity.last_status}</span>)</li>`)
            .join('');
    }


    res.send(`
        <html>
            <head>
                <title>Dashboard I4.0 - Data Processor</title>
                <meta http-equiv="refresh" content="5"> <!-- Auto-refresh cada 5 segundos -->
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #eef1f5; color: #333; display: flex; flex-direction: column; align-items: center; min-height: 100vh; padding-top: 20px; padding-bottom: 20px;}
                    .dashboard-container { background-color: #fff; padding: 25px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); width: 90%; max-width: 800px; margin-bottom: 20px; }
                    h1 { color: #005a9e; text-align: center; border-bottom: 2px solid #005a9e; padding-bottom: 10px; margin-bottom: 20px; font-size: 1.8em; }
                    h2 { color: #0078d4; margin-top: 25px; border-bottom: 1px solid #eee; padding-bottom: 8px; font-size: 1.4em;}
                    ul { list-style-type: none; padding-left: 0; }
                    li { background-color: #f8f9fa; margin-bottom: 8px; padding: 12px; border-radius: 5px; border-left: 5px solid #0078d4; display: flex; justify-content: space-between; flex-wrap: wrap; }
                    li strong { color: #333; margin-right: 5px; }
                    .status-counts li, .sensor-activity li { border-left-color: #6c757d; }
                    .status-normal { color: #28a745; font-weight: bold; }
                    .status-warning { color: #ffc107; font-weight: bold; }
                    .status-error { color: #dc3545; font-weight: bold; }
                    li.status-normal { border-left-color: #28a745 !important; }
                    li.status-warning { border-left-color: #ffc107 !important; }
                    li.status-error { border-left-color: #dc3545 !important; }
                    .footer { text-align: center; margin-top: 30px; font-size: 0.9em; color: #777; }
                </style>
            </head>
            <body>
                <div class="dashboard-container">
                    <h1>Panel de Control - Simulación Industria 4.0</h1>
                    
                    <h2>Resumen General de Sensores</h2>
                    <ul>
                        <li><strong>Total de Mensajes Recibidos:</strong> ${processedDataSummary.totalMessages}</li>
                        <li><strong>Temperatura Promedio Global:</strong> ${processedDataSummary.averageTemperature.toFixed(2)} °C</li>
                        <li><strong>Nivel de Vibración Promedio Global:</strong> ${processedDataSummary.averageVibration.toFixed(3)} G</li>
                    </ul>

                    <h2>Distribución de Estados Globales</h2>
                    <ul class="status-counts">
                        <li class="status-normal"><strong>NORMAL:</strong> ${processedDataSummary.statusCounts.NORMAL}</li>
                        <li class="status-warning"><strong>WARNING:</strong> ${processedDataSummary.statusCounts.WARNING}</li>
                        <li class="status-error"><strong>ERROR:</strong> ${processedDataSummary.statusCounts.ERROR}</li>
                    </ul>

                    <h2>Últimos Datos Recibidos</h2>
                    <ul>
                        ${lastDataHtml}
                    </ul>

                    <h2>Actividad por Sensor</h2>
                    <ul class="sensor-activity">
                        ${sensorActivityHtml}
                    </ul>
                    <p class="footer">Esta página se actualiza automáticamente cada 5 segundos.<br>unicomfacauca, materia Arquitectura de software</p>
                </div>
            </body>
        </html>
    `);
});

// Endpoint para ver todos los datos crudos (para depuración)
app.get('/api/alldata', (req, res) => {
    res.status(200).json({
        message: "All received data",
        count: receivedDataStore.length,
        data: receivedDataStore.slice(-100) // Devuelve solo los últimos 100 para no sobrecargar
    });
});

app.listen(port, '0.0.0.0', () => { // Escuchar en 0.0.0.0
    console.log(`Data Processor Service listening at http://0.0.0.0:${port}`);
    console.log(`Access the dashboard at http://localhost:${port}/dashboard`); // Este localhost será relativo al entorno de Render
});