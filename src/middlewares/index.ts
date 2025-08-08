import * as sessionUtils from '@utils/sessions';
import * as utils from '@utils';
import { Request, Response, NextFunction } from 'express';
import * as sessionsModel from '@models/sessions';
import * as usersModel from '@models/users';
import { ErrorResponse } from '@root/utils/error-handler';
import moment from 'moment';

export const checkApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { apikey } = req.headers;

  try {
    if (!apikey) {
      throw new ErrorResponse('UNAUTHORIZED', 'Api key is required');
    }

    if (apikey !== process.env.SECRET_KEY) {
      throw new ErrorResponse('UNAUTHORIZED', 'Invalid api key');
    }

    next();
  } catch (err) {
    next(err);
  }
};

export const authenticateUser =
  (isRequired: boolean = true) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const { cookie } = req.headers;
    try {
      if (isRequired === false && !cookie) {
        next();
      } else {
        if (!cookie) {
          throw new ErrorResponse(
            'UNAUTHORIZED',
            'Session expired, please login again'
          );
        }

        const [prefix, sessionToken] = cookie.split('=s%3A');

        if (prefix !== 'sid') {
          throw new ErrorResponse(
            'UNAUTHORIZED',
            'Session expired, please login again'
          );
        }

        if (!sessionToken) {
          throw new ErrorResponse(
            'UNAUTHORIZED',
            'Session expired, please login again'
          );
        }

        const sessionId = sessionUtils.getSessionIdFromToken(sessionToken);

        if (sessionId) {
          const session = await sessionsModel.getSession()(sessionId);

          if (!session) {
            throw new ErrorResponse(
              'UNAUTHORIZED',
              'Failed to authenticate user'
            );
          }

          if (session.revokeType !== null) {
            throw new ErrorResponse(
              'UNAUTHORIZED',
              'Session expired, please login again'
            );
          }

          if (session.revokedAt !== null) {
            throw new ErrorResponse(
              'UNAUTHORIZED',
              'Session expired, please login again'
            );
          }

          if (moment(session.createdAt).add(1, 'days').toDate() <= new Date()) {
            await sessionsModel.updateSession()(sessionId, {
              revokeAt: moment().add(8, 'hours').toDate(),
              revokeType: 'expired',
            });

            throw new ErrorResponse(
              'UNAUTHORIZED',
              'Session expired, please login again'
            );
          }

          const user = await usersModel.getUser()(session.userId);

          if (!user) {
            throw new ErrorResponse(
              'UNAUTHORIZED',
              'Failed to authenticate user'
            );
          }

          req.sessionId = sessionId;
          req.userId = user.userId;
          req.email = user.email;
        } else {
          throw new ErrorResponse(
            'UNAUTHORIZED',
            'Failed to authenticate user'
          );
        }

        next();
      }
    } catch (error) {
      next(error);
    }
  };
