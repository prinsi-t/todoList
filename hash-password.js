import bcrypt from 'bcrypt';

const password = 'bobbob';

const hashPassword = async () => {
  const hash = await bcrypt.hash(password, 10);
  console.log('New hash for bobbob:', hash);
};

hashPassword();
