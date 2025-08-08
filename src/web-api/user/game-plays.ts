import { GameEndReason, GameResultCategory } from '@root/types/database-table';
import { BaseApi } from '@utils/controllers';

export interface RecordGamePlay extends BaseApi {
  Method: 'POST';
  Route: '/api/user/game-plays';
  ReqParams: {};
  ReqQuery: {};
  ReqBody: {
    treasureLocation: string;
    gameEndReason: GameEndReason;
    /** x1, y1 etc */
    moves: string[];
    score: number;
  };
  ResBody: { gamePlayId: string };
}

export interface GetGamePlays extends BaseApi {
  Method: 'GET';
  Route: '/api/user/game-plays';
  ReqParams: {};
  ReqQuery: { limit?: string; offset?: string };
  ReqBody: {};
  ResBody: {
    gamePlays: {
      gamePlayId: string;
      result: GameResultCategory;
      score: number;
      finalPosition: string;
      createdAt: string;
    }[];
  };
}

export interface GetGamePlay extends BaseApi {
  Method: 'GET';
  Route: '/api/user/game-plays/:gamePlayId';
  ReqParams: { gamePlayId: string };
  ReqQuery: {};
  ReqBody: {};
  ResBody: {
    result: GameResultCategory;
    score: number;
    finalPosition: string;
    treasureLocation: string;
    totalMoves: number;
    moves: string[];
    createdAt: string;
  };
}
