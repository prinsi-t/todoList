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

    // Create new user
    const newUser = new User({ 
      email: email.toLowerCase(),
      password: password // The password will be hashed by the pre-save middleware
    });

    // Save the user
    await newUser.save();
    console.log('New user created:', newUser);

    // Log in the user using passport
    req.login(newUser, (err) => {
      if (err) {
        console.error('Error during auto-login after registration:', err);
        req.flash('error_msg', 'Error logging in after registration');
        return res.redirect('/login');
      }
      console.log('User successfully logged in after registration');
      res.redirect('/todos');
    });
  } catch (err) {
    console.error('Error during registration:', err);
    req.flash('error_msg', 'Registration failed. Please try again.');
    res.redirect('/register');
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


router.get('/test-bob-password', async (req, res) => {
  try {
    const user = await User.findOne({ email: 'bob@bob' });
    if (!user) return res.send('❌ Bob user not found');

    const isMatch = await bcrypt.compare('bobbob', user.password); // or whatever password you think is correct
    console.log('Bob password match:', isMatch);

    res.send(`🔍 Bob password match: ${isMatch}`);
  } catch (err) {
    console.error('Error testing Bob password:', err);
    res.status(500).send('❌ Error checking password');
  }
});


router.get('/reset-bob-password', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash('bobbob', 10);
    await User.updateOne(
      { email: 'bob@bob' },
      { password: hashedPassword }
    );
    res.send('✅ Password reset for bob@bob to "bobbob"');
  } catch (err) {
    console.error('Error resetting Bob password:', err);
    res.status(500).send('❌ Failed to reset Bob password');
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

