import * as dbUtils from '@utils/database';
import { generateId } from '@root/utils';
import { RevokeType } from '@root/types/database-table';

const {
  dbQuery,
  getInsertQuery,
  getSelectQuery,
  getUpdateQuery,
  getDeleteQuery,
} = dbUtils;

export const createSession =
  (query = dbQuery) =>
  async (payload: {
    userId: string;
    lastActiveAt?: Date;
    revokeType?: RevokeType;
    revokeAt?: Date;
  }) => {
    const sessionId = generateId(40, true);

    await getInsertQuery('sessions', {
      session_id: sessionId,
      user_id: payload.userId,
      last_active_at: new Date(),
      revoke_type: payload.revokeType || null,
      revoked_at: payload.revokeAt || null,
      updated_at: new Date(),
    }).runQuery(query);

    return sessionId;
  };

export const getSession =
  (query = dbQuery) =>
  async (sessionId: string) => {
    const { runQuery, selectStatement } = await getSelectQuery('sessions')
      .leftJoin('users', 'users.user_id = sessions.user_id')
      .select(
        {
          sessionId: 'sessions.session_id',
          lastActiveAt: 'sessions.last_active_at',
          revokeType: 'sessions.revoke_type',
          revokedAt: 'sessions.revoked_at',
          userId: 'sessions.user_id',
          email: 'users.email',
          firstName: 'users.first_name',
          lastName: 'users.last_name',
          role: 'users.role',
          createdAt: 'sessions.created_at',
          updatedAt: 'sessions.updated_at',
        },
        {
          'sessions.session_id': sessionId,
        }
      );

    const sessions = await runQuery(query);

    const session = sessions[0];

    if (!session) {
      return null;
    }

    return session;
  };

export const updateSession =
  (query = dbQuery) =>
  async (
    sessionId: string,
    payload: {
      lastActiveAt?: Date;
      revokeType?: RevokeType;
      revokeAt?: Date;
    }
  ) => {
    if (sessionId.length < 1) {
      return;
    }

    await getUpdateQuery(
      'sessions',
      {
        last_active_at: payload.lastActiveAt,
        revoked_at: payload.revokeAt,
        revoke_type: payload.revokeType,
        updated_at: 'NOW()',
      },
      {
        session_id: sessionId,
      }
    ).runQuery(query);
  };

export const deleteSession =
  (query = dbQuery) =>
  async (sessionId: string) => {
    if (sessionId.length < 1) {
      return;
    }

    await getDeleteQuery('sessions', {
      session_id: sessionId,
    }).runQuery(query);
  };
