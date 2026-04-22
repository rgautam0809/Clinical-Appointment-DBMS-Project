const express = require('express');
const router = express.Router();

const createRoutes = (dbInstance) => {
    const getDb = typeof dbInstance === 'function' ? dbInstance : () => dbInstance;

// ============================================
// GET /api/doctors - Get all doctors
// ============================================
router.get('/', (req, res) => {
    const db = getDb();
    if (!db) {
        return res.status(400).json({
            success: false,
            message: 'Database not connected. Please connect first.'
        });
    }

    const query = `
        SELECT 
            doctor_id,
            name,
            specialization,
            email,
            phone,
            consultation_duration,
            available_from,
            available_to
        FROM doctors
        ORDER BY name
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error fetching doctors',
                error: err.message
            });
        }
        
        res.json({
            success: true,
            count: results.length,
            data: results
        });
    });
});

// ============================================
// GET /api/doctors/:id - Get single doctor
// ============================================
router.get('/:id', (req, res) => {
    const db = getDb();
    if (!db) {
        return res.status(400).json({
            success: false,
            message: 'Database not connected. Please connect first.'
        });
    }

    const query = `
        SELECT * FROM doctors WHERE doctor_id = ?
    `;
    
    db.query(query, [req.params.id], (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error fetching doctor',
                error: err.message
            });
        }
        
        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }
        
        res.json({
            success: true,
            data: results[0]
        });
    });
});

// ============================================
// GET /api/doctors/:id/schedule - Get doctor's schedule
// ============================================
router.get('/:id/schedule', (req, res) => {
    const db = getDb();
    if (!db) {
        return res.status(400).json({
            success: false,
            message: 'Database not connected. Please connect first.'
        });
    }

    const { date } = req.query;
    
    let query = `
        SELECT 
            a.appointment_id,
            a.patient_id,
            p.name as patient_name,
            p.phone as patient_phone,
            a.appointment_date,
            a.start_time,
            a.end_time,
            a.status,
            a.notes
        FROM appointments a
        JOIN patients p ON a.patient_id = p.patient_id
        WHERE a.doctor_id = ?
    `;
    
    const params = [req.params.id];
    
    if (date) {
        query += ' AND a.appointment_date = ?';
        params.push(date);
    }
    
    query += ' AND a.status != "cancelled" ORDER BY a.appointment_date, a.start_time';
    
    db.query(query, params, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error fetching schedule',
                error: err.message
            });
        }
        
        res.json({
            success: true,
            doctor_id: req.params.id,
            count: results.length,
            data: results
        });
    });
});

// ============================================
// GET /api/doctors/:id/availability - Get doctor availability for a date
// ============================================
router.get('/:id/availability', (req, res) => {
    const db = getDb();
    if (!db) {
        return res.status(400).json({
            success: false,
            message: 'Database not connected. Please connect first.'
        });
    }

    const { date } = req.query;
    
    if (!date) {
        return res.status(400).json({
            success: false,
            message: 'Date parameter is required'
        });
    }
    
    const query = `
        CALL GetAvailableSlots(?, ?)
    `;
    
    db.query(query, [req.params.id, date], (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error fetching availability',
                error: err.message
            });
        }
        
        res.json({
            success: true,
            doctor_id: req.params.id,
            date: date,
            available_slots: results[0]
        });
    });
});

return router;
};

module.exports = createRoutes;
