import * as gamePlayModel from '@models/game-plays';
import * as v from '@utils/validators';
import { UserWebApi } from '@web-api';
import { createController } from '@utils/controllers';
import { ErrorResponse } from '@utils/error-handler';

export const recordGamePlay = createController<UserWebApi.RecordGamePlay>(
  async (req, res) => {
    const { userId } = req;

    const { treasureLocation, gameEndReason, moves, score } = req.body;

    if (!v.min(1, 'string')(treasureLocation)) {
      throw new ErrorResponse('INVALID_PARAMS', 'Invalid treasure location');
    }

    if (
      gameEndReason !== 'reach_move_limit' &&
      gameEndReason !== 'trap_stepping' &&
      gameEndReason !== 'treasure_found'
    ) {
      throw new ErrorResponse('INVALID_PARAMS', 'Invalid game end reason');
    }

    if (!v.isArray(moves) && moves.length < 1) {
      throw new ErrorResponse('INVALID_PARAMS', 'Invalid moves');
    }

    for (const move of moves) {
      if (!v.min(1, 'string')(move)) {
        throw new ErrorResponse('INVALID_PARAMS', `Invalid move: ${move}`);
      }
    }

    if (!v.isInteger(score)) {
      throw new ErrorResponse('INVALID_PARAMS', 'Invalid score');
    }

    const gamePlays = await gamePlayModel.getGamePlays()({
      userId,
      date: new Date(),
    });

    if (gamePlays.length >= 2) {
      throw new ErrorResponse('INVALID_REQUEST', 'Maximum two plays per day');
    }

    const gamePlayId = await gamePlayModel.createGamePlay()({
      userId,
      treasureLocation,
      endReason: gameEndReason,
      moves,
      score,
    });

    return { data: { gamePlayId } };
  }
);

export const getGamePlays = createController<UserWebApi.GetGamePlays>(
  async (req, res) => {
    const { limit, offset } = req.query;

    const numberLimit = limit !== undefined ? Number(limit) : undefined;
    const numberOffset = offset !== undefined ? Number(offset) : undefined;

    if (
      numberLimit !== undefined &&
      !v.isNumber(numberLimit) &&
      !v.isInteger(numberLimit)
    ) {
      throw new ErrorResponse('INVALID_PARAMS', 'Invalid limit');
    }

    if (
      numberOffset !== undefined &&
      !v.isNumber(numberOffset) &&
      !v.isInteger(numberOffset)
    ) {
      throw new ErrorResponse('INVALID_PARAMS', 'Invalid offset');
    }

    const gamePlays = await gamePlayModel.getGamePlays()({
      limit: numberLimit,
      offset: numberOffset,
      userId: req.userId,
    });

    return {
      data: {
        gamePlays: gamePlays.map(gamePlay => ({
          gamePlayId: gamePlay.gamePlayId,
          result:
            gamePlay.endReason === 'treasure_found'
              ? 'win'
              : gamePlay.endReason === 'trap_stepping'
              ? 'trapped'
              : 'lost',
          score: gamePlay.score,
          finalPosition: gamePlay.moves[gamePlay.moves.length - 1]!,
          createdAt: gamePlay.createdAt.toISOString(),
        })),
      },
    };
  }
);

export const getGamePlay = createController<UserWebApi.GetGamePlay>(
  async (req, res) => {
    const { gamePlayId } = req.params;

    const gamePlay = await gamePlayModel.getGamePlay()(gamePlayId);

    if (!gamePlay) {
      throw new ErrorResponse('NOT_FOUND', 'Game play not found');
    }

    return {
      data: {
        result:
          gamePlay.endReason === 'treasure_found'
            ? 'win'
            : gamePlay.endReason === 'trap_stepping'
            ? 'trapped'
            : 'lost',
        score: gamePlay.score,
        finalPosition: gamePlay.moves[gamePlay.moves.length - 1]!,
        moves: gamePlay.moves,
        totalMoves: gamePlay.moves.length,
        treasureLocation: gamePlay.treasureLocation,
        createdAt: gamePlay.createdAt.toISOString(),
      },
    };
  }
);
