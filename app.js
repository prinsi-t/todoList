import 'dotenv/config';
import express from 'express';
import path from 'path';
import expressLayouts from 'express-ejs-layouts';
import session from 'express-session';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import todoRoutes from './routes/todoRoutes.js';
import passport from 'passport';
import authRoutes from './routes/authRoutes.js';
import User from './models/user.js';
import './config/passport.js';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize the Express app
const app = express();

// Connect to MongoDB
const mongoURI = process.env.MONGO_URI;
mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Middleware: Body parser
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Middleware: Session management
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Middleware: Static files
app.use(express.static(path.resolve(__dirname, 'public')));

// View Engine: EJS with layouts
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('layout', 'layouts/main');
app.set('views', path.join(__dirname, 'views'));


// Middleware: Make authentication status available in views
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.isAuthenticated?.() || false;
  next();
});

// Middleware: Authentication Routes
app.use(authRoutes);

// Use the todo routes
app.use('/todos', todoRoutes);

// Landing page route
app.get('/', (req, res) => {
  res.render('landing', { title: 'Todo App - Organize Your Life' });
});

// Middleware to ensure the user is authenticated
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
};

// Redirect authenticated users from root to todos
app.get('/', ensureAuthenticated, (req, res) => {
  res.redirect('/todos');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));