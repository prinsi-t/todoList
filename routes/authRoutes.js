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
    console.log('Plain password:', password);
    console.log('Hashed password during registration:', hashedPassword);

    // Create new user
    const newUser = new User({ email, password: hashedPassword });
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
    console.error('Error during registration:', err);
    res.status(500).send('Registration failed.');
  }
});

// ⚠️ TEMPORARY: Reset password for testing
// Visit: http://localhost:3000/reset-password (once only!)
router.get('/reset-password', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash('princy56', 10); // replace 'yourNewPassword' with what you want
    await User.updateOne(
      { email: 'tprincy56@gmail.com' },
      { password: hashedPassword }
    );
    res.send('✅ Password reset for tprincy56@gmail.com');
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).send('❌ Failed to reset password');
  }
});

router.get('/test-password', async (req, res) => {
  const user = await User.findOne({ email: 'tprincy56@gmail.com' });
  const isMatch = await bcrypt.compare('princy56', user.password);
  res.send(`Match: ${isMatch}`);
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

