import { NextFunction, Request, Response } from 'express';

import { verifyJwt } from '../services/jwtService';

interface AuthenticatedRequest extends Request {
  user?: string | object;
}

const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    const decoded = verifyJwt(token);
    if (!decoded) {
      res.sendStatus(401);
      return;
    }
    req.user = decoded;
    next();
  } else {
    res.sendStatus(401);
  }
};

export default authenticateJWT;
