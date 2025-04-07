import { Strategy as LocalStrategy } from 'passport-local';
import User from '../models/user.js';

export default function (passport) {
  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      try {
        console.log('Email:', email);
        console.log('Password:', password);

        const user = await User.findOne({ email });
        if (!user) {
          console.log('User not found'); // Debugging log
          return done(null, false, { message: 'User not found' });
        }

        console.log('User Found:', user); // Debugging log
        console.log('User Password:', user.password);

        if (!user.password) {
          return done(null, false, { message: 'User does not have a local password' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
          console.log('Incorrect password'); // Debugging log
          return done(null, false, { message: 'Incorrect password' });
        }

        return done(null, user);
      } catch (err) {
        console.error('Error in passport strategy:', err);
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
}