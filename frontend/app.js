// ============================================
// Global Variables
// ============================================
const API_BASE_URL = 'http://localhost:3000/api';
let doctorsList = [];
let patientsList = [];
let isDatabaseConnected = false;

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('appointmentDate').min = today;
    document.getElementById('updateDate').min = today;
    
    // Check database connection status
    await checkConnectionStatus();
    
    // If connected, load initial data
    if (isDatabaseConnected) {
        await Promise.all([
            loadDoctors(),
            loadPatients(),
            loadAppointments()
        ]);
    }
    
    // Setup form event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Booking form submission
    document.getElementById('bookingForm').addEventListener('submit', handleBooking);
    
    // Update form submission
    document.getElementById('updateForm').addEventListener('submit', handleUpdate);
    
    // Doctor selection change
    document.getElementById('doctorSelect').addEventListener('change', handleDoctorChange);
    
    // Date selection change
    document.getElementById('appointmentDate').addEventListener('change', handleDateChange);
}

// ============================================
// Navigation
// ============================================
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(`${sectionName}Section`).classList.add('active');
    
    // Add active class to clicked button
    event.target.classList.add('active');
    
    // Load data for the section
    if (sectionName === 'appointments') {
        loadAppointments();
    } else if (sectionName === 'statistics') {
        loadStatistics();
    }
}

// ============================================
// API Functions
// ============================================

// Load all doctors
async function loadDoctors() {
    try {
        const response = await fetch(`${API_BASE_URL}/doctors`);
        const result = await response.json();
        
        if (result.success) {
            doctorsList = result.data;
            populateDoctorDropdowns();
            populateFilterDropdowns();
        }
    } catch (error) {
        showAlert('Error loading doctors', 'danger');
        console.error('Error:', error);
    }
}

// Load all patients
async function loadPatients() {
    try {
        const response = await fetch(`${API_BASE_URL}/patients`);
        const result = await response.json();
        
        if (result.success) {
            patientsList = result.data;
            populatePatientDropdown();
        }
    } catch (error) {
        showAlert('Error loading patients', 'danger');
        console.error('Error:', error);
    }
}

// Load appointments with optional filters
async function loadAppointments() {
    try {
        const doctorId = document.getElementById('filterDoctor').value;
        const date = document.getElementById('filterDate').value;
        const status = document.getElementById('filterStatus').value;
        
        let url = `${API_BASE_URL}/appointments?`;
        if (doctorId) url += `doctor_id=${doctorId}&`;
        if (date) url += `date=${date}&`;
        if (status) url += `status=${status}&`;
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            displayAppointments(result.data);
        }
    } catch (error) {
        showAlert('Error loading appointments', 'danger');
        console.error('Error:', error);
    }
}

// Load statistics
async function loadStatistics() {
    try {
        const response = await fetch(`${API_BASE_URL}/appointments/stats`);
        const result = await response.json();
        
        if (result.success) {
            displayStatistics(result.data);
        }
    } catch (error) {
        showAlert('Error loading statistics', 'danger');
        console.error('Error:', error);
    }
}

// ============================================
// Dropdown Population
// ============================================

function populateDoctorDropdowns() {
    const bookingSelect = document.getElementById('doctorSelect');
    const filterSelect = document.getElementById('filterDoctor');
    const updateSelect = document.getElementById('updateDoctor');
    
    // Booking form
    bookingSelect.innerHTML = '<option value="">-- Choose a Doctor --</option>';
    doctorsList.forEach(doctor => {
        bookingSelect.innerHTML += `
            <option value="${doctor.doctor_id}">
                ${doctor.name} - ${doctor.specialization}
            </option>
        `;
    });
    
    // Filter
    filterSelect.innerHTML = '<option value="">All Doctors</option>';
    doctorsList.forEach(doctor => {
        filterSelect.innerHTML += `
            <option value="${doctor.doctor_id}">
                ${doctor.name}
            </option>
        `;
    });
    
    // Update modal
    updateSelect.innerHTML = '';
    doctorsList.forEach(doctor => {
        updateSelect.innerHTML += `
            <option value="${doctor.doctor_id}">
                ${doctor.name} - ${doctor.specialization}
            </option>
        `;
    });
}

function populatePatientDropdown() {
    const select = document.getElementById('patientSelect');
    const updateSelect = document.getElementById('updatePatient');
    
    // Booking form
    select.innerHTML = '<option value="">-- Choose a Patient --</option>';
    patientsList.forEach(patient => {
        select.innerHTML += `
            <option value="${patient.patient_id}">
                ${patient.name} (${patient.email})
            </option>
        `;
    });
    
    // Update modal
    updateSelect.innerHTML = '';
    patientsList.forEach(patient => {
        updateSelect.innerHTML += `
            <option value="${patient.patient_id}">
                ${patient.name}
            </option>
        `;
    });
}

function populateFilterDropdowns() {
    // Already handled in populateDoctorDropdowns
}

// ============================================
// Event Handlers
// ============================================

async function handleDoctorChange(event) {
    const doctorId = event.target.value;
    const dateInput = document.getElementById('appointmentDate');
    
    // Show doctor info
    const doctor = doctorsList.find(d => d.doctor_id == doctorId);
    if (doctor) {
        document.getElementById('doctorInfo').textContent = 
            `Available: ${formatTime12(doctor.available_from)} - ${formatTime12(doctor.available_to)} | Duration: ${doctor.consultation_duration} mins`;
    } else {
        document.getElementById('doctorInfo').textContent = '';
    }
    
    // If date is already selected, reload time slots
    if (dateInput.value) {
        await loadAvailableSlots(doctorId, dateInput.value);
    }
}

async function handleDateChange(event) {
    const doctorId = document.getElementById('doctorSelect').value;
    const date = event.target.value;
    
    if (doctorId && date) {
        await loadAvailableSlots(doctorId, date);
    }
}

// ============================================
// Time Slot Management
// ============================================

async function loadAvailableSlots(doctorId, date) {
    const timeSelect = document.getElementById('timeSlotSelect');
    
    try {
        const response = await fetch(`${API_BASE_URL}/appointments/available/${doctorId}/${date}`);
        const result = await response.json();
        
        if (result.success) {
            timeSelect.disabled = false;
            
            if (result.available_slots.length === 0) {
                timeSelect.innerHTML = '<option value="">No Available Slots</option>';
                timeSelect.disabled = true;
                document.getElementById('slotInfo').textContent = 'All time slots are booked for this date';
            } else {
                timeSelect.innerHTML = '<option value="">-- Select a Time Slot --</option>';
                result.available_slots.forEach(slot => {
                    timeSelect.innerHTML += `
                        <option value="${slot.start_time}|${slot.end_time}">
                            ${formatTime12(slot.start_time)} - ${formatTime12(slot.end_time)}
                        </option>
                    `;
                });
                document.getElementById('slotInfo').textContent = 
                    `${result.available_slots.length} slot(s) available`;
            }
        }
    } catch (error) {
        showAlert('Error loading available slots', 'danger');
        console.error('Error:', error);
        timeSelect.innerHTML = '<option value="">Error Loading Slots</option>';
    }
}

// ============================================
// Booking Appointment
// ============================================

async function handleBooking(event) {
    event.preventDefault();
    
    const doctorId = document.getElementById('doctorSelect').value;
    const patientId = document.getElementById('patientSelect').value;
    const appointmentDate = document.getElementById('appointmentDate').value;
    const timeSlot = document.getElementById('timeSlotSelect').value;
    const notes = document.getElementById('appointmentNotes').value;
    
    if (!timeSlot) {
        showAlert('Please select a time slot', 'warning');
        return;
    }
    
    const [startTime, endTime] = timeSlot.split('|');
    
    const bookingData = {
        doctor_id: parseInt(doctorId),
        patient_id: parseInt(patientId),
        appointment_date: appointmentDate,
        start_time: startTime,
        end_time: endTime,
        notes: notes
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/appointments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('Appointment booked successfully!', 'success');
            document.getElementById('bookingForm').reset();
            document.getElementById('doctorInfo').textContent = '';
            document.getElementById('slotInfo').textContent = '';
            document.getElementById('timeSlotSelect').disabled = true;
            loadAppointments();
            loadStatistics();
        } else if (result.conflict) {
            showAlert(result.message, 'danger');
            if (result.conflicts) {
                console.log('Conflicting appointments:', result.conflicts);
            }
        } else {
            showAlert(result.message || 'Error booking appointment', 'danger');
        }
    } catch (error) {
        showAlert('Network error. Please check if the server is running.', 'danger');
        console.error('Error:', error);
    }
}

// ============================================
// Update Appointment
// ============================================

function openUpdateModal(appointmentId) {
    const modal = document.getElementById('updateModal');
    modal.classList.add('active');
    
    // Load appointment details
    const row = document.querySelector(`tr[data-id="${appointmentId}"]`);
    if (row) {
        document.getElementById('updateAppointmentId').value = appointmentId;
        document.getElementById('updateDoctor').value = row.dataset.doctorId;
        document.getElementById('updatePatient').value = row.dataset.patientId;
        document.getElementById('updateDate').value = row.dataset.date;
        document.getElementById('updateStartTime').value = row.dataset.startTime;
        document.getElementById('updateEndTime').value = row.dataset.endTime;
        document.getElementById('updateStatus').value = row.dataset.status;
        document.getElementById('updateNotes').value = row.dataset.notes || '';
    }
    
    // Clear conflict alert
    document.getElementById('updateConflictAlert').classList.add('hidden');
}

function closeUpdateModal() {
    const modal = document.getElementById('updateModal');
    modal.classList.remove('active');
    document.getElementById('updateForm').reset();
}

async function handleUpdate(event) {
    event.preventDefault();
    
    const appointmentId = document.getElementById('updateAppointmentId').value;
    const updateData = {
        doctor_id: parseInt(document.getElementById('updateDoctor').value),
        patient_id: parseInt(document.getElementById('updatePatient').value),
        appointment_date: document.getElementById('updateDate').value,
        start_time: document.getElementById('updateStartTime').value,
        end_time: document.getElementById('updateEndTime').value,
        status: document.getElementById('updateStatus').value,
        notes: document.getElementById('updateNotes').value
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/appointments/${appointmentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('Appointment updated successfully!', 'success');
            closeUpdateModal();
            loadAppointments();
            loadStatistics();
        } else if (result.conflict) {
            const alertDiv = document.getElementById('updateConflictAlert');
            alertDiv.textContent = result.message;
            alertDiv.classList.remove('hidden');
        } else {
            showAlert(result.message || 'Error updating appointment', 'danger');
        }
    } catch (error) {
        showAlert('Network error. Please check if the server is running.', 'danger');
        console.error('Error:', error);
    }
}

// ============================================
// Cancel Appointment
// ============================================

async function cancelAppointment(appointmentId) {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/appointments/${appointmentId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('Appointment cancelled successfully', 'success');
            loadAppointments();
            loadStatistics();
        } else {
            showAlert(result.message || 'Error cancelling appointment', 'danger');
        }
    } catch (error) {
        showAlert('Network error. Please check if the server is running.', 'danger');
        console.error('Error:', error);
    }
}

// ============================================
// Display Functions
// ============================================

function displayAppointments(appointments) {
    const tbody = document.getElementById('appointmentsTableBody');
    
    if (appointments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No appointments found</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    appointments.forEach(appointment => {
        const row = document.createElement('tr');
        row.dataset.id = appointment.appointment_id;
        row.dataset.doctorId = appointment.doctor_id;
        row.dataset.patientId = appointment.patient_id;
        row.dataset.date = appointment.appointment_date;
        row.dataset.startTime = appointment.start_time;
        row.dataset.endTime = appointment.end_time;
        row.dataset.status = appointment.status;
        row.dataset.notes = appointment.notes || '';
        
        row.innerHTML = `
            <td>${appointment.appointment_id}</td>
            <td>
                <strong>${appointment.doctor_name}</strong><br>
                <small class="text-muted">${appointment.specialization}</small>
            </td>
            <td>
                <strong>${appointment.patient_name}</strong><br>
                <small class="text-muted">${appointment.patient_phone}</small>
            </td>
            <td>${formatDate(appointment.appointment_date)}</td>
            <td>${formatTime12(appointment.start_time)} - ${formatTime12(appointment.end_time)}</td>
            <td><span class="status-badge status-${appointment.status}">${appointment.status}</span></td>
            <td>
                <div class="action-btns">
                    ${appointment.status !== 'cancelled' ? `
                        <button class="action-btn edit" onclick="openUpdateModal(${appointment.appointment_id})">Update</button>
                        <button class="action-btn cancel" onclick="cancelAppointment(${appointment.appointment_id})">Cancel</button>
                    ` : '<span class="text-muted">Cancelled</span>'}
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function displayStatistics(stats) {
    document.getElementById('totalAppointments').textContent = stats.total;
    document.getElementById('scheduledAppointments').textContent = stats.scheduled;
    document.getElementById('completedAppointments').textContent = stats.completed;
    document.getElementById('cancelledAppointments').textContent = stats.cancelled;
}

// ============================================
// New Patient Registration
// ============================================

function showNewPatientForm() {
    const form = document.getElementById('newPatientForm');
    form.classList.toggle('hidden');
}

async function registerPatient() {
    const name = document.getElementById('newPatientName').value;
    const email = document.getElementById('newPatientEmail').value;
    const phone = document.getElementById('newPatientPhone').value;
    const dob = document.getElementById('newPatientDOB').value;
    const address = document.getElementById('newPatientAddress').value;
    
    if (!name || !email || !phone || !dob) {
        showAlert('Please fill in all required fields', 'warning');
        return;
    }
    
    const patientData = {
        name,
        email,
        phone,
        date_of_birth: dob,
        address
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/patients`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(patientData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('Patient registered successfully!', 'success');
            await loadPatients();
            document.getElementById('patientSelect').value = result.data.patient_id;
            
            // Clear form and hide
            document.getElementById('newPatientName').value = '';
            document.getElementById('newPatientEmail').value = '';
            document.getElementById('newPatientPhone').value = '';
            document.getElementById('newPatientDOB').value = '';
            document.getElementById('newPatientAddress').value = '';
            document.getElementById('newPatientForm').classList.add('hidden');
        } else {
            showAlert(result.message || 'Error registering patient', 'danger');
        }
    } catch (error) {
        showAlert('Network error. Please check if the server is running.', 'danger');
        console.error('Error:', error);
    }
}

// ============================================
// Filter Management
// ============================================

function clearFilters() {
    document.getElementById('filterDoctor').value = '';
    document.getElementById('filterDate').value = '';
    document.getElementById('filterStatus').value = '';
    loadAppointments();
}

// ============================================
// Alert System
// ============================================

function showAlert(message, type = 'success') {
    const container = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    container.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// ============================================
// Database Connection Modal
// ============================================

// Make functions globally accessible
window.showConnectionModal = function() {
    console.log('Opening connection modal...');
    const modal = document.getElementById('connectionModal');
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
        document.getElementById('connectionAlert').classList.add('hidden');
    } else {
        console.error('Connection modal not found in DOM');
    }
};

window.closeConnectionModal = function() {
    const modal = document.getElementById('connectionModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = '';
        document.getElementById('connectionForm').reset();
        document.getElementById('connectionAlert').classList.add('hidden');
    }
};

// Check connection status on page load
async function checkConnectionStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/connection-status`);
        const result = await response.json();
        
        if (result.connected) {
            isDatabaseConnected = true;
            updateConnectionButton(true);
        } else {
            isDatabaseConnected = false;
            updateConnectionButton(false);
        }
    } catch (error) {
        console.error('Error checking connection status:', error);
        updateConnectionButton(false);
    }
}

// Update the connection button appearance
function updateConnectionButton(connected) {
    const btn = document.getElementById('dbStatusBtn');
    if (connected) {
        btn.innerHTML = '🟢 Database Connected';
        btn.style.background = 'rgba(16, 185, 129, 0.3)';
        btn.style.borderColor = '#10b981';
    } else {
        btn.innerHTML = '🔴 Connect Database';
        btn.style.background = 'rgba(239, 68, 68, 0.3)';
        btn.style.borderColor = '#ef4444';
    }
}

// Handle database connection form submission
document.addEventListener('DOMContentLoaded', () => {
    const connectionForm = document.getElementById('connectionForm');
    if (connectionForm) {
        connectionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const connectBtn = document.getElementById('connectBtn');
            const alertDiv = document.getElementById('connectionAlert');
            
            // Get form values
            const connectionData = {
                host: document.getElementById('dbHost').value,
                port: parseInt(document.getElementById('dbPort').value),
                user: document.getElementById('dbUser').value,
                password: document.getElementById('dbPassword').value,
                database: document.getElementById('dbName').value
            };
            
            // Disable button and show loading
            connectBtn.disabled = true;
            connectBtn.innerHTML = '⏳ Connecting...';
            alertDiv.classList.add('hidden');
            
            try {
                const response = await fetch(`${API_BASE_URL}/connect`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(connectionData)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // Connection successful
                    isDatabaseConnected = true;
                    updateConnectionButton(true);
                    
                    alertDiv.className = 'alert alert-success';
                    alertDiv.textContent = '✅ ' + result.message;
                    alertDiv.classList.remove('hidden');
                    
                    showAlert(result.message, 'success');
                    
                    // Reload data
                    await Promise.all([
                        loadDoctors(),
                        loadPatients(),
                        loadAppointments()
                    ]);
                    
                    // Close modal after 1.5 seconds
                    setTimeout(() => {
                        closeConnectionModal();
                    }, 1500);
                    
                } else {
                    // Connection failed
                    isDatabaseConnected = false;
                    updateConnectionButton(false);
                    
                    alertDiv.className = 'alert alert-danger';
                    alertDiv.textContent = '❌ ' + result.message;
                    alertDiv.classList.remove('hidden');
                }
                
            } catch (error) {
                alertDiv.className = 'alert alert-danger';
                alertDiv.textContent = '❌ Network error. Please check if the server is running.';
                alertDiv.classList.remove('hidden');
                console.error('Connection error:', error);
            } finally {
                connectBtn.disabled = false;
                connectBtn.innerHTML = '🔌 Connect Database';
            }
        });
    }
});

// ============================================
// Utility Functions
// ============================================

function formatTime12(time24) {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${minutes} ${ampm}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}
