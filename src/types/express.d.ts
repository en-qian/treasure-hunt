import * as express from 'express';

// Extend the Request interface from Express
declare global {
  namespace Express {
    interface Request {
      sessionId: string;
      userId: string;
      email: string;
    }
  }
}
