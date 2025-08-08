import * as v from '@utils/validators';
import * as passwordUtils from '@utils/password';
import * as sessionUtils from '@utils/sessions';
import * as usersModel from '@models/users';
import * as sessionsModel from '@models/sessions';
import { AuthWebApi } from '@web-api';
import { createController } from '@utils/controllers';
import { ErrorResponse } from '@utils/error-handler';

export const initialize = createController<AuthWebApi.Initialize>(
  async (req, res) => {
    return {
      data: {
        userId: req.userId,
        email: req.email,
      },
    };
  }
);

export const login = createController<AuthWebApi.Login>(async (req, res) => {
  const { email, password } = req.body;

  if (!v.isEmail(email)) {
    throw new ErrorResponse('INVALID_PARAMS', 'Invalid email');
  }

  if (!v.isValidPasswordFormat(password, 8)) {
    throw new ErrorResponse('INVALID_PARAMS', 'Invalid password');
  }

  const user = await usersModel.getUserByEmail()(email);

  if (!user) {
    throw new ErrorResponse('UNAUTHORIZED', 'Invalid email or password');
  }

  if (!user.password) {
    throw new ErrorResponse('UNAUTHORIZED', 'Invalid email or password');
  }

  const isMatch = await passwordUtils.comparePassword(password, user.password);

  if (!isMatch) {
    throw new ErrorResponse('UNAUTHORIZED', 'Invalid username or password');
  }

  const sessionId = await sessionsModel.createSession()({
    userId: user.userId,
  });

  sessionUtils.setSessionCookie(sessionId, res);

  const sessionToken = sessionUtils.signSessionToken(sessionId);

  return { data: { sessionToken } };
});

export const register = createController<AuthWebApi.Register>(
  async (req, res) => {
    const { email, firstName, lastName, password } = req.body;

    if (!v.isEmail(email)) {
      throw new ErrorResponse('INVALID_PARAMS', 'Invalid email');
    }

    if (!v.min(1, 'string')(firstName)) {
      throw new ErrorResponse('INVALID_PARAMS', 'Invalid first name');
    }

    if (!v.min(1, 'string')(lastName)) {
      throw new ErrorResponse('INVALID_PARAMS', 'Invalid last name');
    }

    if (!v.isValidPasswordFormat(password, 8)) {
      throw new ErrorResponse('INVALID_PARAMS', 'Invalid password');
    }

    const user = await usersModel.getUserByEmail()(email);

    if (user) {
      throw new ErrorResponse(
        'UNAUTHORIZED',
        'Email has been registered, please log in or registered with a new email'
      );
    }

    const hashedPassword = await passwordUtils.hash(password);

    const userId = await usersModel.createUser()({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });

    return { data: { userId } };
  }
);

export const getProfile = createController<AuthWebApi.GetProfile>(
  async (req, res) => {
    const { userId } = req;

    const user = await usersModel.getUser()(userId);

    if (!user) {
      throw new ErrorResponse('UNAUTHORIZED', 'Unable to get profile');
    }

    return {
      data: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    };
  }
);

export const updateProfile = createController<AuthWebApi.UpdateProfile>(
  async (req, res) => {
    const { firstName, lastName } = req.body;

    if (!v.min(1, 'string')(firstName)) {
      throw new ErrorResponse('INVALID_PARAMS', 'Invalid first name');
    }

    if (!v.min(1, 'string')(lastName)) {
      throw new ErrorResponse('INVALID_PARAMS', 'Invalid last name');
    }

    const userId = req.userId;

    await usersModel.updateUser()(userId, {
      firstName: firstName,
      lastName: lastName,
    });

    return { statusCode: 204 };
  }
);

export const logout = createController<AuthWebApi.Logout>(async (req, res) => {
  const sessionId = req.sessionId;

  await sessionsModel.updateSession()(sessionId, {
    revokeType: 'sign_out',
    revokeAt: new Date(),
    lastActiveAt: new Date(),
  });

  sessionUtils.removeSessionCookie(res);

  return { statusCode: 204 };
});
