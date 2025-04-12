import express from 'express';
import passport from 'passport';
import User from '../models/user.js';

const router = express.Router();

// Middleware to ensure the user is authenticated
const ensureAuthenticated = (req, res, next) => {
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
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      req.flash('error', info.message);
      return res.redirect('/login');
    }
    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.redirect('/todos');
    });
  })(req, res, next);
});

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

    // Create new user
    const newUser = new User({ 
      email: email.toLowerCase(),
      password: password
    });

    // Save the user
    await newUser.save();

    // Log in the user using passport
    req.login(newUser, (err) => {
      if (err) {
        req.flash('error_msg', 'Error logging in after registration');
        return res.redirect('/login');
      }
      res.redirect('/todos');
    });
  } catch (err) {
    req.flash('error_msg', 'Registration failed. Please try again.');
    res.redirect('/register');
  }
});

// Logout route
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.redirect('/');
    req.flash('success_msg', 'You have successfully logged out');
    res.redirect('/login');
  });
});

export default router;

