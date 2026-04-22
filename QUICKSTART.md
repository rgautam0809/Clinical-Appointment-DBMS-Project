# 🚀 QUICK START GUIDE

## Option 1: Automated Setup (Recommended for Windows)

### Step 1: Run Setup Script
Double-click `setup.bat` in the project folder

This will:
- ✅ Check MySQL connection
- ✅ Create database and tables
- ✅ Install all Node.js dependencies

### Step 2: Configure Database (if needed)
If your MySQL has a password:
1. Open `backend\.env` file
2. Change `DB_PASSWORD=` to your password
3. Save the file

### Step 3: Start the Application
Double-click `start.bat`

### Step 4: Open in Browser
Go to: http://localhost:3000

---

## Option 2: Manual Setup

### Step 1: Setup Database

Open Command Prompt or PowerShell:

```bash
# Login to MySQL
mysql -u root -p

# When prompted, enter your MySQL password
# Then run:
source database/schema.sql

```

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 3: Configure Database

Edit `backend\.env` file with your MySQL credentials:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=clinic_appointments
DB_PORT=3306
```

### Step 4: Start Server

```bash
npm start
```

### Step 5: Open Browser

Navigate to: http://localhost:3000

---

## ✅ Verify Everything Works

### 1. Check Database
```sql
mysql -u root -p
USE clinic_appointments;
SHOW TABLES;
SELECT * FROM doctors;
```

### 2. Check Server
Visit: http://localhost:3000/api/health

Should show:
```json
{"status": "OK", "message": "Server is running"}
```

### 3. Check Frontend
Visit: http://localhost:3000

You should see the ClinicCare application!

---

## 🎯 Test the System

### Quick Test:

1. **Book an appointment:**
   - Go to "Book Appointment" tab
   - Select: Dr. Sarah Johnson
   - Date: 2026-04-27
   - Time: 02:00 PM - 02:30 PM
   - Patient: John Smith
   - Click "Book Appointment"

2. **Try to create a conflict:**
   - Try booking the same doctor, same date, same time
   - You should see: ❌ "Time conflict detected!"

3. **View appointments:**
   - Go to "View Appointments" tab
   - See your booking in the table

4. **Update appointment:**
   - Click "Update" on your appointment
   - Try changing to a conflicting time
   - System will prevent it!

---

## 🆘 Common Issues

### "Cannot connect to MySQL"
- Make sure MySQL is running
- Check username/password in `backend\.env`

### "Port 3000 already in use"
- Change port in `backend\.env` to 3001
- Or close other apps using port 3000

### "npm is not recognized"
- Install Node.js from https://nodejs.org
- Restart your terminal

### Frontend not loading
- Make sure server is running (check terminal)
- Open browser console (F12) for errors
- Check if API is accessible: http://localhost:3000/api/health

---

## 📞 Need Help?

1. Check the full README.md file
2. Look at the Troubleshooting section in README
3. Verify all prerequisites are installed:
   - MySQL Server
   - Node.js
   - Modern web browser

---

**That's it! You're ready to use the Clinic Appointment Scheduling System! 🎉**
