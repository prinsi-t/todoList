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
router.post('/login', (req, res, next) => {
  console.log('Login attempt for email:', req.body.email);
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Error during authentication:', err);
      return next(err);
    }
    if (!user) {
      console.log('Login failed:', info.message);
      req.flash('error', info.message);
      return res.redirect('/login');
    }
    req.logIn(user, (err) => {
      if (err) {
        console.error('Error during login:', err);
        return next(err);
      }
      console.log('✅ Successful login for user:', user.email);
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

// Reset bobisbob's password
router.get('/reset-bobisbob', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash('bobisbob', 10);
    await User.updateOne(
      { email: 'bobisbob@bobisbob' },
      { password: hashedPassword }
    );
    res.send('✅ Password reset for bobisbob@bobisbob to "bobisbob"');
  } catch (err) {
    res.status(500).send('❌ Failed to reset password');
  }
});

// Reset boy@gmail.com's password
router.get('/reset-boy', async (req, res) => {
  try {
    // First try to find the user
    let user = await User.findOne({ email: 'boy@gmail.com' });
    
    if (!user) {
      // If user doesn't exist, create it
      console.log('Creating new user boy@gmail.com');
      user = new User({
        email: 'boy@gmail.com',
        password: 'bobisbob'
      });
      await user.save();
      console.log('New user created successfully');
      res.send('✅ Created new user boy@gmail.com with password "bobisbob"');
    } else {
      // If user exists, update the password
      console.log('Updating password for existing user');
      user.password = 'bobisbob';
      await user.save();
      console.log('Password updated successfully');
      res.send('✅ Password reset for boy@gmail.com to "bobisbob"');
    }
  } catch (err) {
    console.error('Error in reset-boy:', err);
    res.status(500).send('❌ Failed to reset password');
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

