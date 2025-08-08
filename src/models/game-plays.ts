import * as dbUtils from '@utils/database';
import * as utils from '@utils';
import { GameEndReason } from '@root/types/database-table';

const { dbQuery, getInsertQuery, getSelectQuery } = dbUtils;

export const createGamePlay =
  (query = dbQuery) =>
  async (payload: {
    userId: string;
    treasureLocation: string;
    endReason: GameEndReason;
    moves: string[];
    score: number;
  }) => {
    const gamePlayId = utils.generateId(40, true);

    const { runQuery } = getInsertQuery('game_plays', {
      game_play_id: gamePlayId,
      user_id: payload.userId,
      treasure_location: payload.treasureLocation,
      end_reason: payload.endReason,
      moves: JSON.stringify(payload.moves),
      score: payload.score,
      updated_at: null,
    });

    await runQuery(query);

    return gamePlayId;
  };

export const getGamePlays =
  (query = dbQuery) =>
  async (options?: {
    gamePlayId?: string | string[];
    userId?: string | string[];
    limit?: number;
    offset?: number;
    date?: Date;
  }) => {
    const { runQuery } = getSelectQuery('game_plays').select(
      '*',
      {
        'game_plays.game_play_id': options?.gamePlayId,
        'game_plays.user_id': options?.userId,
        'game_plays.created_at': {
          type: 'between',
          value: [options?.date, options?.date],
        },
      },
      {
        limit: options?.limit,
        offset: options?.offset,
        orderBy: 'DESC',
        sortBy: 'game_plays.created_at',
      }
    );

    const gamePlays = await runQuery(query);

    return gamePlays.map(gamePlay => ({
      id: gamePlay.id,
      gamePlayId: gamePlay.game_play_id,
      userId: gamePlay.game_play_id,
      treasureLocation: gamePlay.treasure_location,
      endReason: gamePlay.end_reason,
      moves: JSON.parse(gamePlay.moves) as string[],
      score: gamePlay.score,
      createdAt: gamePlay.created_at,
      updatedAt: gamePlay.updated_at,
    }));
  };

export const getGamePlay =
  (query = dbQuery) =>
  async (gamePlayId: string) => {
    const { runQuery } = getSelectQuery('game_plays').select('*', {
      'game_plays.game_play_id': gamePlayId,
    });

    const gamePlays = await runQuery(query);

    const gamePlay = gamePlays[0];

    if (!gamePlay) return null;

    return {
      id: gamePlay.id,
      gamePlayId: gamePlay.game_play_id,
      userId: gamePlay.game_play_id,
      treasureLocation: gamePlay.treasure_location,
      endReason: gamePlay.end_reason,
      moves: JSON.parse(gamePlay.moves) as string[],
      score: gamePlay.score,
      createdAt: gamePlay.created_at,
      updatedAt: gamePlay.updated_at,
    };
  };

export const getGameLeaderBoard =
  (query = dbQuery) =>
  async () => {
    const { runQuery } = getSelectQuery('game_plays')
      .leftJoin('users', 'users.user_id = game_plays.user_id')
      .select(
        {
          gamePlayId: 'game_plays.game_play_id',
          endReason: 'game_plays.end_reason',
          userId: 'game_plays.user_id',
          firstName: 'users.first_name',
          lastName: 'users.last_name',
          score: 'game_plays.score',
          createdAt: 'game_plays.created_at',
        },
        {},
        {
          limit: 10,
          offset: 0,
          orderBy: 'DESC',
          sortBy: 'game_plays.score',
        }
      );

    return await runQuery(query);
  };
