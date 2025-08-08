import * as userModel from '@models/users';
import * as gamePlayModel from '@models/game-plays';
import * as v from '@utils/validators';
import * as passwordUtils from '@utils/password';
import * as sessionUtils from '@utils/sessions';
import * as usersModel from '@models/users';
import * as sessionsModel from '@models/sessions';
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
