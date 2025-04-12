// update-password.js

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from './models/user.js'; // Adjust path if needed

const MONGODB_URI = 'mongodb+srv://tprincy56:jIs5PE0l8Dsr0w2x@todo.utn9t.mongodb.net/?retryWrites=true&w=majority&appName=todo'; // Replace with your DB name

const updatePassword = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const email = 'bob@bob';
    const newPlainPassword = 'bobbob';

    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    const newHashedPassword = await bcrypt.hash(newPlainPassword, 10);
    user.password = newHashedPassword;

    await user.save();
    console.log('✅ Password updated successfully');

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
};

updatePassword();
