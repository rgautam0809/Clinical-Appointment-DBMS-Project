# 🏥 Clinic Appointment Scheduling System - DBMS Mini Project

A comprehensive database management system for clinic appointment scheduling with **advanced time conflict detection** and a modern web interface.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [Installation](#-installation)
- [Usage](#-usage)
- [Time Conflict Detection](#-time-conflict-detection)
- [API Endpoints](#-api-endpoints)
- [Testing Conflict Scenarios](#-testing-conflict-scenarios)
- [Troubleshooting](#-troubleshooting)
- [Future Enhancements](#-future-enhancements)

---

## ✨ Features

### Core Functionality
- ✅ **Book Appointments** - Schedule appointments with doctors
- ✅ **View Appointments** - See all appointments with filtering options
- ✅ **Update Appointments** - Modify date, time, and status
- ✅ **Cancel Appointments** - Cancel appointments (soft delete)
- ✅ **Patient Registration** - Register new patients on-the-fly

### ⚡ Time Conflict Detection (Main Focus)
- ✅ **Database Triggers** - Automatic prevention of double booking at database level
- ✅ **Stored Procedures** - Check time slot overlaps before booking
- ✅ **Backend Validation** - API-level conflict checking
- ✅ **Frontend Alerts** - Real-time conflict notifications
- ✅ **Available Slot Generation** - Only show available time slots
- ✅ **Update Conflict Prevention** - Prevent conflicts when rescheduling

### Additional Features
- 📊 Appointment statistics dashboard
- 🔍 Advanced filtering (by doctor, date, status)
- 📱 Responsive web design
- 🎨 Modern UI with visual status indicators
- ⚠️ Comprehensive error handling

---

## 🛠 Tech Stack

### Database
- **MySQL** - Relational database management
- **Stored Procedures** - Business logic at database level
- **Triggers** - Automatic conflict prevention
- **Views** - Predefined query templates

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **mysql2** - MySQL driver with promise support
- **CORS** - Cross-origin resource sharing

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling with animations
- **JavaScript (ES6+)** - Dynamic functionality
- **Fetch API** - HTTP requests

---

## 📁 Project Structure

```
DBMS-Project/
├── database/
│   └── schema.sql                    # Complete database schema
├── backend/
│   ├── package.json                  # Node.js dependencies
│   ├── server.js                     # Express server setup
│   └── routes/
│       ├── appointments.js           # Appointment CRUD + conflict detection
│       ├── doctors.js                # Doctor management
│       └── patients.js               # Patient management
├── frontend/
│   ├── index.html                # Main web interface
│   │── style.css                 # Complete styling
│   └── app.js                    # Frontend logic & API integration
└── README.md                         # This file
```

---

## 🗄 Database Schema

### Tables

#### 1. **doctors**
Stores doctor information and availability
- `doctor_id` (PK)
- `name`, `specialization`, `email`, `phone`
- `consultation_duration` (in minutes)
- `available_from`, `available_to` (working hours)

#### 2. **patients**
Stores patient information
- `patient_id` (PK)
- `name`, `email`, `phone`, `date_of_birth`, `address`

#### 3. **appointments**
Stores appointment records
- `appointment_id` (PK)
- `doctor_id` (FK), `patient_id` (FK)
- `appointment_date`, `start_time`, `end_time`
- `status` (scheduled/completed/cancelled)
- `notes`

#### 4. **time_slots**
Predefined time slots for scheduling
- `slot_id` (PK)
- `slot_time` (every 30 minutes from 09:00 to 17:00)

### Database Objects

**Stored Procedures:**
- `CheckAppointmentConflict()` - Detects time conflicts
- `GetAvailableSlots()` - Returns available time slots for a doctor

**Triggers:**
- `before_appointment_insert` - Prevents double booking on INSERT
- `before_appointment_update` - Prevents double booking on UPDATE

**Views:**
- `v_today_appointments` - Today's scheduled appointments
- `v_doctor_schedule` - Complete doctor schedules with patient details

---

## 📥 Installation

### Prerequisites
- MySQL Server (v5.7 or higher)
- Node.js (v14 or higher)
- Web browser (Chrome, Firefox, Edge)

### Step 1: Setup Database

Open your terminal and run:

```bash
# Login to MySQL
mysql -u root -p

# Execute the schema file
source database/schema.sql
```

**Verify installation:**
```sql
USE clinic_appointments;
SHOW TABLES;
SELECT COUNT(*) FROM doctors;
SELECT COUNT(*) FROM patients;
```

### Step 2: Setup Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install
```

### Step 3: Start the Application

```bash
# Start the server
cd backend; npm start

# Server will run on http://localhost:3000
```

You should see:
```
✅ Database connected successfully
🚀 Server running on http://localhost:3000
📍 API Base URL: http://localhost:3000/api
🌐 Frontend: http://localhost:3000
```

### Step 4: Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 🚀 Usage

### Booking an Appointment

1. Click "Book Appointment" tab
2. Select a doctor from dropdown
3. Choose an appointment date
4. Select from available time slots (automatically filtered)
5. Select or register a patient
6. Add notes (optional)
7. Click "Book Appointment"

### Viewing Appointments

1. Click "View Appointments" tab
2. Use filters to narrow down:
   - Filter by Doctor
   - Filter by Date
   - Filter by Status
3. Click "Clear Filters" to reset

### Updating an Appointment

1. Go to "View Appointments" tab
2. Click "Update" button on any appointment
3. Modify date, time, or status in the modal
4. System will check for conflicts automatically
5. Click "Update Appointment" to save

### Cancelling an Appointment

1. Go to "View Appointments" tab
2. Click "Cancel" button on any appointment
3. Confirm the cancellation
4. Appointment status changes to "cancelled" (not deleted)

---

## ⚡ Time Conflict Detection

This is the **main focus** of the project. The system implements **multi-layered** conflict detection:

### Layer 1: Database Triggers

**Before INSERT Trigger:**
```sql
CREATE TRIGGER before_appointment_insert
BEFORE INSERT ON appointments
FOR EACH ROW
BEGIN
    -- Checks for overlapping times
    -- Signals error if conflict detected
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Cannot schedule appointment: Time slot conflicts';
END;
```

**Before UPDATE Trigger:**
```sql
CREATE TRIGGER before_appointment_update
BEFORE UPDATE ON appointments
FOR EACH ROW
BEGIN
    -- Checks if new time conflicts with existing appointments
    -- Excludes the current appointment being updated
END;
```

### Layer 2: Stored Procedures

**CheckAppointmentConflict:**
```sql
CALL CheckAppointmentConflict(
    doctor_id,
    appointment_date,
    start_time,
    end_time,
    exclude_id,
    @has_conflict,
    @message
);
```

**GetAvailableSlots:**
```sql
CALL GetAvailableSlots(doctor_id, date);
-- Returns only time slots that don't have conflicts
```

### Layer 3: Backend Validation

```javascript
const checkTimeConflict = async (doctorId, date, startTime, endTime) => {
    const query = `
        SELECT * FROM appointments 
        WHERE doctor_id = ? 
        AND appointment_date = ?
        AND status != 'cancelled'
        AND start_time < ? AND end_time > ?
    `;
    // Returns conflicts if any exist
};
```

### Layer 4: Frontend Prevention

- Only shows available time slots in dropdown
- Real-time conflict alerts
- Visual feedback when no slots available

### Conflict Detection Logic

Two appointments conflict if:
```sql
-- Overlap condition:
start_time_1 < end_time_2 AND end_time_1 > start_time_2
```

This handles:
- Complete overlap
- Partial overlap
- Adjacent appointments (allowed)

---

## 🔌 API Endpoints

### Appointments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/appointments` | Get all appointments (with filters) |
| GET | `/api/appointments/:id` | Get single appointment |
| POST | `/api/appointments` | Book new appointment |
| PUT | `/api/appointments/:id` | Update appointment |
| DELETE | `/api/appointments/:id` | Cancel appointment |
| GET | `/api/appointments/available/:doctorId/:date` | Get available slots |
| GET | `/api/appointments/stats` | Get appointment statistics |

### Doctors

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/doctors` | Get all doctors |
| GET | `/api/doctors/:id` | Get single doctor |
| GET | `/api/doctors/:id/schedule` | Get doctor's schedule |
| GET | `/api/doctors/:id/availability` | Get doctor availability |

### Patients

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patients` | Get all patients |
| GET | `/api/patients/:id` | Get single patient |
| POST | `/api/patients` | Register new patient |
| PUT | `/api/patients/:id` | Update patient info |

---

## 🧪 Testing Conflict Scenarios

### Test 1: Double Booking Prevention

1. Book appointment: Dr. Sarah Johnson, April 27, 10:00-10:30 AM
2. Try to book: Same doctor, same date, 10:00-10:30 AM
3. **Expected:** ❌ Conflict error message

### Test 2: Partial Overlap

1. Book appointment: Dr. Sarah Johnson, April 27, 10:00-10:30 AM
2. Try to book: Same doctor, same date, 10:15-10:45 AM
3. **Expected:** ❌ Conflict error (times overlap)

### Test 3: Update to Conflicting Time

1. Book appointment #1: Dr. Sarah Johnson, April 27, 10:00-10:30 AM
2. Book appointment #2: Same doctor, same date, 11:00-11:30 AM
3. Update #2 to: 10:15-10:45 AM
4. **Expected:** ❌ Conflict error message

### Test 4: Available Slot After Cancellation

1. Book appointment: Dr. Sarah Johnson, April 27, 10:00-10:30 AM
2. Cancel that appointment
3. Try to book same slot again
4. **Expected:** ✅ Booking successful

### Test 5: Different Doctors (No Conflict)

1. Book appointment: Dr. Sarah Johnson, April 27, 10:00-10:30 AM
2. Book appointment: Dr. Michael Chen, April 27, 10:00-10:20 AM
3. **Expected:** ✅ Both bookings successful (different doctors)

---

## 🔧 Troubleshooting

### Database Connection Failed

**Error:** `Database connection failed`

**Solution:**
1. Check if MySQL server is running
2. Verify credentials in `backend/.env`
3. Ensure database `clinic_appointments` exists

```bash
# Check MySQL status
mysql -u root -p
SHOW DATABASES;
```

### Port Already in Use

**Error:** `Port 3000 is already in use`

**Solution:**
```bash
# Change port in backend/.env
PORT=3001

# Or kill process using port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:3000 | xargs kill -9
```

### CORS Issues

**Solution:** Ensure CORS is enabled in `server.js`:
```javascript
app.use(cors());
```

### Frontend Not Loading

**Solution:**
1. Check if server is running: `http://localhost:3000/api/health`
2. Check browser console for errors (F12)
3. Verify API_BASE_URL in `frontend/js/app.js`

### npm install Fails

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## 📊 Sample Data

The database comes pre-loaded with:
- **5 Doctors** with different specializations
- **8 Patients** with complete information
- **8 Sample Appointments** (scheduled)
- **2 Cancelled Appointments** (for testing)
- **16 Time Slots** (09:00 - 17:00, every 30 min)

---

## 🎯 Key SQL Queries

### Find Available Slots
```sql
CALL GetAvailableSlots(1, '2026-04-27');
```

### Check for Conflicts
```sql
CALL CheckAppointmentConflict(
    1, '2026-04-27', '10:00:00', '10:30:00', 
    NULL, @conflict, @message
);
SELECT @conflict, @message;
```

### Doctor's Daily Schedule
```sql
SELECT * FROM v_doctor_schedule 
WHERE doctor_id = 1 
AND appointment_date = '2026-04-27';
```

### Today's Appointments
```sql
SELECT * FROM v_today_appointments;
```

---

## 🔮 Future Enhancements

- [ ] Email notifications for appointments
- [ ] Patient login portal
- [ ] Recurring appointments
- [ ] Appointment reminders
- [ ] Doctor availability management
- [ ] Payment integration
- [ ] Mobile app version
- [ ] Export appointments to calendar
- [ ] Advanced reporting and analytics

---

## 📝 Notes

- **Cancelled appointments** are not deleted from database (soft delete)
- **Time slots** are generated in 30-minute intervals by default
- **Consultation duration** varies by doctor (20-45 minutes)
- **Database triggers** provide the strongest conflict prevention layer

---

## 👨‍💻 Development

### Run in Development Mode
```bash
cd backend
npm run dev
```

### Database Reset
```bash
mysql -u root -p clinic_appointments < database/schema.sql
```

---

## 📄 License

This project is created for educational purposes as a DBMS Mini Project.

---

## 🙏 Acknowledgments

- MySQL Documentation
- Express.js Guide
- Mozilla Developer Network (MDN)

---

## 📧 Contact

For questions or support, please refer to your course instructor or teaching assistant.

---

**Happy Coding! 🚀**
