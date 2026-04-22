const express = require('express');
const router = express.Router();

// Helper function to check for time conflicts
const checkTimeConflict = (db, doctorId, appointmentDate, startTime, endTime, excludeAppointmentId = null) => {
    return new Promise((resolve, reject) => {
        let query = `
            SELECT 
                appointment_id,
                start_time,
                end_time,
                CONCAT('Appointment at ', start_time, ' - ', end_time) as conflict_details
            FROM appointments 
            WHERE doctor_id = ? 
            AND appointment_date = ?
            AND status != 'cancelled'
            AND start_time < ? 
            AND end_time > ?
        `;
        
        const params = [doctorId, appointmentDate, startTime, endTime];
        
        if (excludeAppointmentId) {
            query += ' AND appointment_id != ?';
            params.push(excludeAppointmentId);
        }
        
        db.query(query, params, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
};

// Helper function to format time
const formatTime = (time) => {
    if (time instanceof Date) {
        return time.toTimeString().split(' ')[0];
    }
    return time;
};

// Factory function to create routes with db instance
const createRoutes = (dbInstance) => {
    const getDb = typeof dbInstance === 'function' ? dbInstance : () => dbInstance;

// ============================================
// GET /api/appointments - Get all appointments
// ============================================
router.get('/', (req, res) => {
    const db = getDb();
    if (!db) {
        return res.status(400).json({
            success: false,
            message: 'Database not connected. Please connect first.'
        });
    }

    const { doctor_id, date, status } = req.query;
    
    let query = `
        SELECT 
            a.*,
            d.name as doctor_name,
            d.specialization,
            p.name as patient_name,
            p.email as patient_email,
            p.phone as patient_phone
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.doctor_id
        JOIN patients p ON a.patient_id = p.patient_id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (doctor_id) {
        query += ' AND a.doctor_id = ?';
        params.push(doctor_id);
    }
    
    if (date) {
        query += ' AND a.appointment_date = ?';
        params.push(date);
    }
    
    if (status) {
        query += ' AND a.status = ?';
        params.push(status);
    }
    
    query += ' ORDER BY a.appointment_date DESC, a.start_time ASC';
    
    db.query(query, params, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error fetching appointments',
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
// GET /api/appointments/:id - Get single appointment
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
        SELECT 
            a.*,
            d.name as doctor_name,
            d.specialization,
            p.name as patient_name,
            p.email as patient_email,
            p.phone as patient_phone
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.doctor_id
        JOIN patients p ON a.patient_id = p.patient_id
        WHERE a.appointment_id = ?
    `;
    
    db.query(query, [req.params.id], (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error fetching appointment',
                error: err.message
            });
        }
        
        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }
        
        res.json({
            success: true,
            data: results[0]
        });
    });
});

// ============================================
// GET /api/appointments/available/:doctorId/:date - Get available time slots
// ============================================
router.get('/available/:doctorId/:date', (req, res) => {
    const db = getDb();
    if (!db) {
        return res.status(400).json({
            success: false,
            message: 'Database not connected. Please connect first.'
        });
    }

    const { doctorId, date } = req.params;
    
    const query = `
        CALL GetAvailableSlots(?, ?)
    `;
    
    db.query(query, [doctorId, date], (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error fetching available slots',
                error: err.message
            });
        }
        
        res.json({
            success: true,
            doctor_id: doctorId,
            date: date,
            available_slots: results[0]
        });
    });
});

// ============================================
// POST /api/appointments - Book new appointment
// ============================================
router.post('/', async (req, res) => {
    const db = getDb();
    if (!db) {
        return res.status(400).json({
            success: false,
            message: 'Database not connected. Please connect first.'
        });
    }

    const { doctor_id, patient_id, appointment_date, start_time, end_time, notes } = req.body;
    
    // Validation
    if (!doctor_id || !patient_id || !appointment_date || !start_time || !end_time) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields'
        });
    }
    
    try {
        // Check for time conflicts
        const conflicts = await checkTimeConflict(db, doctor_id, appointment_date, start_time, end_time);
        
        if (conflicts.length > 0) {
            return res.status(409).json({
                success: false,
                conflict: true,
                message: 'Time conflict detected! The selected time slot overlaps with existing appointment(s).',
                conflicts: conflicts
            });
        }
        
        // Insert appointment
        const query = `
            INSERT INTO appointments (doctor_id, patient_id, appointment_date, start_time, end_time, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        db.query(query, [doctor_id, patient_id, appointment_date, start_time, end_time, notes || ''], (err, result) => {
            if (err) {
                // Check if it's a duplicate entry error from trigger
                if (err.code === 'ER_SIGNAL_EXCEPTION') {
                    return res.status(409).json({
                        success: false,
                        conflict: true,
                        message: err.message
                    });
                }
                
                return res.status(500).json({
                    success: false,
                    message: 'Error booking appointment',
                    error: err.message
                });
            }
            
            res.status(201).json({
                success: true,
                message: 'Appointment booked successfully',
                data: {
                    appointment_id: result.insertId,
                    doctor_id,
                    patient_id,
                    appointment_date,
                    start_time,
                    end_time,
                    notes
                }
            });
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error checking appointment conflicts',
            error: error.message
        });
    }
});

// ============================================
// PUT /api/appointments/:id - Update appointment
// ============================================
router.put('/:id', async (req, res) => {
    const db = getDb();
    if (!db) {
        return res.status(400).json({
            success: false,
            message: 'Database not connected. Please connect first.'
        });
    }

    const { doctor_id, patient_id, appointment_date, start_time, end_time, status, notes } = req.body;
    const appointmentId = req.params.id;
    
    // Validation
    if (!appointment_date || !start_time || !end_time) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields'
        });
    }
    
    try {
        // Check for time conflicts (excluding current appointment)
        const conflicts = await checkTimeConflict(
            db,
            doctor_id, 
            appointment_date, 
            start_time, 
            end_time, 
            appointmentId
        );
        
        if (conflicts.length > 0) {
            return res.status(409).json({
                success: false,
                conflict: true,
                message: 'Time conflict detected! The new time slot overlaps with existing appointment(s).',
                conflicts: conflicts
            });
        }
        
        // Update appointment
        const query = `
            UPDATE appointments 
            SET doctor_id = ?,
                patient_id = ?,
                appointment_date = ?,
                start_time = ?,
                end_time = ?,
                status = ?,
                notes = ?
            WHERE appointment_id = ?
        `;
        
        db.query(query, [
            doctor_id,
            patient_id,
            appointment_date,
            start_time,
            end_time,
            status || 'scheduled',
            notes || '',
            appointmentId
        ], (err, result) => {
            if (err) {
                // Check if it's a conflict error from trigger
                if (err.code === 'ER_SIGNAL_EXCEPTION') {
                    return res.status(409).json({
                        success: false,
                        conflict: true,
                        message: err.message
                    });
                }
                
                return res.status(500).json({
                    success: false,
                    message: 'Error updating appointment',
                    error: err.message
                });
            }
            
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Appointment not found'
                });
            }
            
            res.json({
                success: true,
                message: 'Appointment updated successfully',
                data: {
                    appointment_id: appointmentId,
                    doctor_id,
                    patient_id,
                    appointment_date,
                    start_time,
                    end_time,
                    status,
                    notes
                }
            });
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error checking appointment conflicts',
            error: error.message
        });
    }
});

// ============================================
// DELETE /api/appointments/:id - Cancel appointment
// ============================================
router.delete('/:id', (req, res) => {
    const db = getDb();
    if (!db) {
        return res.status(400).json({
            success: false,
            message: 'Database not connected. Please connect first.'
        });
    }

    const appointmentId = req.params.id;
    
    // Instead of deleting, we cancel the appointment
    const query = `
        UPDATE appointments 
        SET status = 'cancelled'
        WHERE appointment_id = ? AND status != 'cancelled'
    `;
    
    db.query(query, [appointmentId], (err, result) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error cancelling appointment',
                error: err.message
            });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found or already cancelled'
            });
        }
        
        res.json({
            success: true,
            message: 'Appointment cancelled successfully'
        });
    });
});

// ============================================
// GET /api/appointments/stats - Get appointment statistics
// ============================================
router.get('/stats', (req, res) => {
    const db = getDb();
    if (!db) {
        return res.status(400).json({
            success: false,
            message: 'Database not connected. Please connect first.'
        });
    }

    const query = `
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
        FROM appointments
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error fetching statistics',
                error: err.message
            });
        }
        
        res.json({
            success: true,
            data: results[0]
        });
    });
});

return router;
};

module.exports = createRoutes;
