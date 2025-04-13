import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/user.js';

// Local Strategy
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

// Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // Check if user exists with same email
          user = await User.findOne({ email: profile.emails[0].value });
          
          if (user) {
            // Link Google account to existing user
            user.googleId = profile.id;
            await user.save();
          } else {
            // Create new user
            user = await User.create({
              googleId: profile.id,
              email: profile.emails[0].value,
              displayName: profile.displayName,
            });
          }
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
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