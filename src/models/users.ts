import * as dbUtils from '@utils/database';
import * as utils from '@utils';

const { dbQuery, getSelectQuery, getInsertQuery, getUpdateQuery } = dbUtils;

export const getUser =
  (query = dbQuery) =>
  async (userId: string) => {
    const users = await getSelectQuery('users')
      .select(
        {
          userId: 'user_id',
          firstName: 'first_name',
          lastName: 'last_name',
          email: 'email',
          password: 'password',
          role: 'role',
          created_at: 'created_at',
          updated_at: 'updated_at',
        },
        {
          'users.user_id': userId,
        }
      )
      .runQuery(query);

    const user = users[0];

    if (!user) {
      return null;
    }

    return user;
  };

export const getUserByEmail =
  (query = dbQuery) =>
  async (email: string) => {
    const users = await getSelectQuery('users')
      .select(
        {
          userId: 'user_id',
          firstName: 'first_name',
          lastName: 'last_name',
          email: 'email',
          password: 'password',
          role: 'role',
          created_at: 'created_at',
          updated_at: 'updated_at',
        },
        {
          'users.email': email,
        }
      )
      .runQuery(query);

    const user = users[0];

    if (!user) {
      return null;
    }

    return user;
  };

export const getUsers =
  (query = dbQuery) =>
  async (options?: { userId?: string | string[] }) => {
    const users = await getSelectQuery('users')
      .select(
        {
          userId: 'user_id',
          firstName: 'first_name',
          lastName: 'last_name',
          email: 'email',
          password: 'password',
          role: 'role',
          created_at: 'created_at',
          updated_at: 'updated_at',
        },
        {
          'users.user_id': options?.userId,
        }
      )
      .runQuery(query);

    return users;
  };

export const updateUser =
  (query = dbQuery) =>
  async (
    userId: string | string[],
    payload: {
      firstName?: string;
      lastName?: string;
      password?: string;
    }
  ) => {
    if (userId?.length < 1) {
      return;
    }

    await getUpdateQuery(
      'users',
      {
        first_name: payload.firstName,
        last_name: payload.lastName,
        password: payload.password,
        updated_at: 'NOW()',
      },
      {
        user_id: userId,
      }
    ).runQuery(query);
  };

export const createUser =
  (query = dbQuery) =>
  async (payload: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => {
    const userId = utils.generateId(40, true);

    const { runQuery } = getInsertQuery('users', {
      user_id: userId,
      first_name: payload.firstName,
      last_name: payload.lastName,
      email: payload.email,
      password: payload.password,
      role: 'player',
      updated_at: null,
    });

    await runQuery(query);

    return userId;
  };
