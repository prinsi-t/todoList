import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt'; // Import bcrypt for password comparison
import User from '../models/user.js'; // Adjust the path to your User model

passport.use(
  new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
      const sanitizedEmail = email.trim().toLowerCase();
      const sanitizedPassword = password.trim();

      const user = await User.findOne({ email: sanitizedEmail });
      if (!user) {
        console.log('User not found');
        return done(null, false, { message: 'User not found' });
      }

      console.log('User Found:', user); // Debugging log
      console.log('Entered Password:', sanitizedPassword); // Debugging log
      console.log('Stored Hashed Password:', user.password); // Debugging log

      // Compare the entered password with the hashed password
      const isMatch = await bcrypt.compare(sanitizedPassword, user.password);
      console.log('Password Match:', isMatch); // Debugging log

      if (!isMatch) {
        console.log('Incorrect password');
        return done(null, false, { message: 'Incorrect password' });
      }

      return done(null, user);
    } catch (err) {
      console.error('Error during authentication:', err);
      return done(err);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  console.log('Deserializing user with id:', id);
  try {
    const user = await User.findById(id);
    console.log('User found during deserialize:', user);
    done(null, user);
  } catch (err) {
    console.error('Error in deserialize:', err);
    done(err);
  }
});

// Example usage of bcrypt.compare for testing
const plainPassword = 'bobbob'; // Replace with the password you are testing
const hashedPassword = '$2b$10$GKQROKFoNzjMtrxkiAXiue.v0D5LZkRJ8X0bS3i1r5sTIRHqEGtEy'; // Replace with the hash from your database

bcrypt.compare(plainPassword, hashedPassword, (err, isMatch) => {
  if (err) {
    console.error('Error comparing passwords:', err);
  } else {
    console.log('Password Match:', isMatch);
  }
});

export default passport;