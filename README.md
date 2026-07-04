# MERN Todo List

A modern, full-stack task management app with React frontend and Express backend.

**Live Demo:**
 [Vercel](https://taskflow-sooty-eight.vercel.app)


## Features

### Core Features
- ✅ Add, toggle, and delete todos
- ✅ Organize tasks by due date and list
- ✅ Sticky notes wall for quick notes
- ✅ Calendar view to visualize tasks by date
- ✅ Upcoming tasks view
- ✅ User authentication (email/password + Google OAuth)
- ✅ Responsive design with hamburger menu for mobile

### Tech Stack
- **Frontend:** React + Vite + Tailwind CSS (`frontend/`)
- **Backend:** Express + MongoDB/Mongoose (`app.js`)
- **Auth:** JWT + bcrypt + Google OAuth
- **Deployments:**
  - Backend: Render
  - Frontend: Vercel

## Local Setup

1. Create a `.env` file in **project root**:

```env
MONGO_URI=your_mongodb_connection_string
PORT=3000
CLIENT_URL=http://localhost:5173
JWT_SECRET=your_long_jwt_secret_here
GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

2. Create a `.env` file in **frontend/**:

```env
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
VITE_API_URL=http://localhost:3000
```

3. Install dependencies:

```bash
npm install
cd frontend && npm install
```

4. Run the app locally:

```bash
npm run dev
```
(This starts both backend on :3000 and frontend on :5173)

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/google` - Google OAuth login
- `GET /api/auth/me` - Get current user

### Todos
- `GET /api/todos` - Fetch user's todos
- `POST /api/todos` - Create todo
- `PATCH /api/todos/:id/toggle` - Toggle todo completion
- `DELETE /api/todos/:id` - Delete todo

### Sticky Notes
- `GET /api/stickies` - Fetch user's stickies
- `POST /api/stickies` - Create sticky note
- `PATCH /api/stickies/:id` - Update sticky note
- `DELETE /api/stickies/:id` - Delete sticky note
