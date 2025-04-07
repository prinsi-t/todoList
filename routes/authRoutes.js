import express from 'express';
import passport from 'passport';
import User from '../models/user.js';

const router = express.Router();

// Login Page
router.get('/login', (req, res) => {
  res.render('login', { title: 'Login' });
});

// Handle Login
router.post(
  '/login',
  passport.authenticate('local', {
    successRedirect: '/', // Redirect to the dashboard after successful login
    failureRedirect: '/login', // Redirect back to the login page on failure
    failureFlash: true, // Enable flash messages for login errors
  })
);

// Register Page
router.get('/register', (req, res) => {
  res.render('register', { title: 'Register' });
});


router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send('Email and password are required');
  }

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).send('User already exists');
    }

    const user = new User({ email, password }); // Password will be hashed in pre-save hook
    await user.save();

    // Optional: Auto-login after registration
    req.login(user, (err) => {
      if (err) throw err;
      return res.redirect('/dashboard');
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).send('Server error');
  }
});

// Handle Registration
// router.post('/register', async (req, res) => {
//   const { email, password } = req.body;
//   try {
//     if (!email || !password) {
//       req.flash('error_msg', 'Please fill in all fields');
//       return res.redirect('/register');
//     }

//     const userExists = await User.findOne({ email });
//     if (userExists) {
//       req.flash('error_msg', 'Email is already registered');
//       return res.redirect('/register');
//     }

//     const user = new User({ email, password });
//     await user.save();
//     req.flash('success_msg', 'You are now registered and can log in');
//     res.redirect('/login');
//   } catch (err) {
//     console.error(err);
//     req.flash('error_msg', 'Something went wrong. Please try again.');
//     res.redirect('/register');
//   }
// });

// Logout
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error(err);
    }
    res.redirect('/login');
  });
});

export default router;