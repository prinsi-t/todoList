import express from 'express';
import passport from 'passport';
import User from '../models/user.js';
import bcrypt from 'bcrypt';

const router = express.Router();

// Middleware to ensure the user is authenticated
const ensureAuthenticated = (req, res, next) => {
  console.log('Auth check — isAuthenticated:', req.isAuthenticated?.());
  console.log('req.user:', req.user);
  
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
};



// Login Page
router.get('/login', (req, res) => {
  res.render('login', {
    title: 'Login',
    error: req.flash('error'),
  });
});

// Handle Login
router.post(
  '/login',
  passport.authenticate('local', {
    successRedirect: '/todos', // Redirect to the Todo page after successful login
    failureRedirect: '/login', // Redirect back to the login page on failure
    failureFlash: true, // Enable flash messages for login errors
  })
);

// Register Page
router.get('/register', (req, res) => {
  res.render('register', { title: 'Register' });
});

// Register route
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      req.flash('error_msg', 'Email is already registered');
      return res.redirect('/register');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      email: email.trim().toLowerCase(),
      password: hashedPassword,
    });

    await newUser.save();

    // Automatically log in the user after registration
    req.login(newUser, (err) => {
      if (err) {
        console.error(err);
        req.flash('error_msg', 'Error logging in after registration');
        return res.redirect('/login');
      }
      res.redirect('/');
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error during registration');
    res.redirect('/register');
  }
});

// Logout route
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error(err);
      return res.redirect('/');
    }
    req.flash('success_msg', 'You have successfully logged out');
    res.redirect('/login');
  });
});

export default router;

