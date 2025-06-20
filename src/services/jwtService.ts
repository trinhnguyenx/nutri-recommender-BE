import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h'; 

export const generateJwt = (payload: any) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyJwt = (token: string): any => {
  return jwt.verify(token, JWT_SECRET);
};
