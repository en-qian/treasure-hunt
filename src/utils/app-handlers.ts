import { Request, Response, NextFunction, Router } from 'express';
import moment from 'moment';

export const requestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = new Date();

  const clientIp =
    req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    req.socket.remoteAddress;

  res.on('finish', () => {
    const startDateTimeString = moment().format(
      'ddd, DD MMM YYYY HH:mm:ss [GMT+0800 (Malaysia Time)]'
    );

    const duration = moment().diff(start, 'milliseconds');

    const requestLogMessage = `${clientIp} ${res.statusCode} ${req.method} ${req.originalUrl} ${duration} ms`;

    console.log(`${startDateTimeString} ${requestLogMessage}`);

    if (
      Object.keys(req.body).length !== 0 &&
      !req.headers.host?.includes('localhost')
    ) {
      console.log(JSON.stringify(req.body, null, 2));
    }
  });

  next();
};

export const otherRouter = Router({ mergeParams: true });

otherRouter.get('*', (req: Request, res: Response) => res.status(404).send());
otherRouter.use((req: Request, res: Response) => res.status(444).send());
