const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');

// Load env variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Global DB
let db = null;
let dbConnected = false;

// ================= DB CONNECT =================
app.post('/api/connect', (req, res) => {
    const { host, user, password, database, port } = req.body;

    console.log('🔌 Connecting to DB...');

    if (db) db.end();

    db = mysql.createPool({
        host: host || 'localhost',
        user: user || 'root',
        password: password || '',
        database: database || 'clinic_appointments',
        port: port || 3306,
        waitForConnections: true,
        connectionLimit: 10
    });

    db.getConnection((err, connection) => {
        if (err) {
            console.error('❌ DB connection failed:', err.message);
            dbConnected = false;

            return res.status(400).json({
                success: false,
                message: err.message
            });
        }

        connection.release();
        dbConnected = true;

        console.log('✅ DB Connected');

        res.json({
            success: true,
            message: 'Database connected successfully'
        });
    });
});

// ================= ROUTES =================

// pass a function so routes always get latest db
const getDb = () => db;

// import routes
const appointmentRoutes = require('./routes/appointments')(getDb);
const doctorRoutes = require('./routes/doctors')(getDb);
const patientRoutes = require('./routes/patients')(getDb);

// use routes (ALWAYS available now ✅)
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', patientRoutes);

// ================= UTIL APIs =================

app.get('/api/connection-status', (req, res) => {
    res.json({
        connected: dbConnected
    });
});

app.get('/api/test-connection', (req, res) => {
    if (!db) {
        return res.json({
            success: false,
            message: 'DB not connected'
        });
    }

    db.query('SELECT 1', (err) => {
        if (err) {
            return res.json({
                success: false,
                message: err.message
            });
        }

        res.json({
            success: true,
            message: 'DB working'
        });
    });
});

// ================= FRONTEND =================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ================= HEALTH =================

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK' });
});

// ================= ERROR HANDLING =================

app.use((err, req, res, next) => {
    console.error('🔥 Error:', err.message);

    res.status(500).json({
        success: false,
        message: err.message
    });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// ================= START SERVER =================

app.listen(PORT, () => {
    console.log(`\n🚀 Server running at http://localhost:${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api\n`);
});