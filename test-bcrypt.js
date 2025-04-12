import bcrypt from 'bcrypt';

const test = async () => {
  const isMatch = await bcrypt.compare('bobbob', '$2b$10$GKQROKFoNzjMtrxkiAXiue.v0D5LZkRJ8X0bS3i1r5sTIRHqEGtEy');
  console.log('Match:', isMatch);
};

test();
