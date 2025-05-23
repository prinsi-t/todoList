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
  res.render('login', { title: 'Login' });
});

// Handle Login
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.redirect('/login');
    }
    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.redirect('/todos');
    });
  })(req, res, next);
});

// Google OAuth Routes
router.get(
  '/auth/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account'  // This will always show the account selector
  })
);

router.get(
  '/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login'
  }),
  (req, res) => {
    res.redirect('/todos');
  }
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
      return res.redirect('/login');
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
        return res.redirect('/login');
      }
      res.redirect('/todos');
    });
  } catch (err) {
    res.redirect('/register');
  }
});

// Logout route
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.redirect('/');
    res.redirect('/login');
  });
  
});

export default router;
