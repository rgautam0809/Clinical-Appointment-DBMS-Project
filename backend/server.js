const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Global database pool (will be initialized from frontend)
let db = null;
let dbConnected = false;

// Database connection endpoint - called from frontend modal
app.post('/api/connect', (req, res) => {
    const { host, user, password, database, port } = req.body;
    
    console.log('Attempting to connect to database...');
    console.log('Host:', host);
    console.log('User:', user);
    console.log('Database:', database);
    
    // Close existing connection if any
    if (db) {
        db.end();
    }
    
    // Create new connection pool
    db = mysql.createPool({
        host: host || 'localhost',
        user: user || 'root',
        password: password || '',
        database: database || 'clinic_appointments',
        port: port || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
    
    // Test connection
    db.getConnection((err, connection) => {
        if (err) {
            console.error('❌ Database connection failed:', err.message);
            dbConnected = false;
            return res.status(400).json({
                success: false,
                message: 'Connection failed: ' + err.message
            });
        } else {
            console.log('✅ Database connected successfully');
            dbConnected = true;
            connection.release();
            
            // Initialize routes with db instance
            initializeRoutes();
            
            res.json({
                success: true,
                message: 'Database connected successfully!',
                database: database
            });
        }
    });
});

// Check database connection status
app.get('/api/connection-status', (req, res) => {
    res.json({
        connected: dbConnected,
        message: dbConnected ? 'Database is connected' : 'Database is not connected'
    });
});

// Test database connection
app.get('/api/test-connection', (req, res) => {
    if (!db) {
        return res.json({
            success: false,
            message: 'No database connection configured'
        });
    }
    
    db.query('SELECT 1 as test', (err, results) => {
        if (err) {
            return res.json({
                success: false,
                message: 'Connection test failed: ' + err.message
            });
        }
        res.json({
            success: true,
            message: 'Database connection is working!'
        });
    });
});

// Function to initialize routes after database connection
let routesInitialized = false;
function initializeRoutes() {
    if (routesInitialized) return;
    
    // Import Routes - pass db instance to avoid circular dependency
    const appointmentRoutes = require('./routes/appointments')(db);
    const doctorRoutes = require('./routes/doctors')(db);
    const patientRoutes = require('./routes/patients')(db);
    
    // Use Routes
    app.use('/api/appointments', appointmentRoutes);
    app.use('/api/doctors', doctorRoutes);
    app.use('/api/patients', patientRoutes);
    
    routesInitialized = true;
    console.log('✅ API routes initialized');
}

// Root route - serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : null
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📍 API Base URL: http://localhost:${PORT}/api`);
    console.log(`🌐 Frontend: http://localhost:${PORT}\n`);
});

module.exports = { app, db };
