# TaskFlow – Team Task Manager

A full-stack collaborative task management web application built with Node.js, Express, MongoDB, and Vanilla JS.

## 🚀 Live Demo
> Deploy to Railway (see Deployment section below)

---

## Features

- 🔐 **JWT Authentication** – Signup / Login
- 📁 **Project Management** – Create projects, manage members
- ✅ **Task Management** – Kanban board with drag & drop (To Do / In Progress / Done)
- 📊 **Dashboard** – Stats, charts, overdue tracking
- 👥 **Role-Based Access** – Admin (full control) / Member (view & update status)

---

## Tech Stack

| Layer     | Technology          |
|-----------|---------------------|
| Backend   | Node.js + Express   |
| Database  | MongoDB (Mongoose)  |
| Auth      | JWT                 |
| Frontend  | HTML + CSS + Vanilla JS |
| Hosting   | Railway             |

---

## Project Structure

```
├── backend/
│   ├── config/db.js
│   ├── middleware/auth.js
│   ├── models/         (User, Project, Task)
│   ├── routes/         (auth, projects, tasks)
│   ├── server.js
│   └── .env.example
└── frontend/
    ├── index.html      (Login / Signup)
    ├── dashboard.html  (Overview + Charts)
    ├── project.html    (Kanban Board)
    ├── css/style.css
    └── js/             (api, ui, auth, dashboard, project)
```

---

## Local Setup

### Prerequisites
- Node.js v18+
- MongoDB (local or [MongoDB Atlas](https://cloud.mongodb.com))

### 1. Clone the repo
```bash
git clone <your-repo-url>
cd Ethera
```

### 2. Install backend dependencies
```bash
cd backend
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env
```
Edit `.env`:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/taskmanager
JWT_SECRET=your_super_secret_key
```

### 4. Start the development server
```bash
node server.js
```

Open **http://localhost:5000** in your browser.

---

## Deployment on Railway

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo>
git push -u origin main
```

### 2. Create Railway Project
- Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
- Select your repository

### 3. Add MongoDB
- In Railway dashboard → **+ New** → **Database** → **MongoDB**
- Copy the `MONGO_PUBLIC_URL` connection string

### 4. Set Environment Variables
In Railway → your service → **Variables**:
```
PORT=5000
MONGO_URI=<your-railway-mongodb-url>
JWT_SECRET=<a-strong-random-secret>
```

### 5. Set the Root Directory
In Railway → **Settings** → **Root Directory** → set to `backend`

### 6. Deploy
Railway will auto-deploy. Your app will be live at `https://<your-app>.railway.app`

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | ❌ | Register |
| POST | `/api/auth/login` | ❌ | Login |
| GET | `/api/auth/me` | ✅ | Current user |
| POST | `/api/projects` | ✅ | Create project |
| GET | `/api/projects` | ✅ | List projects |
| GET | `/api/projects/:id` | ✅ | Get project |
| POST | `/api/projects/:id/members` | ✅ Admin | Add member |
| DELETE | `/api/projects/:id/members/:uid` | ✅ Admin | Remove member |
| GET | `/api/projects/:id/dashboard` | ✅ | Dashboard stats |
| GET | `/api/projects/:id/tasks` | ✅ | List tasks |
| POST | `/api/projects/:id/tasks` | ✅ Admin | Create task |
| PATCH | `/api/tasks/:id` | ✅ | Update task |
| DELETE | `/api/tasks/:id` | ✅ Admin | Delete task |

---

## Role Permissions

| Action | Admin | Member |
|--------|-------|--------|
| Create/delete tasks | ✅ | ❌ |
| Update task status | ✅ | ✅ |
| Add/remove members | ✅ | ❌ |
| View project & tasks | ✅ | ✅ |
