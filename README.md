# Vehicle Parking Management System

A campus parking management app with a React frontend and Firebase (Auth + Firestore). An optional Express backend exists in this repo but is not required for the default Firebase-first setup.

## 🚀 What’s Included

- Firebase Email/Password authentication
- Role-based access (superadmin, standard)
- Faculty/Student registration fields (employeeId/studentId)
- Parking slot management: 80 slots across 5 sections
- Firestore-backed bookings: create, view “My Bookings”, cancel
- Clean routing (React Router) and notifications (React Toastify)

## 🏗️ Architecture

- Frontend: React 18 (Create React App), React Router, Firebase Auth, Firestore
- Data: Firestore collections for users, parkingSlots, bookings
- Backend (optional): Express + MongoDB Memory Server for future expansion; not used by default and not proxied by the frontend

## ⚙️ Setup

Prerequisites
- Node.js 16+ and npm

Frontend
- Config lives in `frontend/src/config/firebase.js`
- Dev server port is set via `frontend/.env` (default `PORT=3001`)

Install & run (choose one):
- VS Code task: “frontend: dev”
- Or terminal from `frontend/`: `npm install`, then `npm start` (honors PORT=3001)

App URL: http://localhost:3001

## 🔐 Roles

- Default role on sign-up is “standard”.
- To grant admin access, set the user’s document in Firestore at `users/{uid}` with `role: "superadmin"`.
- Admin-only pages are gated behind this role.

## 🚘 Parking & Bookings

- 80 slots seeded across 5 sections; visual grid with filters
- Book by selecting section, slot, start/end time, and vehicle number
- View and cancel your bookings in “My Bookings”

Note: Availability updates are stored in Firestore. The UI fetches fresh data on navigation and actions.

## 🧭 Project Structure

- `frontend/` – React app (primary entry point)
- `backend/` – Optional Express server (not required for Firebase mode)
- `.vscode/tasks.json` – Run tasks (frontend dev, optional backend dev)

## ▶️ Running with VS Code Tasks

- Frontend: run task “frontend: dev”
- Backend (optional): run task “backend: dev (optional)”

By default, the frontend does not proxy to the backend, and all auth/booking data uses Firebase.

## 🧩 Optional Backend

If you want to explore the Express server:
- From `backend/`: `npm install`, then `npm run dev`
- API will serve on http://localhost:5000
- The frontend is not wired to this API by default (no CRA proxy)

## 🔧 Scripts (Frontend)

- `npm start` – Start dev server (port 3001 via `.env`)
- `npm run build` – Production build
- `npm test` – Tests (if present)

## 🛠️ Configuration

- Firebase config: `frontend/src/config/firebase.js`
- Dev server port: `frontend/.env`

## 🧯 Troubleshooting

- Port in use: stop Node processes, then retry. On Windows PowerShell:
	- Get PIDs: `Get-Process | Where-Object { $_.ProcessName -eq "node" }`
	- Kill a PID: `taskkill /PID <PID> /F`
- If CRA hot-reload is stuck, restart the dev task and refresh the browser.

## 🤝 Contributing

1. Create a feature branch
2. Commit and push
3. Open a PR

## 📄 License

MIT — see LICENSE for details.
