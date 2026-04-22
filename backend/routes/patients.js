const express = require('express');
const router = express.Router();

const createRoutes = (dbInstance) => {
    const getDb = typeof dbInstance === 'function' ? dbInstance : () => dbInstance;

// ============================================
// GET /api/patients - Get all patients
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
            patient_id,
            name,
            email,
            phone,
            date_of_birth,
            address
        FROM patients
        ORDER BY name
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error fetching patients',
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
// GET /api/patients/:id - Get single patient
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
        SELECT * FROM patients WHERE patient_id = ?
    `;
    
    db.query(query, [req.params.id], (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error fetching patient',
                error: err.message
            });
        }
        
        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }
        
        res.json({
            success: true,
            data: results[0]
        });
    });
});

// ============================================
// POST /api/patients - Register new patient
// ============================================
router.post('/', (req, res) => {
    const db = getDb();
    if (!db) {
        return res.status(400).json({
            success: false,
            message: 'Database not connected. Please connect first.'
        });
    }

    const { name, email, phone, date_of_birth, address } = req.body;
    
    // Validation
    if (!name || !email || !phone || !date_of_birth) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields: name, email, phone, date_of_birth'
        });
    }
    
    const query = `
        INSERT INTO patients (name, email, phone, date_of_birth, address)
        VALUES (?, ?, ?, ?, ?)
    `;
    
    db.query(query, [name, email, phone, date_of_birth, address || ''], (err, result) => {
        if (err) {
            // Check for duplicate email
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    success: false,
                    message: 'A patient with this email already exists'
                });
            }
            
            return res.status(500).json({
                success: false,
                message: 'Error registering patient',
                error: err.message
            });
        }
        
        res.status(201).json({
            success: true,
            message: 'Patient registered successfully',
            data: {
                patient_id: result.insertId,
                name,
                email,
                phone,
                date_of_birth,
                address
            }
        });
    });
});

// ============================================
// PUT /api/patients/:id - Update patient
// ============================================
router.put('/:id', (req, res) => {
    const db = getDb();
    if (!db) {
        return res.status(400).json({
            success: false,
            message: 'Database not connected. Please connect first.'
        });
    }

    const { name, email, phone, date_of_birth, address } = req.body;
    const patientId = req.params.id;
    
    const query = `
        UPDATE patients 
        SET name = ?,
            email = ?,
            phone = ?,
            date_of_birth = ?,
            address = ?
        WHERE patient_id = ?
    `;
    
    db.query(query, [name, email, phone, date_of_birth, address, patientId], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    success: false,
                    message: 'This email is already in use'
                });
            }
            
            return res.status(500).json({
                success: false,
                message: 'Error updating patient',
                error: err.message
            });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Patient updated successfully'
        });
    });
});

return router;
};

module.exports = createRoutes;
