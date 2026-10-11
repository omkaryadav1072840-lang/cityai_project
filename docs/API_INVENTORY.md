# SMARTCITY AI — Master API Inventory
**Platform**: Gorakhpur Smart City Municipal Operations Platform  
**Total Route Files**: 27 Modular Express Routers  
**Base URL**: `http://localhost:5000` (Gateway) | `http://localhost:8000` (Python FastAPI ML Engine)  

---

## 1. Authentication & Session APIs (`backend/routes/auth.routes.js`)
| Method | Route Path | Access / Role | Request Payload | Response Schema | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/register` | Public | `{ name, email, mobile, password, ward }` | `{ success: true, token, user }` | Citizen account creation with bcrypt hashing. |
| `POST` | `/api/login` | Public | `{ identifier, password }` | `{ success: true, token, user }` | Citizen authentication by mobile or email. |
| `POST` | `/api/staff-login` | Public | `{ staffId, password }` | `{ success: true, token, staff }` | Departmental officer authentication with role permissions. |
| `POST` | `/api/auth/demo-login` | Public | `{ role: 'citizen'\|'traffic'\|'doctor'\|'admin' }` | `{ success: true, token, user }` | 1-Click developer persona session switcher. |
| `GET` | `/api/auth/me` | Authenticated | Headers: `Authorization: Bearer <jwt>` | `{ success: true, user }` | Returns active user profile and granted permissions. |
| `PUT` | `/api/auth/profile` | Authenticated | `{ vehicle_number, ward, emergency_contact }` | `{ success: true, message }` | Updates citizen profile metadata. |
| `GET` | `/api/user/activities` | Authenticated | Headers: `Authorization: Bearer <jwt>` | `{ success: true, activities: [] }` | Centralized timeline of user bookings and complaints. |
| `POST` | `/api/auth/logout` | Authenticated | None | `{ success: true, message }` | Invalidates session and records audit event. |

---

## 2. Smart Traffic & ATCS APIs (`backend/routes/traffic.routes.js`, `cv_anpr.routes.js`)
| Method | Route Path | Access / Role | Request Payload | Response Schema | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/traffic/junctions` | Public | Query: `?status=` | `{ success: true, junctions: [] }` | 42 city junctions with congestion scores and coordinates. |
| `GET` | `/api/traffic/signals` | Public | None | `{ success: true, signals: [] }` | Real-time signal phase states and countdown clocks. |
| `POST` | `/api/traffic/signals/override`| Traffic Staff / Admin| `{ signal_id, color, countdown }` | `{ success: true, message }` | Manual override of signal light by authorized officer. |
| `GET` | `/api/traffic/cameras` | Traffic Staff / Admin| None | `{ success: true, cameras: [] }` | CCTV stream URLs, vehicle speeds, and congestion feeds. |
| `POST` | `/api/cv/violations/:id/verify`| Traffic Staff / Admin| `{ status: 'APPROVED'\|'DISMISSED' }`| `{ success: true, message }` | Human-in-the-loop officer signoff on ANPR infractions. |
| `GET` | `/api/traffic/echallan/search`| Public | Query: `?vehicle_number=` | `{ success: true, violations: [] }` | Searches traffic violations by license plate. |
| `POST` | `/api/traffic/echallan/pay` | Citizen / Public | `{ challan_id, payment_method, upi_id }` | `{ success: true, receipt_no, paid_at }` | Instant settlement of traffic penalty via UPI. |

---

## 3. Healthcare, Hospitals & Beds (`backend/routes/hospital.routes.js`, `appointment.routes.js`, `doctor.routes.js`)
| Method | Route Path | Access / Role | Request Payload | Response Schema | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/hospitals` | Public | Query: `?type=&locality=` | `{ success: true, hospitals: [] }` | Hospital directory with specialty tags and contacts. |
| `GET` | `/api/hospital/beds` | Public | None | `{ success: true, beds: [] }` | Real-time ICU, Oxygen, General, and Ventilator bed counts. |
| `GET` | `/api/hospital/bed-categories`| Public | None | `{ success: true, categories: [] }` | Granular availability across 57 ward categories. |
| `GET` | `/api/doctors` | Public | Query: `?department=&hospital_id=` | `{ success: true, doctors: [] }` | Doctor directory filtered by department and hospital. |
| `POST` | `/api/appointments/book-strict`| Citizen | `{ doctor_id, patient_id, appointment_date, time }`| `{ success: true, appointment_id, token_no }` | 20-minute OPD slot booking with conflict prevention. |
| `GET` | `/api/doctor/:id/appointments`| Doctor | Param: `:id` | `{ success: true, appointments: [] }` | Doctor daily OPD patient queue. |
| `POST` | `/api/doctor/consultation`| Doctor | `{ appointment_id, diagnosis, prescription }` | `{ success: true, message }` | Completes consultation and updates EHR chart. |
| `ALL` | `/api/ai/healthcare/analyze` | Public / Staff | Query: `?hospital_id=` | `{ success: true, analysis, hospital }` | Hospital bed occupancy and surge saturation forecast. |

---

## 4. Patient EMR & Ayushman QR Pass (`backend/routes/patient.routes.js`)
| Method | Route Path | Access / Role | Request Payload | Response Schema | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/patients` | Citizen / Staff | `{ full_name, age, gender, mobile, blood_group }` | `{ success: true, patient_id, qr_token }` | Registers patient and generates `P-YYYY-NNNNNN` ID. |
| `GET` | `/api/patients/:patientId` | Owner / Doctor / Staff | Param: `:patientId` | `{ success: true, patient }` | Object-level access controlled patient profile. |
| `GET` | `/api/patients/:patientId/qr`| Owner / Staff | Param: `:patientId` | `{ success: true, qr_code_data }` | Generates privacy-preserving Ayushman QR pass payload. |
| `POST` | `/api/patients/verify-qr` | Public (Masked) / Staff (Full)| `{ qr_token }` | `{ success: true, maskedData \| fullEhr }` | Verifies QR: masked for public; full EHR for doctor. |
| `GET` | `/api/patients/:patientId/records`| Owner / Doctor / Staff| Param: `:patientId` | `{ success: true, records: [] }` | Consultations, clinical diagnoses, and visit history. |

---

## 5. IoT Smart Parking (`backend/routes/parking.routes.js`)
| Method | Route Path | Access / Role | Request Payload | Response Schema | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/parking/lots` | Public | None | `{ success: true, lots: [] }` | Parking lots with vacant/occupied counts. |
| `GET` | `/api/parking/slots` | Public | Query: `?lot_id=` | `{ success: true, slots: [] }` | Visual map of slots across Bays A, B, and C. |
| `POST` | `/api/parking/book` | Citizen | `{ lot_id, vehicleNumber, durationHours }` | `{ success: true, bookingId, qr_ticket }` | Advance parking reservation and ticket creation. |
| `GET` | `/api/parking/my-bookings` | Citizen / Staff | Headers: `Authorization: Bearer <jwt>` | `{ success: true, bookings: [] }` | User-isolated parking reservation history. |
| `POST` | `/api/parking/entry` | Parking Staff | `{ lot_id, vehicle_number, bay }` | `{ success: true, entry_id, barrier: true }` | Barrier check-in via ANPR or manual license plate. |
| `POST` | `/api/parking/exit` | Parking Staff | `{ entry_id \| qr_ticket }` | `{ success: true, fee_due, checkout_time }` | Barrier check-out with automated duration calculation. |

---

## 6. Emergency & Ambulances (`backend/routes/emergency.routes.js`, `ambulance.routes.js`)
| Method | Route Path | Access / Role | Request Payload | Response Schema | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/emergency/sos` | Public | `{ type, lat, lng, mobile }` | `{ success: true, incident_id, eta_mins }` | 1-Tap SOS dispatch to 112/101/108 response units. |
| `GET` | `/api/ambulances` | Public | None | `{ success: true, ambulances: [] }` | Live GPS telemetry for 6 ambulances in Gorakhpur. |
| `POST` | `/api/ambulances/:id/critical-dispatch`| Emergency Staff | `{ destination_hospital }` | `{ success: true, status: 'Critical Transit' }`| Dispatches ambulance into emergency transit corridor. |
| `POST` | `/api/traffic/ambulance-preemption`| Emergency / Traffic | `{ ambulance_id, junction_id }` | `{ success: true, green_wave_active: true }`| Activates 600m radial green wave signal lock. |

---

## 7. Waste & Water SCADA (`backend/routes/waste.routes.js`, `water.routes.js`)
| Method | Route Path | Access / Role | Request Payload | Response Schema | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/waste/bins` | Public | None | `{ success: true, bins: [] }` | RFID dustbin fill level telemetry and GPS coordinates. |
| `POST` | `/api/waste/report` | Citizen | Multipart: `{ description, ward, photo, lat, lng }`| `{ success: true, request_id }` | Geo-tagged illegal dumping photo grievance filing. |
| `POST` | `/api/waste/optimize-route` | Waste Staff / Admin | `{ ward, vehicle_id }` | `{ success: true, waypoints: [] }` | Nearest-neighbor TSP compactor collection routing. |
| `GET` | `/api/water/tanks` | Public | None | `{ success: true, tanks: [] }` | Overhead reservoir water level telemetry. |
| `GET` | `/api/water/anomalies` | Water Staff / Admin | None | `{ success: true, anomalies: [] }` | SCADA burst pipe anomalies (pressure < 1.6 bar). |
| `POST` | `/api/water/tanker-bookings`| Citizen | `{ citizen_name, mobile, address, capacity }` | `{ success: true, booking_id, eta }` | Doorstep potable drinking water tanker booking. |

---

## 8. Police, Tourism & Environment (`backend/routes/police.routes.js`, `famous_places.routes.js`, `environment.routes.js`)
| Method | Route Path | Access / Role | Request Payload | Response Schema | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/police/stations` | Public | None | `{ success: true, stations: [] }` | 16 police thana directory, SHO contacts, jurisdiction map. |
| `POST` | `/api/police/complaints`| Citizen | `{ title, description, station_id }` | `{ success: true, complaint_id, code }` | Online community grievance / e-FIR intake. |
| `GET` | `/api/famous-places` | Public | Query: `?category=` | `{ success: true, places: [] }` | Gorakhpur heritage sites, timings, audio guides. |
| `GET` | `/api/environment/sensors`| Public | None | `{ success: true, sensors: [] }` | Live PM2.5, PM10, temperature, and AQI readings. |

---

## 9. AI Grounded Assistant & Command Center (`backend/routes/ai.routes.js`, `admin.routes.js`)
| Method | Route Path | Access / Role | Request Payload | Response Schema | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/ai/chat` | Public | `{ question, session_id }` | `{ success: true, reply, data_source: "REAL", actionChips: [] }` | Grounded assistant executing 17 allowlisted DB tools. |
| `POST` | `/api/ai/clinical-care/chat`| Doctor (`role: doctor`)| `{ query, patient_id }` | `{ success: true, guidance, citations: [] }` | 7-part clinical decision-support differential advice. |
| `GET` | `/api/admin/command-center`| Admin (`role: admin`) | None | `{ success: true, metrics: { traffic, beds, waste, water, sos } }` | Centralized 360-degree municipal operational desk. |
| `POST` | `/api/admin/what-if-simulation`| Admin (`role: admin`) | `{ scenario, severity }` | `{ success: true, projected_impact }` | Mathematical What-If disaster & VIP simulation. |

---
*End of API Inventory. Document saved to [docs/API_INVENTORY.md](file:///d:/cityai_project%20-%20Copy/docs/API_INVENTORY.md).*
