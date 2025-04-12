import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import User from '../models/user.js';

passport.use(
  new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
      console.log('Attempting login for email:', email);
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      
      if (!user) {
        console.log('User not found for email:', email);
        return done(null, false, { message: 'User not found' });
      }
      
      console.log('User found:', user.email);
      console.log('Comparing password for user:', user.email);
      
      const isMatch = await user.matchPassword(password.trim());
      console.log('Password match result:', isMatch);
      
      if (!isMatch) {
        console.log('Password mismatch for user:', user.email);
        return done(null, false, { message: 'Incorrect password' });
      }
      
      console.log('✅ Successful password match for user:', user.email);
      return done(null, user);
    } catch (err) {
      console.error('Error during authentication:', err);
      return done(err);
    }
  })
);

passport.serializeUser((user, done) => {
  console.log('Serializing user:', user.email);
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    console.log('Deserializing user with id:', id);
    const user = await User.findById(id);
    if (!user) {
      console.log('User not found during deserialize');
      return done(new Error('User not found'));
    }
    console.log('User found during deserialize:', user.email);
    done(null, user);
  } catch (err) {
    console.error('Error in deserialize:', err);
    done(err);
  }
});

export default passport;