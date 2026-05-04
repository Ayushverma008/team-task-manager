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
│   └── .env
├── frontend/
│   ├── index.html      (Login / Signup)
│   ├── dashboard.html  (Overview + Charts)
│   ├── project.html    (Kanban Board)
│   ├── css/style.css
│   └── js/             (api, ui, auth, dashboard, project)
├── package.json        (Root configuration for Railway deployments)
└── .gitignore          
```

---

## Local Setup

### Prerequisites
- Node.js v20+
- MongoDB Atlas cluster URL

### 1. Clone the repo
```bash
git clone <your-repo-url>
cd Ethera
```

### 2. Configure Environment Variables
Inside the `backend/` folder, ensure your `.env` file looks like this:
```env
PORT=5000
# IMPORTANT: Use the legacy long-form MongoDB connection string to bypass local DNS SRV errors
MONGO_URI=mongodb://<your-username>:<your-password>@ac-xxxxxxxx.mongodb.net:27017,ac-xxxxxxxx.mongodb.net:27017/taskmanager?ssl=true&replicaSet=atlas-xxx-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Ethara
JWT_SECRET=your_super_secret_key
```

### 3. Install and run from the ROOT folder
Because we added a `package.json` to the root folder, you can simply run your project entirely from the `C:\Ethera` root folder!

```bash
npm install
npm start
```

Open **http://localhost:5000** in your browser.

---

## Deployment on Railway

Deploying to Railway is incredibly fast. We've equipped the codebase with a root `package.json` which Railway automatically detects. No manual settings required!

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
- Select your repository. Railway automatically detects Node 20!

### 3. Set Environment Variables
In Railway → your new service → **Variables**, you must add:
```
PORT=5000
MONGO_URI=<your-mongodb-atlas-url>
JWT_SECRET=<a-strong-random-secret>
```

### 4. Deploy
Railway will automatically deploy your code using `npm install` and `npm start`. Your app will instantly be live at `https://<your-app>.up.railway.app`!

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
