# MERN Todo List

This project is now structured as a MERN app:

- **Frontend:** React + Vite + Tailwind CSS (`frontend/`)
- **Backend:** Express + MongoDB (`app.js`)

## Features

- Add, toggle, and delete todos
- REST API with Express
- MongoDB persistence with Mongoose
- Tailwind-based React UI

## Setup 

1. Create a `.env` in the project root:

```env
MONGO_URI=your_mongodb_connection_string
PORT=3000
CLIENT_URL=http://localhost:5173
```

2. Install dependencies:

```bash
npm install
cd frontend && npm install
```

3. Run frontend + backend together from root:

```bash
npm run dev
```

## API Endpoints

- `GET /api/todos` - fetch todos
- `POST /api/todos` - create todo
- `PATCH /api/todos/:id/toggle` - toggle completion
- `DELETE /api/todos/:id` - delete todo

