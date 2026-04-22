-- Clinic Appointment Scheduling Database
-- DBMS Mini Project

-- Create Database
CREATE DATABASE IF NOT EXISTS clinic_appointments;
USE clinic_appointments;

-- ============================================
-- Table: Doctors
-- ============================================
CREATE TABLE IF NOT EXISTS doctors (
    doctor_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    consultation_duration INT DEFAULT 30, -- in minutes
    available_from TIME NOT NULL DEFAULT '09:00:00',
    available_to TIME NOT NULL DEFAULT '17:00:00',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- Table: Patients
-- ============================================
CREATE TABLE IF NOT EXISTS patients (
    patient_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    date_of_birth DATE NOT NULL,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- Table: Appointments
-- ============================================
CREATE TABLE IF NOT EXISTS appointments (
    appointment_id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    patient_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    
    -- Index for faster conflict detection queries
    INDEX idx_doctor_date (doctor_id, appointment_date),
    INDEX idx_appointment_date (appointment_date),
    INDEX idx_status (status)
);

-- ============================================
-- Table: Time Slots (for available slot generation)
-- ============================================
CREATE TABLE IF NOT EXISTS time_slots (
    slot_id INT AUTO_INCREMENT PRIMARY KEY,
    slot_time TIME NOT NULL UNIQUE
);

-- ============================================
-- Stored Procedure: Check Time Conflicts
-- ============================================
DELIMITER //

CREATE PROCEDURE CheckAppointmentConflict(
    IN p_doctor_id INT,
    IN p_appointment_date DATE,
    IN p_start_time TIME,
    IN p_end_time TIME,
    IN p_exclude_appointment_id INT,
    OUT p_has_conflict BOOLEAN,
    OUT p_conflict_message VARCHAR(255)
)
BEGIN
    DECLARE conflict_count INT DEFAULT 0;
    
    -- Check for overlapping appointments
    SELECT COUNT(*) INTO conflict_count
    FROM appointments
    WHERE doctor_id = p_doctor_id
    AND appointment_date = p_appointment_date
    AND status != 'cancelled'
    AND start_time < p_end_time
    AND end_time > p_start_time
    AND (p_exclude_appointment_id IS NULL OR appointment_id != p_exclude_appointment_id);
    
    IF conflict_count > 0 THEN
        SET p_has_conflict = TRUE;
        SET p_conflict_message = CONCAT('Time conflict detected! There are ', conflict_count, ' existing appointment(s) during this time slot.');
    ELSE
        SET p_has_conflict = FALSE;
        SET p_conflict_message = 'No conflicts found. Appointment can be scheduled.';
    END IF;
END //

DELIMITER ;

-- ============================================
-- Stored Procedure: Get Available Time Slots
-- ============================================
DELIMITER //

CREATE PROCEDURE GetAvailableSlots(
    IN p_doctor_id INT,
    IN p_appointment_date DATE
)
BEGIN
    DECLARE v_available_from TIME;
    DECLARE v_available_to TIME;
    DECLARE v_duration INT;
    
    -- Get doctor's working hours
    SELECT available_from, available_to, consultation_duration
    INTO v_available_from, v_available_to, v_duration
    FROM doctors
    WHERE doctor_id = p_doctor_id;
    
    -- Generate available slots
    SELECT 
        ts.slot_time AS start_time,
        ADDTIME(ts.slot_time, SEC_TO_TIME(v_duration * 60)) AS end_time
    FROM time_slots ts
    WHERE ts.slot_time >= v_available_from
    AND ADDTIME(ts.slot_time, SEC_TO_TIME(v_duration * 60)) <= v_available_to
    AND NOT EXISTS (
        SELECT 1 
        FROM appointments a
        WHERE a.doctor_id = p_doctor_id
        AND a.appointment_date = p_appointment_date
        AND a.status != 'cancelled'
        AND a.start_time = ts.slot_time
    )
    ORDER BY ts.slot_time;
END //

DELIMITER ;

-- ============================================
-- Trigger: Prevent Double Booking on INSERT
-- ============================================
DELIMITER //

CREATE TRIGGER before_appointment_insert
BEFORE INSERT ON appointments
FOR EACH ROW
BEGIN
    DECLARE conflict_count INT;
    
    SELECT COUNT(*) INTO conflict_count
    FROM appointments
    WHERE doctor_id = NEW.doctor_id
    AND appointment_date = NEW.appointment_date
    AND status != 'cancelled'
    AND start_time < NEW.end_time
    AND end_time > NEW.start_time;
    
    IF conflict_count > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot schedule appointment: Time slot conflicts with existing appointment';
    END IF;
END //

DELIMITER ;

-- ============================================
-- Trigger: Prevent Double Booking on UPDATE
-- ============================================
DELIMITER //

CREATE TRIGGER before_appointment_update
BEFORE UPDATE ON appointments
FOR EACH ROW
BEGIN
    DECLARE conflict_count INT;
    
    -- Only check if date or time is being changed
    IF NEW.appointment_date != OLD.appointment_date 
       OR NEW.start_time != OLD.start_time 
       OR NEW.end_time != OLD.end_time THEN
        
        SELECT COUNT(*) INTO conflict_count
        FROM appointments
        WHERE doctor_id = NEW.doctor_id
        AND appointment_date = NEW.appointment_date
        AND status != 'cancelled'
        AND appointment_id != NEW.appointment_id
        AND start_time < NEW.end_time
        AND end_time > NEW.start_time;
        
        IF conflict_count > 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot update appointment: New time slot conflicts with existing appointment';
        END IF;
    END IF;
END //

DELIMITER ;

-- ============================================
-- Sample Data: Time Slots (every 30 minutes from 09:00 to 17:00)
-- ============================================
INSERT INTO time_slots (slot_time) VALUES
('09:00:00'), ('09:30:00'), ('10:00:00'), ('10:30:00'),
('11:00:00'), ('11:30:00'), ('12:00:00'), ('12:30:00'),
('13:00:00'), ('13:30:00'), ('14:00:00'), ('14:30:00'),
('15:00:00'), ('15:30:00'), ('16:00:00'), ('16:30:00');

-- ============================================
-- Sample Data: Doctors
-- ============================================
INSERT INTO doctors (name, specialization, email, phone, consultation_duration, available_from, available_to) VALUES
('Dr. Sarah Johnson', 'Cardiologist', 'sarah.johnson@clinic.com', '+1-555-0101', 30, '09:00:00', '17:00:00'),
('Dr. Michael Chen', 'Dermatologist', 'michael.chen@clinic.com', '+1-555-0102', 20, '10:00:00', '16:00:00'),
('Dr. Emily Williams', 'Pediatrician', 'emily.williams@clinic.com', '+1-555-0103', 30, '09:00:00', '15:00:00'),
('Dr. Robert Martinez', 'Orthopedic', 'robert.martinez@clinic.com', '+1-555-0104', 45, '11:00:00', '18:00:00'),
('Dr. Lisa Anderson', 'General Physician', 'lisa.anderson@clinic.com', '+1-555-0105', 20, '09:00:00', '17:00:00');

-- ============================================
-- Sample Data: Patients
-- ============================================
INSERT INTO patients (name, email, phone, date_of_birth, address) VALUES
('John Smith', 'john.smith@email.com', '+1-555-0201', '1985-03-15', '123 Main St, Springfield'),
('Emma Davis', 'emma.davis@email.com', '+1-555-0202', '1990-07-22', '456 Oak Ave, Riverside'),
('James Wilson', 'james.wilson@email.com', '+1-555-0203', '1978-11-08', '789 Pine Rd, Lakewood'),
('Olivia Brown', 'olivia.brown@email.com', '+1-555-0204', '1995-01-30', '321 Elm St, Hillside'),
('William Taylor', 'william.taylor@email.com', '+1-555-0205', '1982-06-12', '654 Maple Dr, Greenville'),
('Sophia Martinez', 'sophia.martinez@email.com', '+1-555-0206', '1988-09-25', '987 Cedar Ln, Fairview'),
('Daniel Lee', 'daniel.lee@email.com', '+1-555-0207', '1992-04-18', '147 Birch Way, Sunset'),
('Ava Garcia', 'ava.garcia@email.com', '+1-555-0208', '1987-12-03', '258 Spruce Ct, Meadow');

-- ============================================
-- Sample Data: Appointments (Non-conflicting)
-- ============================================
INSERT INTO appointments (doctor_id, patient_id, appointment_date, start_time, end_time, status, notes) VALUES
(1, 1, '2026-04-27', '10:00:00', '10:30:00', 'scheduled', 'Regular checkup'),
(1, 2, '2026-04-27', '11:00:00', '11:30:00', 'scheduled', 'Follow-up visit'),
(2, 3, '2026-04-27', '10:00:00', '10:20:00', 'scheduled', 'Skin consultation'),
(3, 4, '2026-04-27', '09:00:00', '09:30:00', 'scheduled', 'Vaccination'),
(3, 5, '2026-04-27', '10:00:00', '10:30:00', 'scheduled', 'Annual physical'),
(4, 6, '2026-04-28', '11:00:00', '11:45:00', 'scheduled', 'Joint pain consultation'),
(5, 7, '2026-04-28', '09:00:00', '09:20:00', 'scheduled', 'General checkup'),
(5, 8, '2026-04-28', '10:00:00', '10:20:00', 'scheduled', 'Flu symptoms');

-- ============================================
-- Sample Data: Appointments with intentional conflicts (for testing)
-- These are marked as cancelled so they don't trigger the trigger
-- ============================================
INSERT INTO appointments (doctor_id, patient_id, appointment_date, start_time, end_time, status, notes) VALUES
(1, 3, '2026-04-27', '14:00:00', '14:30:00', 'cancelled', 'Cancelled - patient request'),
(2, 5, '2026-04-27', '13:00:00', '13:20:00', 'cancelled', 'Cancelled - rescheduled');

-- ============================================
-- Useful Views
-- ============================================

-- View: Today's Appointments
CREATE OR REPLACE VIEW v_today_appointments AS
SELECT 
    a.appointment_id,
    d.name AS doctor_name,
    d.specialization,
    p.name AS patient_name,
    p.phone AS patient_phone,
    a.appointment_date,
    a.start_time,
    a.end_time,
    a.status,
    a.notes
FROM appointments a
JOIN doctors d ON a.doctor_id = d.doctor_id
JOIN patients p ON a.patient_id = p.patient_id
WHERE a.appointment_date = CURDATE()
ORDER BY a.start_time;

-- View: Doctor Schedule with Patient Details
CREATE OR REPLACE VIEW v_doctor_schedule AS
SELECT 
    a.appointment_id,
    d.doctor_id,
    d.name AS doctor_name,
    d.specialization,
    p.name AS patient_name,
    p.email AS patient_email,
    p.phone AS patient_phone,
    a.appointment_date,
    a.start_time,
    a.end_time,
    a.status,
    a.notes
FROM appointments a
JOIN doctors d ON a.doctor_id = d.doctor_id
JOIN patients p ON a.patient_id = p.patient_id
WHERE a.status != 'cancelled'
ORDER BY a.appointment_date, a.start_time;

-- ============================================
-- Example Queries for Testing
-- ============================================

-- Query 1: Check for conflicts before booking (example)
-- CALL CheckAppointmentConflict(1, '2026-04-27', '10:00:00', '10:30:00', NULL, @has_conflict, @message);
-- SELECT @has_conflict, @message;

-- Query 2: Get available slots for a doctor on a specific date
-- CALL GetAvailableSlots(1, '2026-04-27');

-- Query 3: View today's appointments
-- SELECT * FROM v_today_appointments;

-- Query 4: Get doctor's full schedule
-- SELECT * FROM v_doctor_schedule WHERE doctor_id = 1;

-- Query 5: Find all appointments for a specific date
-- SELECT * FROM appointments WHERE appointment_date = '2026-04-27';

-- ============================================
-- Verification Queries
-- ============================================
SELECT 'Database Setup Complete!' AS status;
SELECT COUNT(*) AS total_doctors FROM doctors;
SELECT COUNT(*) AS total_patients FROM patients;
SELECT COUNT(*) AS total_appointments FROM appointments;
SELECT COUNT(*) AS total_time_slots FROM time_slots;
