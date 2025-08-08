import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export const hash = async (password: string) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = (password: string, hashedPassword: string) => {
  return bcrypt.compare(password, hashedPassword);
};
