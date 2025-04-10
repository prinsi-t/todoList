import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import expressLayouts from 'express-ejs-layouts';
import session from 'express-session';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import todoRoutes from './routes/todoRoutes.js';
import passport from 'passport';
import initializePassport from './config/passport.js';
import authRoutes from './routes/authRoutes.js';
import flash from 'connect-flash';
import LocalStrategy from 'passport-local';
import User from './models/user.js';  // Assuming User model is defined in models/User.js

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

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

// Middleware: Flash messages
app.use(flash());


// Middleware: Static files
app.use(express.static(path.resolve(__dirname, 'public')));

// View Engine: EJS with layouts
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('layout', 'layouts/main');
app.set('views', path.join(__dirname, 'views'));


// Middleware: Make flash messages available in views
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.isAuthenticated?.() || false; // Check if user is authenticated
  next();
});


passport.use(
  new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return done(null, false, { message: 'User not found' });
      }

      console.log('User Found:', user); // Debugging log

      if (!user.password) {
        console.log('User does not have a local password'); // Debugging log
        return done(null, false, { message: 'User does not have a local password' });
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        console.log('Incorrect password'); // Debugging log
        return done(null, false, { message: 'Incorrect password' });
      }

      return done(null, user);
    } catch (err) {
      console.error('Error in passport strategy:', err);
      return done(err);
    }
  })
);

// Middleware: Authentication Routes
app.use(authRoutes);

// Use the todo routes
app.use('/', todoRoutes);

// Redirect root `/` to `/todos` (or login if not authenticated)
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/todos'); // Redirect to Todo list if logged in
  }
  res.redirect('/login'); // Redirect to login if not authenticated
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));