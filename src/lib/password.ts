import bcrypt from "bcryptjs";

// Пароли храним только в виде bcrypt-хэша. В открытом виде — нигде.
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
