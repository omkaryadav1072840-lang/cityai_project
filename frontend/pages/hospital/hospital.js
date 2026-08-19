/* =====================================================
   SMARTCITY AI
   HOSPITAL PAGE
===================================================== */

const API_BASE_URL = "http://localhost:5000";


/* =====================================================
   PAGE INITIALIZATION
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

    console.log("SmartCity Hospital Page Loaded");

    updateLiveData();

    setupPatientForm();

    setupHospitalPermissions();

    loadSavedBedData();

    setMinimumAppointmentDate();

});


/* =====================================================
   LIVE DATA
===================================================== */

function updateLiveData() {

    const hospitalCount =
        document.getElementById("hospitalCount");

    const doctorCount =
        document.getElementById("doctorCount");

    const ambulanceCount =
        document.getElementById("ambulanceCount");

    const bedCount =
        document.getElementById("bedCount");


    if (hospitalCount) {
        hospitalCount.textContent = "24";
    }

    if (doctorCount) {
        doctorCount.textContent = "186";
    }

    if (ambulanceCount) {
        ambulanceCount.textContent = "18";
    }

    if (bedCount) {
        bedCount.textContent = "327";
    }

}


/* =====================================================
   MODAL SYSTEM
===================================================== */

function openModal(id) {

    const modal =
        document.getElementById(id);

    if (!modal) {
        console.error("Modal not found:", id);
        return;
    }

    modal.classList.add("show");

}


function closeModal(id) {

    const modal =
        document.getElementById(id);

    if (!modal) {
        return;
    }

    modal.classList.remove("show");

}


/* =====================================================
   CLOSE MODAL OUTSIDE
===================================================== */

document.addEventListener("click", function (event) {

    if (
        event.target &&
        event.target.classList.contains("modal")
    ) {

        event.target.classList.remove("show");

    }

});


/* =====================================================
   APPOINTMENT DATE
===================================================== */

function setMinimumAppointmentDate() {

    const dateInput =
        document.getElementById("appointmentDate");

    if (!dateInput) {
        return;
    }

    const today =
        new Date().toISOString().split("T")[0];

    dateInput.min = today;

}


/* =====================================================
   DOCTOR BOOKING
===================================================== */

function openDoctorBooking() {

    openModal("doctorModal");

}


/* =====================================================
   BOOK SPECIFIC DOCTOR
===================================================== */

function bookSpecificDoctor(doctorName) {

    openDoctorBooking();

    const doctorSelect =
        document.getElementById("doctorSelect");

    if (!doctorSelect) {
        return;
    }

    doctorSelect.value = doctorName;

}


/* =====================================================
   BOOK DOCTOR APPOINTMENT
   BACKEND + MYSQL
===================================================== */

async function bookDoctorSlot() {

    const doctorElement =
        document.getElementById("doctorSelect");

    const dateElement =
        document.getElementById("appointmentDate");

    const timeElement =
        document.getElementById("appointmentTime");

    const patientElement =
        document.getElementById("appointmentPatientId");

    const result =
        document.getElementById("appointmentResult");


    if (!doctorElement ||
        !dateElement ||
        !timeElement ||
        !patientElement ||
        !result) {

        console.error("Appointment form elements missing.");

        return;
    }


    const doctor =
        doctorElement.value.trim();

    const appointmentDate =
        dateElement.value;

    const appointmentTime =
        timeElement.value;

    const patientId =
        patientElement.value.trim();


    /* =================================================
       VALIDATION
    ================================================= */

    if (!doctor) {

        result.innerHTML = `
            <div style="color:red;">
                ⚠️ Please select a doctor.
            </div>
        `;

        return;
    }


    if (!appointmentDate) {

        result.innerHTML = `
            <div style="color:red;">
                ⚠️ Please select appointment date.
            </div>
        `;

        return;
    }


    if (!appointmentTime) {

        result.innerHTML = `
            <div style="color:red;">
                ⚠️ Please select appointment time.
            </div>
        `;

        return;
    }


    if (!patientId) {

        result.innerHTML = `
            <div style="color:red;">
                ⚠️ Please enter Patient ID.
            </div>
        `;

        return;
    }


    /* =================================================
       LOADING
    ================================================= */

    result.innerHTML = `
        <div>
            ⏳ Booking appointment...
        </div>
    `;


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/appointments`,
                {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        patientId:
                            patientId,

                        doctor:
                            doctor,

                        appointmentDate:
                            appointmentDate,

                        appointmentTime:
                            appointmentTime

                    })

                }
            );


        const data =
            await response.json();


        /* =================================================
           BACKEND ERROR
        ================================================= */

        if (!response.ok) {

            result.innerHTML = `
                <div style="color:red;">

                    ❌
                    ${data.message ||
                    "Appointment booking failed."}

                </div>
            `;

            return;
        }


        const appointment =
            data.appointment;


        if (!appointment) {

            result.innerHTML = `
                <div style="color:red;">
                    ❌ Server returned invalid appointment data.
                </div>
            `;

            return;
        }


        /* =================================================
           SUCCESS
        ================================================= */

        result.innerHTML = `

            <div style="color:green;">

                <strong>
                    ✅ Appointment Confirmed
                </strong>

                <br><br>

                Appointment ID:
                <strong>
                    ${appointment.id}
                </strong>

                <br><br>

                👨‍⚕️ Doctor:
                ${appointment.doctor}

                <br>

                📅 Date:
                ${appointment.appointmentDate ||
                appointment.appointment_date ||
                appointmentDate}

                <br>

                ⏰ Time:
                ${appointment.appointmentTime ||
                appointment.appointment_time ||
                appointmentTime}

                <br>

                🪪 Patient ID:
                ${appointment.patientId ||
                appointment.patient_id ||
                patientId}

                <br>

                📌 Status:
                ${appointment.status || "Booked"}

            </div>

        `;


        /* =================================================
           LOCAL COPY
        ================================================= */

        saveAppointmentLocally({

            appointmentID:
                appointment.id,

            doctor:
                appointment.doctor,

            date:
                appointment.appointmentDate ||
                appointment.appointment_date ||
                appointmentDate,

            time:
                appointment.appointmentTime ||
                appointment.appointment_time ||
                appointmentTime,

            patientID:
                appointment.patientId ||
                appointment.patient_id ||
                patientId,

            status:
                appointment.status || "Booked",

            createdAt:
                new Date().toISOString()

        });


    } catch (error) {

        console.error(
            "Appointment booking error:",
            error
        );


        result.innerHTML = `

            <div style="color:red;">

                ❌ Backend server se connection nahi ho pa raha.

                <br><br>

                Make sure backend server is running on:

                <strong>
                    ${API_BASE_URL}
                </strong>

            </div>

        `;

    }

}


/* =====================================================
   SAVE APPOINTMENT LOCAL COPY
===================================================== */

function saveAppointmentLocally(appointment) {

    const existing =
        JSON.parse(
            localStorage.getItem(
                "smartCityAppointments"
            )
        ) || [];


    existing.push(appointment);


fetch("http://localhost:5000/api/doctors")

}


/* =====================================================
   MY APPOINTMENTS
===================================================== */

function openMyAppointments() {

    openModal("appointmentsModal");

    const result =
        document.getElementById(
            "myAppointmentsResult"
        );

    if (result) {

        result.innerHTML = "";

    }

}


/* =====================================================
   LOAD MY APPOINTMENTS FROM MYSQL
===================================================== */

async function loadMyAppointments() {

    const patientInput =
        document.getElementById(
            "myAppointmentPatientId"
        );

    const result =
        document.getElementById(
            "myAppointmentsResult"
        );


    if (!patientInput || !result) {

        console.error(
            "My appointment elements missing."
        );

        return;

    }


    const patientId =
        patientInput.value.trim();


    if (!patientId) {

        result.innerHTML = `

            <div style="color:red;">

                ⚠️ Please enter Patient ID.

            </div>

        `;

        return;

    }


    result.innerHTML = `

        <div>

            ⏳ Loading appointments...

        </div>

    `;


    try {

        const response =
            await fetch(

                `${API_BASE_URL}/api/appointments/${encodeURIComponent(patientId)}`

            );


        const data =
            await response.json();


        if (!response.ok) {

            result.innerHTML = `

                <div style="color:red;">

                    ❌
                    ${data.message ||
                    "Unable to load appointments."}

                </div>

            `;

            return;

        }


        const appointments =
            data.appointments || [];


        /* =================================================
           NO APPOINTMENTS
        ================================================= */

        if (appointments.length === 0) {

            result.innerHTML = `

                <div style="margin-top:15px;">

                    <h3>
                        No Appointments Found
                    </h3>

                    <p>

                        Patient ID:

                        <strong>
                            ${patientId}
                        </strong>

                    </p>

                    <p>
                        No appointment has been
                        booked for this Patient ID.
                    </p>

                </div>

            `;

            return;

        }


        /* =================================================
           APPOINTMENT LIST
        ================================================= */

        let html = `

            <div style="margin-top:20px;">

                <h3>
                    📅 Your Appointments
                </h3>

                <p>
                    Patient ID:
                    <strong>
                        ${patientId}
                    </strong>
                </p>

        `;


        appointments.forEach(function (appointment) {

            let date =
                appointment.appointment_date ||
                appointment.appointmentDate ||
                "N/A";


            if (date !== "N/A") {

                try {

                    date =
                        new Date(date)
                            .toLocaleDateString("en-IN");

                } catch {

                    // Keep original date

                }

            }


            const time =
                appointment.appointment_time ||
                appointment.appointmentTime ||
                "Not specified";


            const doctor =
                appointment.doctor ||
                "Not specified";


            const status =
                appointment.status ||
                "Booked";


            const id =
                appointment.id ||
                "N/A";


            const returnedPatientId =
                appointment.patient_id ||
                appointment.patientId ||
                patientId;


            html += `

                <div
                    style="
                        margin-top:15px;
                        padding:16px;
                        border:1px solid #ddd;
                        border-radius:12px;
                        background:#f8fafc;
                    "
                >

                    <h3>
                        📅 Appointment #${id}
                    </h3>

                    <p>

                        👨‍⚕️

                        <strong>
                            Doctor:
                        </strong>

                        ${doctor}

                    </p>

                    <p>

                        📅

                        <strong>
                            Date:
                        </strong>

                        ${date}

                    </p>

                    <p>

                        ⏰

                        <strong>
                            Time:
                        </strong>

                        ${time}

                    </p>

                    <p>

                        🪪

                        <strong>
                            Patient ID:
                        </strong>

                        ${returnedPatientId}

                    </p>

                    <p>

                        📌

                        <strong>
                            Status:
                        </strong>

                        ${status}

                    </p>

                </div>

            `;

        });


        html += `</div>`;


        result.innerHTML =
            html;


    } catch (error) {

        console.error(
            "My appointments error:",
            error
        );


        result.innerHTML = `

            <div style="color:red;">

                ❌ Backend server se connection nahi ho pa raha.

                <br><br>

                Check:

                <strong>
                    ${API_BASE_URL}
                </strong>

            </div>

        `;

    }

}


/* =====================================================
   PATIENT REGISTRATION
===================================================== */

function openPatientRegistration() {

    openModal("patientModal");

}


/* =====================================================
   GENERATE PATIENT ID
===================================================== */

function generatePatientID() {

    return (

        "PAT-" +

        Date.now()
            .toString()
            .slice(-8)

    );

}


/* =====================================================
   PATIENT FORM
===================================================== */

function setupPatientForm() {

    const patientForm =
        document.getElementById(
            "patientForm"
        );


    if (!patientForm) {
        return;
    }


    patientForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const name =
                document.getElementById(
                    "patientName"
                ).value.trim();


            const dob =
                document.getElementById(
                    "patientDOB"
                ).value;


            const gender =
                document.getElementById(
                    "patientGender"
                ).value;


            const phone =
                document.getElementById(
                    "patientPhone"
                ).value.trim();


            if (!name || !dob || !gender || !phone) {

                alert(
                    "Please fill all patient details."
                );

                return;

            }


            const patientID =
                generatePatientID();


            const patient = {

                patientID:
                    patientID,

                name:
                    name,

                dob:
                    dob,

                gender:
                    gender,

                phone:
                    phone,

                createdAt:
                    new Date().toISOString(),

                appointments: [],

                medicalRecords: [],

                prescriptions: [],

                reports: []

            };


            /*
             * Existing project behaviour:
             * patient data is stored locally.
             */

fetch("http://localhost:5000/api/doctors")


            const generated =
                document.getElementById(
                    "generatedPatientId"
                );


            const result =
                document.getElementById(
                    "patientResult"
                );


            const qrContainer =
                document.getElementById(
                    "patientQRCode"
                );


            if (generated) {

                generated.textContent =
                    patientID;

            }


            if (result) {

                result.style.display =
                    "block";

            }


            if (qrContainer) {

                qrContainer.innerHTML = "";


                if (
                    typeof QRCode !==
                    "undefined"
                ) {

                    new QRCode(
                        qrContainer,
                        {

                            text:
                                patientID,

                            width:
                                150,

                            height:
                                150

                        }
                    );

                }

            }

        }
    );

}


/* =====================================================
   HOSPITALS
===================================================== */

function showHospitals() {

    alert(

        "🏥 Hospital Network\n\n" +

        "24 hospitals found.\n\n" +

        "Nearby hospital network is available."

    );

}


/* =====================================================
   DOCTORS
===================================================== */

function showDoctors() {

    const doctorGrid =
        document.querySelector(
            ".doctor-grid"
        );


    if (doctorGrid) {

        doctorGrid.scrollIntoView({

            behavior:
                "smooth",

            block:
                "start"

        });

    }

}





/* =====================================================
   BEDS
===================================================== */

function showBeds() {

    const beds =
        JSON.parse(
            localStorage.getItem(
                "hospitalBeds"
            )
        );


    if (beds) {

        alert(

            "🛏️ LIVE BED AVAILABILITY\n\n" +

            "General: " +
            beds.general +

            "\nICU: " +
            beds.icu +

            "\nEmergency: " +
            beds.emergency +

            "\nPrivate: " +
            beds.private

        );

        return;

    }


    alert(

        "🛏️ LIVE BED AVAILABILITY\n\n" +

        "General: 184\n" +

        "ICU: 38\n" +

        "Emergency: 21\n" +

        "Private: 84"

    );

}

/* =====================================================
   AMBULANCE TRACKING UI
===================================================== */

function trackAmbulance() {

    openModal("ambulanceModal");

    loadAmbulanceData();

}


function loadAmbulanceData() {

    const result =
        document.getElementById("ambulanceResult");

    if (!result) {
        return;
    }


    result.innerHTML = `

        <div class="loading-card">

            <div class="loading-spinner">
                🚑
            </div>

            <strong>
                Loading ambulance information...
            </strong>

            <span>
                Please wait
            </span>

        </div>

    `;


    setTimeout(function () {

        const savedAmbulances = [];

        /*
         * Read ambulance data saved by hospital staff.
         */

        for (
            let i = 0;
            i < localStorage.length;
            i++
        ) {

            const key =
                localStorage.key(i);

            if (
                key &&
                key.startsWith("ambulance_")
            ) {

                try {

                    const ambulance =
                        JSON.parse(
                            localStorage.getItem(key)
                        );

                    savedAmbulances.push(
                        ambulance
                    );

                } catch {

                    console.error(
                        "Invalid ambulance data"
                    );

                }

            }

        }


        /*
         * Demo ambulance if no staff data exists.
         */

        if (savedAmbulances.length === 0) {

            savedAmbulances.push({

                id: "AMB-104",

                status: "Available",

                location: "Gorakhpur City",

                distance: "2.1 km",

                eta: "6 minutes"

            });

        }


        renderAmbulances(
            savedAmbulances
        );

    }, 500);

}


function renderAmbulances(ambulances) {

    const result =
        document.getElementById(
            "ambulanceResult"
        );

    if (!result) {
        return;
    }


    let html = `

        <div class="ambulance-list">

    `;


    ambulances.forEach(function (ambulance) {

        const status =
            ambulance.status ||
            "Available";


        let statusClass =
            "available";


        if (
            status.toLowerCase()
                .includes("emergency")
        ) {

            statusClass =
                "emergency";

        }
        else if (
            status.toLowerCase()
                .includes("maintenance")
        ) {

            statusClass =
                "maintenance";

        }
        else if (
            status.toLowerCase()
                .includes("offline")
        ) {

            statusClass =
                "offline";

        }


        html += `

            <div class="ambulance-card">

                <div class="ambulance-card-header">

                    <div class="ambulance-icon">
                        🚑
                    </div>

                    <div>

                        <h3>
                            ${ambulance.id || "AMB-UNKNOWN"}
                        </h3>

                        <span class="
                            ambulance-status
                            ${statusClass}
                        ">

                            <i></i>

                            ${status}

                        </span>

                    </div>

                </div>


                <div class="ambulance-details">

                    <div>

                        <span>
                            📍 Location
                        </span>

                        <strong>
                            ${ambulance.location || "Not available"}
                        </strong>

                    </div>


                    <div>

                        <span>
                            📏 Distance
                        </span>

                        <strong>
                            ${ambulance.distance || "Calculating..."}
                        </strong>

                    </div>


                    <div>

                        <span>
                            ⏱️ ETA
                        </span>

                        <strong>
                            ${ambulance.eta || "Calculating..."}
                        </strong>

                    </div>

                </div>


                <button
                    type="button"
                    class="track-live-btn"
                    onclick="showLiveAmbulance('${ambulance.id}')"
                >
                    📍 Track Live
                </button>

            </div>

        `;

    });


    html += `
        </div>
    `;


    result.innerHTML =
        html;

}


function refreshAmbulance() {

    loadAmbulanceData();

}


function showLiveAmbulance(ambulanceID) {

    const result =
        document.getElementById(
            "ambulanceResult"
        );

    if (!result) {
        return;
    }


    result.innerHTML = `

        <div class="live-tracking-card">

            <div class="live-map-placeholder">

                <div class="live-map-icon">
                    📍
                </div>

                <strong>
                    LIVE GPS TRACKING
                </strong>

                <span>
                    ${ambulanceID}
                </span>

            </div>


            <div class="live-info">

                <div>

                    <span>
                        Ambulance
                    </span>

                    <strong>
                        ${ambulanceID}
                    </strong>

                </div>


                <div>

                    <span>
                        Tracking Status
                    </span>

                    <strong class="live-text">
                        ● LIVE
                    </strong>

                </div>

            </div>

        </div>

    `;

}


let medicineData = [];

async function loadMedicines() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/api/pharmacy`
        );

        const data = await response.json();

        console.log("MYSQL PHARMACY DATA:", data);

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to load medicines"
            );
        }

        medicineData = (data.medicines || []).map(medicine => ({

            id: medicine.id,

            name: medicine.medicine_name,

            category: medicine.category || "General",

            stock: Number(medicine.quantity || 0),

            price: medicine.price || 0,

            status:
                medicine.availability ||
                (
                    Number(medicine.quantity || 0) > 0
                        ? "Available"
                        : "Out of Stock"
                ),

            // Backend me dosage/timing nahi hai
            dosage: "As prescribed",

            timing: "As prescribed"

        }));

        console.log(
            "FORMATTED MEDICINES:",
            medicineData
        );

        renderMedicines(medicineData);

    } catch (error) {

        console.error(
            "Medicine loading error:",
            error
        );

        const result =
            document.getElementById("medicineResult");

        if (result) {

            result.innerHTML = `
                <div class="error-card">

                    ❌ Medicines load nahi ho rahi.

                    <br><br>

                    ${error.message}

                </div>
            `;

        }

    }

}


function showPharmacy() {

    openModal("pharmacyModal");

    loadMedicines();

}


function searchMedicines() {

    const input =
        document.getElementById(
            "medicineSearch"
        );

    if (!input) {
        return;
    }


    const search =
        input.value
            .trim()
            .toLowerCase();


    if (!search) {

        renderMedicines(
            medicineData
        );

        return;

    }


    const filtered =
        medicineData.filter(
            function (medicine) {

                return (

                    medicine.name
                        .toLowerCase()
                        .includes(search)

                    ||

                    medicine.category
                        .toLowerCase()
                        .includes(search)

                );

            }
        );


    renderMedicines(
        filtered
    );

}


function renderMedicines(medicines) {

    const result =
        document.getElementById(
            "medicineResult"
        );

    if (!result) {
        return;
    }


    if (medicines.length === 0) {

        result.innerHTML = `

            <div class="empty-state">

                <div>
                    🔎
                </div>

                <h3>
                    Medicine Not Found
                </h3>

                <p>
                    No medicine matches your search.
                </p>

            </div>

        `;

        return;

    }


    let html = `

        <div class="medicine-grid">

    `;


    medicines.forEach(
        function (medicine) {

            const available =
                medicine.stock > 0;


            html += `

                <div class="medicine-card">

                    <div class="medicine-card-top">

                        <div class="medicine-icon">
                            💊
                        </div>

                        <span class="
                            medicine-stock
                            ${available
                                ? "in-stock"
                                : "out-stock"}
                        ">

                            ${medicine.status}

                        </span>

                    </div>


                    <h3>
                        ${medicine.name}
                    </h3>


                    <p class="medicine-category">
                        ${medicine.category}
                    </p>


                    <div class="medicine-info">

                        <div>

                            <span>
                                Stock
                            </span>

                            <strong>
                                ${medicine.stock}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Dosage
                            </span>

                            <strong>
                                ${medicine.dosage}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Timing
                            </span>

                            <strong>
                                ${medicine.timing}
                            </strong>

                        </div>

                    </div>


                    <button
                        type="button"
                        class="medicine-btn"
                        onclick="viewMedicine('${medicine.name}')"
                    >
                        View Details
                    </button>

                </div>

            `;

        }
    );


    html += `
        </div>
    `;


    result.innerHTML =
        html;

}


function viewMedicine(name) {

    const medicine =
        medicineData.find(
            function (item) {

                return item.name === name;

            }
        );


    if (!medicine) {
        return;
    }


    const result =
        document.getElementById(
            "medicineResult"
        );


    result.innerHTML = `

        <div class="medicine-detail-card">

            <div class="medicine-detail-icon">
                💊
            </div>

            <h2>
                ${medicine.name}
            </h2>

            <span>
                ${medicine.category}
            </span>


            <div class="medicine-detail-grid">

                <div>
                    <small>
                        Stock
                    </small>

                    <strong>
                        ${medicine.stock}
                    </strong>
                </div>


                <div>
                    <small>
                        Dosage
                    </small>

                    <strong>
                        ${medicine.dosage}
                    </strong>
                </div>


                <div>
                    <small>
                        Timing
                    </small>

                    <strong>
                        ${medicine.timing}
                    </strong>
                </div>

            </div>


            <div class="medicine-warning">

                ⚠️ Medicine should be taken only
                according to a doctor's prescription.

            </div>


            <button
                type="button"
                class="primary-btn"
                onclick="renderMedicines(medicineData)"
            >
                ← Back to Medicines
            </button>

        </div>

    `;

}



/* =====================================================
   EMERGENCY UI
===================================================== */

function openEmergency() {

    openModal(
        "emergencyModal"
    );

}


function callEmergency() {

    window.location.href =
        "tel:112";

}



/* =====================================================
   PATIENT FILE UI
===================================================== */

function openPatientFile() {

    openModal(
        "patientFileModal"
    );

}


async function searchPatientFile() {

    const input =
        document.getElementById(
            "patientFileSearch"
        );

    const result =
        document.getElementById(
            "patientFileResult"
        );


    if (!input || !result) {
        return;
    }


    const patientID =
        input.value.trim();


    if (!patientID) {

        result.innerHTML = `

            <div class="error-card">

                ⚠️ Please enter Patient ID.

            </div>

        `;

        return;

    }


    result.innerHTML = `

        <div class="loading-card">

            ⏳ Searching patient...

        </div>

    `;


    try {

        const response =
            await fetch(

                `${API_BASE_URL}/api/patients/search/${encodeURIComponent(patientID)}`

            );


        const data =
            await response.json();


        if (!response.ok) {

            result.innerHTML = `

                <div class="error-card">

                    ❌
                    ${data.message ||
                    "Patient not found."}

                </div>

            `;

            return;

        }


        const patient =
            data.patient;


        result.innerHTML = `

            <div class="patient-profile-card">

                <div class="patient-profile-header">

                    <div class="patient-avatar">
                        👤
                    </div>

                    <div>

                        <span>
                            PATIENT ID
                        </span>

                        <h3>
                            ${patient.patient_id}
                        </h3>

                    </div>

                </div>


                <div class="patient-profile-grid">

                    <div>

                        <span>
                            Full Name
                        </span>

                        <strong>
                            ${patient.name || "N/A"}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Age
                        </span>

                        <strong>
                            ${patient.age || "N/A"}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Gender
                        </span>

                        <strong>
                            ${patient.gender || "N/A"}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Mobile
                        </span>

                        <strong>
                            ${patient.mobile || "N/A"}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Blood Group
                        </span>

                        <strong>
                            ${patient.blood_group || "N/A"}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Address
                        </span>

                        <strong>
                            ${patient.address || "N/A"}
                        </strong>

                    </div>

                </div>


                <div class="patient-record-actions">

                    <button
                        type="button"
                        class="primary-btn"
                        onclick="loadPatientAppointments('${patient.patient_id}')"
                    >
                        📅 Appointments
                    </button>

                    <button
                        type="button"
                        class="secondary-btn"
                        onclick="showPatientQR('${patient.patient_id}')"
                    >
                        📱 Patient QR
                    </button>

                </div>

            </div>

        `;


    } catch (error) {

        console.error(
            "Patient search error:",
            error
        );


        result.innerHTML = `

            <div class="error-card">

                ❌ Backend server se connection nahi ho pa raha.

                <br><br>

                Check:

                <strong>
                    ${API_BASE_URL}
                </strong>

            </div>

        `;

    }

}


function showPatientQR(patientID) {

    const result =
        document.getElementById(
            "patientFileResult"
        );


    if (!result) {
        return;
    }


    result.innerHTML = `

        <div class="patient-qr-view">

            <div class="medicine-detail-icon">
                📱
            </div>

            <h3>
                Patient QR Code
            </h3>

            <p>
                Patient ID:
                <strong>
                    ${patientID}
                </strong>
            </p>

            <div
                id="filePatientQRCode"
                class="patient-qr"
            ></div>

            <button
                type="button"
                class="primary-btn"
                onclick="searchPatientFile()"
            >
                ← Back
            </button>

        </div>

    `;


    if (
        typeof QRCode !==
        "undefined"
    ) {

        new QRCode(

            document.getElementById(
                "filePatientQRCode"
            ),

            {
                text: patientID,
                width: 180,
                height: 180
            }

        );

    }

}
/* =====================================================
   HOSPITAL DETAILS
===================================================== */

function viewHospital(hospitalName) {

    alert(

        "🏥 " +
        hospitalName +

        "\n\n" +

        "Emergency: Available\n" +

        "ICU: Available\n" +

        "Ambulance: Available\n" +

        "Doctors: Available\n" +

        "24/7 Service: Yes"

    );

}


/* =====================================================
   STAFF USER
===================================================== */

function getCurrentUser() {

    const user =
        localStorage.getItem(
            "smartCityCurrentUser"
        );


    if (!user) {
        return null;
    }


    try {

        return JSON.parse(user);

    } catch {

        return null;

    }

}


/* =====================================================
   HOSPITAL STAFF CHECK
===================================================== */

function isHospitalStaff() {

    const user =
        getCurrentUser();


    if (!user) {
        return false;
    }


    return (

        user.type === "staff" &&

        user.department === "hospital"

    );

}


/* =====================================================
   STAFF PANEL
===================================================== */

function setupHospitalPermissions() {

    const panel =
        document.getElementById(
            "hospitalStaffPanel"
        );


    if (!panel) {
        return;
    }


    if (isHospitalStaff()) {

        panel.style.display =
            "block";

    } else {

        panel.style.display =
            "none";

    }

}


/* =====================================================
   STAFF EDIT PANEL
===================================================== */

function openEditPanel(type) {

    if (!isHospitalStaff()) {

        alert(

            "🔒 Access Denied\n\n" +

            "Only Hospital Staff can edit this section."

        );

        return;

    }


    const modal =
        document.getElementById(
            "staffEditModal"
        );


    const content =
        document.getElementById(
            "editContent"
        );


    if (!modal || !content) {
        return;
    }


    let html = "";


    /* =================================================
       HOSPITAL INFORMATION
    ================================================= */

    if (type === "hospitalInfo") {

        html = `

            <h2>
                🏥 Edit Hospital Information
            </h2>

            <p>
                Update hospital information.
            </p>

            <label class="edit-label">
                Hospital Name
            </label>

            <input
                id="editHospitalName"
                class="edit-input"
                value="City General Hospital"
            >


            <label class="edit-label">
                Emergency Status
            </label>

            <select
                id="editEmergencyStatus"
                class="edit-select"
            >

                <option>
                    Open
                </option>

                <option>
                    Busy
                </option>

                <option>
                    Closed
                </option>

            </select>


            <label class="edit-label">
                Emergency Contact
            </label>

            <input
                id="editHospitalPhone"
                class="edit-input"
                value="112"
            >


            <button
                type="button"
                class="save-edit-btn"
                onclick="saveHospitalInfo()"
            >
                SAVE CHANGES
            </button>

        `;

    }


    /* =================================================
       DOCTORS
    ================================================= */

    else if (type === "doctors") {

        html = `

            <h2>
                👨‍⚕️ Manage Doctors
            </h2>

            <p>
                Update doctor availability.
            </p>


            <label class="edit-label">
                Doctor Name
            </label>

            <input
                id="editDoctorName"
                class="edit-input"
                placeholder="Doctor name"
            >


            <label class="edit-label">
                Department
            </label>

            <select
                id="editDoctorDepartment"
                class="edit-select"
            >

                <option>
                    General Physician
                </option>

                <option>
                    Cardiologist
                </option>

                <option>
                    Orthopedic
                </option>

                <option>
                    Neurologist
                </option>

                <option>
                    Pediatrician
                </option>

            </select>


            <label class="edit-label">
                Availability
            </label>

            <select
                id="editDoctorStatus"
                class="edit-select"
            >

                <option>
                    Available
                </option>

                <option>
                    Busy
                </option>

                <option>
                    On Leave
                </option>

            </select>


            <button
                type="button"
                class="save-edit-btn"
                onclick="saveDoctor()"
            >
                SAVE DOCTOR
            </button>

        `;

    }


    /* =================================================
       DOCTOR SLOTS
    ================================================= */

    else if (type === "slots") {

        html = `

            <h2>
                📅 Manage Doctor Slots
            </h2>

            <p>
                Add or update appointment timings.
            </p>


            <label class="edit-label">
                Doctor
            </label>

            <input
                id="slotDoctor"
                class="edit-input"
                placeholder="Doctor name"
            >


            <label class="edit-label">
                Date
            </label>

            <input
                id="slotDate"
                class="edit-input"
                type="date"
            >


            <label class="edit-label">
                Time
            </label>

            <input
                id="slotTime"
                class="edit-input"
                type="time"
            >


            <label class="edit-label">
                Slot Status
            </label>

            <select
                id="slotStatus"
                class="edit-select"
            >

                <option>
                    Available
                </option>

                <option>
                    Full
                </option>

                <option>
                    Cancelled
                </option>

            </select>


            <button
                type="button"
                class="save-edit-btn"
                onclick="saveDoctorSlot()"
            >
                SAVE SLOT
            </button>

        `;

    }


    /* =================================================
       AMBULANCE
    ================================================= */

    else if (type === "ambulance") {

        html = `

            <h2>
                🚑 Ambulance Management
            </h2>

            <p>
                Update ambulance operational status.
            </p>


            <label class="edit-label">
                Ambulance ID
            </label>

            <input
                id="ambulanceID"
                class="edit-input"
                placeholder="AMB-101"
            >


            <label class="edit-label">
                Status
            </label>

            <select
                id="ambulanceStatus"
                class="edit-select"
            >

                <option>
                    Available
                </option>

                <option>
                    On Emergency
                </option>

                <option>
                    Maintenance
                </option>

                <option>
                    Offline
                </option>

            </select>


            <label class="edit-label">
                Location
            </label>

            <input
                id="ambulanceLocation"
                class="edit-input"
                placeholder="Current location"
            >


            <button
                type="button"
                class="save-edit-btn"
                onclick="saveAmbulance()"
            >
                UPDATE AMBULANCE
            </button>

        `;

    }


    /* =================================================
       BEDS
    ================================================= */

    else if (type === "beds") {

        html = `

            <h2>
                🛏️ Update Bed Availability
            </h2>

            <p>
                Update current hospital capacity.
            </p>


            <label class="edit-label">
                General Beds
            </label>

            <input
                id="generalBeds"
                class="edit-input"
                type="number"
                value="184"
            >


            <label class="edit-label">
                ICU Beds
            </label>

            <input
                id="icuBeds"
                class="edit-input"
                type="number"
                value="38"
            >


            <label class="edit-label">
                Emergency Beds
            </label>

            <input
                id="emergencyBeds"
                class="edit-input"
                type="number"
                value="21"
            >


            <label class="edit-label">
                Private Beds
            </label>

            <input
                id="privateBeds"
                class="edit-input"
                type="number"
                value="84"
            >


            <button
                type="button"
                class="save-edit-btn"
                onclick="saveBeds()"
            >
                UPDATE BED AVAILABILITY
            </button>

        `;

    }


    /* =================================================
       EMERGENCY
    ================================================= */

    else if (type === "emergency") {

        html = `

            <h2>
                🚨 Emergency Department
            </h2>

            <p>
                Update emergency department status.
            </p>


            <label class="edit-label">
                Emergency Department
            </label>

            <select
                id="emergencyDepartmentStatus"
                class="edit-select"
            >

                <option>
                    Open
                </option>

                <option>
                    High Load
                </option>

                <option>
                    Critical
                </option>

                <option>
                    Closed
                </option>

            </select>


            <label class="edit-label">
                Available Emergency Doctors
            </label>

            <input
                id="emergencyDoctors"
                class="edit-input"
                type="number"
                value="12"
            >


            <label class="edit-label">
                Emergency Beds
            </label>

            <input
                id="emergencyAvailableBeds"
                class="edit-input"
                type="number"
                value="21"
            >


            <button
                type="button"
                class="save-edit-btn"
                onclick="saveEmergency()"
            >
                UPDATE EMERGENCY STATUS
            </button>

        `;

    }


    content.innerHTML =
        html;


    modal.classList.add("show");

}


/* =====================================================
   SAVE HOSPITAL INFO
===================================================== */

function saveHospitalInfo() {

    if (!isHospitalStaff()) {
        return;
    }


    const name =
        document.getElementById(
            "editHospitalName"
        )?.value.trim();


    const emergency =
        document.getElementById(
            "editEmergencyStatus"
        )?.value;


    const phone =
        document.getElementById(
            "editHospitalPhone"
        )?.value.trim();


    if (!name) {

        alert(
            "Please enter hospital name."
        );

        return;

    }


    const data = {

        name:
            name,

        emergency:
            emergency,

        phone:
            phone

    };


fetch("http://localhost:5000/api/doctors")


    showSavedMessage(
        "Hospital information updated successfully."
    );

}


/* =====================================================
   SAVE DOCTOR
===================================================== */

function saveDoctor() {

    if (!isHospitalStaff()) {
        return;
    }


    const doctor = {

        name:
            document.getElementById(
                "editDoctorName"
            )?.value.trim(),

        department:
            document.getElementById(
                "editDoctorDepartment"
            )?.value,

        status:
            document.getElementById(
                "editDoctorStatus"
            )?.value

    };


    if (!doctor.name) {

        alert(
            "Please enter doctor name."
        );

        return;

    }


    const doctors =
        JSON.parse(
            localStorage.getItem(
                "hospitalDoctors"
            )
        ) || [];


    doctors.push(doctor);


fetch("http://localhost:5000/api/doctors")


    showSavedMessage(
        "Doctor information saved."
    );

}


/* =====================================================
   SAVE DOCTOR SLOT
===================================================== */

function saveDoctorSlot() {

    if (!isHospitalStaff()) {
        return;
    }


    const slot = {

        doctor:
            document.getElementById(
                "slotDoctor"
            )?.value.trim(),

        date:
            document.getElementById(
                "slotDate"
            )?.value,

        time:
            document.getElementById(
                "slotTime"
            )?.value,

        status:
            document.getElementById(
                "slotStatus"
            )?.value

    };


    if (
        !slot.doctor ||
        !slot.date ||
        !slot.time
    ) {

        alert(
            "Please fill doctor, date and time."
        );

        return;

    }


    const slots =
        JSON.parse(
            localStorage.getItem(
                "hospitalDoctorSlots"
            )
        ) || [];


    slots.push(slot);


fetch("http://localhost:5000/api/doctors")


    showSavedMessage(
        "Doctor slot saved successfully."
    );

}


/* =====================================================
   SAVE AMBULANCE
===================================================== */

function saveAmbulance() {

    if (!isHospitalStaff()) {
        return;
    }


    const ambulance = {

        id:
            document.getElementById(
                "ambulanceID"
            )?.value.trim(),

        status:
            document.getElementById(
                "ambulanceStatus"
            )?.value,

        location:
            document.getElementById(
                "ambulanceLocation"
            )?.value.trim()

    };


    if (!ambulance.id) {

        alert(
            "Please enter ambulance ID."
        );

        return;

    }


fetch("http://localhost:5000/api/doctors")


    showSavedMessage(
        "Ambulance information updated."
    );

}


/* =====================================================
   SAVE BEDS
===================================================== */

function saveBeds() {

    if (!isHospitalStaff()) {
        return;
    }


    const beds = {

        general:
            document.getElementById(
                "generalBeds"
            )?.value,

        icu:
            document.getElementById(
                "icuBeds"
            )?.value,

        emergency:
            document.getElementById(
                "emergencyBeds"
            )?.value,

        private:
            document.getElementById(
                "privateBeds"
            )?.value

    };


fetch("http://localhost:5000/api/doctors")


    updateBedDisplay(beds);


    showSavedMessage(
        "Bed availability updated."
    );

}


/* =====================================================
   LOAD SAVED BEDS
===================================================== */

function loadSavedBedData() {

    const beds =
        JSON.parse(
            localStorage.getItem(
                "hospitalBeds"
            )
        );


    if (!beds) {
        return;
    }


    updateBedDisplay(beds);

}


/* =====================================================
   UPDATE BED DISPLAY
===================================================== */

function updateBedDisplay(beds) {

    const general =
        document.getElementById(
            "generalBedDisplay"
        );

    const icu =
        document.getElementById(
            "icuBedDisplay"
        );

    const emergency =
        document.getElementById(
            "emergencyBedDisplay"
        );

    const privateBed =
        document.getElementById(
            "privateBedDisplay"
        );


    if (general) {
        general.textContent =
            beds.general;
    }

    if (icu) {
        icu.textContent =
            beds.icu;
    }

    if (emergency) {
        emergency.textContent =
            beds.emergency;
    }

    if (privateBed) {
        privateBed.textContent =
            beds.private;
    }

}


/* =====================================================
   SAVE EMERGENCY
===================================================== */

function saveEmergency() {

    if (!isHospitalStaff()) {
        return;
    }


    const emergency = {

        status:
            document.getElementById(
                "emergencyDepartmentStatus"
            )?.value,

        doctors:
            document.getElementById(
                "emergencyDoctors"
            )?.value,

        beds:
            document.getElementById(
                "emergencyAvailableBeds"
            )?.value

    };


fetch("http://localhost:5000/api/doctors")


    showSavedMessage(
        "Emergency department updated."
    );

}


/* =====================================================
   SUCCESS MESSAGE
===================================================== */

/* =====================================================
   SUCCESS MESSAGE
===================================================== */

function showSavedMessage(message) {

    const content =
        document.getElementById(
            "editContent"
        );

    if (!content) {
        return;
    }

    content.innerHTML += `

        <div class="edit-notice">

            ✅ ${message}

        </div>

    `;

}


/* =====================================================
   STEP 8
   SAVE BILL / PHARMACY HISTORY WITH PATIENT ID
===================================================== */



async function uploadPrescription() {

    const patientInput =
        document.getElementById(
            "prescriptionPatientId"
        );

    const fileInput =
        document.getElementById(
            "prescriptionFile"
        );

    const result =
        document.getElementById(
            "prescriptionUploadResult"
        );


    if (
        !patientInput ||
        !fileInput ||
        !result
    ) {

        console.error(
            "Prescription upload elements missing."
        );

        return;

    }


    const patientId =
        patientInput.value.trim();

    const file =
        fileInput.files[0];


    // =================================================
    // PATIENT ID VALIDATION
    // =================================================

    if (!patientId) {

        result.innerHTML = `

            <div class="error-card">

                ⚠️ Please enter Patient ID.

            </div>

        `;

        return;

    }


    // =================================================
    // FILE VALIDATION
    // =================================================

    if (!file) {

        result.innerHTML = `

            <div class="error-card">

                ⚠️ Please select prescription file.

            </div>

        `;

        return;

    }


    const allowedTypes = [

        "application/pdf",

        "image/jpeg",

        "image/png",

        "image/webp"

    ];


    if (
        !allowedTypes.includes(
            file.type
        )
    ) {

        result.innerHTML = `

            <div class="error-card">

                ❌ Invalid file type.

                <br><br>

                Only PDF, JPG, PNG and WEBP
                are allowed.

            </div>

        `;

        return;

    }


    // =================================================
    // 10 MB VALIDATION
    // =================================================

    const maxSize =
        10 * 1024 * 1024;


    if (file.size > maxSize) {

        result.innerHTML = `

            <div class="error-card">

                ❌ File size is too large.

                <br><br>

                Maximum allowed size is 10 MB.

            </div>

        `;

        return;

    }


    // =================================================
    // LOADING
    // =================================================

    result.innerHTML = `

        <div class="loading-card">

            ⏳ Uploading prescription...

            <br><br>

            Please wait.

        </div>

    `;


    try {

        const formData =
            new FormData();


        formData.append(
            "patientId",
            patientId
        );


        formData.append(
            "uploadedBy",
            "Patient"
        );


        formData.append(
            "prescriptionFile",
            file
        );


        const response =
            await fetch(

                `${API_BASE_URL}/api/prescriptions/upload`,

                {

                    method:
                        "POST",

                    body:
                        formData

                }

            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(

                data.message ||
                "Prescription upload failed."

            );

        }


        const prescription =
            data.prescription;


        result.innerHTML = `

            <div
                class="success-card"
                style="
                    padding:20px;
                    border-radius:12px;
                    border:1px solid #22c55e;
                "
            >

                <h3>
                    ✅ Prescription Uploaded
                </h3>


                <p>

                    🪪

                    <strong>
                        Patient ID:
                    </strong>

                    ${prescription.patientId}

                </p>


                <p>

                    📄

                    <strong>
                        File:
                    </strong>

                    ${prescription.originalFileName}

                </p>


                <p>

                    📌

                    <strong>
                        Status:
                    </strong>

                    ${prescription.status}

                </p>


                <div
                    style="
                        margin-top:15px;
                    "
                >

                    <a
                        href="${prescription.fileUrl}"
                        target="_blank"
                        class="primary-btn"
                    >
                        👁️ View Prescription
                    </a>

                </div>

            </div>

        `;


        // Clear file input

        fileInput.value = "";


    }

    catch (error) {

        console.error(
            "Prescription upload error:",
            error
        );


        result.innerHTML = `

            <div class="error-card">

                ❌ ${error.message}

            </div>

        `;

    }

}
/* =====================================================
   LOAD PRESCRIPTION HISTORY
===================================================== */

async function loadPrescriptionHistory(patientId) {

    const result =
        document.getElementById(
            "prescriptionHistoryResult"
        );


    if (!result) {

        console.error(
            "Prescription history result element missing."
        );

        return;

    }


    if (!patientId) {

        result.innerHTML = `

            <div class="error-card">

                ⚠️ Patient ID required.

            </div>

        `;

        return;

    }


    result.innerHTML = `

        <div class="loading-card">

            ⏳ Loading prescription history...

        </div>

    `;


    try {

        const response =
            await fetch(

                `${API_BASE_URL}/api/prescriptions/patient/${encodeURIComponent(patientId)}`

            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(

                data.message ||
                "Unable to load prescription history."

            );

        }


        const prescriptions =
            data.prescriptions || [];


        if (
            prescriptions.length === 0
        ) {

            result.innerHTML = `

                <div class="empty-state">

                    <div>
                        📄
                    </div>

                    <h3>
                        No Prescription Found
                    </h3>

                    <p>
                        No prescription is saved
                        for Patient ID
                        <strong>
                            ${patientId}
                        </strong>
                    </p>

                </div>

            `;

            return;

        }


        let html = `

            <div class="prescription-history">

                <h3>
                    📋 Prescription History
                </h3>

        `;


        prescriptions.forEach(
            function(prescription) {

                const date =
                    prescription.created_at
                        ? new Date(
                            prescription.created_at
                        ).toLocaleString(
                            "en-IN"
                        )
                        : "N/A";


                const size =
                    prescription.file_size
                        ? (
                            prescription.file_size /
                            1024
                        ).toFixed(1) +
                        " KB"
                        : "N/A";


                html += `

                    <div
                        class="prescription-history-card"
                        style="
                            margin-top:15px;
                            padding:18px;
                            border:1px solid #ddd;
                            border-radius:12px;
                        "
                    >

                        <h4>
                            📄
                            ${prescription.original_file_name}
                        </h4>


                        <p>

                            🗓️
                            ${date}

                        </p>


                        <p>

                            📦
                            ${size}

                        </p>


                        <p>

                            📌
                            ${prescription.status}

                        </p>


                        <a
                            href="${prescription.file_url}"
                            target="_blank"
                            class="primary-btn"
                        >
                            👁️ View
                        </a>

                    </div>

                `;

            }
        );


        html += `

            </div>

        `;


        result.innerHTML =
            html;

    }

    catch (error) {

        console.error(
            "Prescription history error:",
            error
        );


        result.innerHTML = `

            <div class="error-card">

                ❌ ${error.message}

            </div>

        `;

    }

}