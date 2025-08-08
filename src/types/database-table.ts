import * as constants from '@constants';
export type RevokeType = 'sign_out' | 'expired';
export type TokenType = 'reset_password' | 'email_verification';
export type TokenRevokeType = 'used' | 'fraud' | 'canceled' | 'expired';

export type UserRole = 'admin' | 'player';

export type GameEndReason =
  | 'treasure_found'
  | 'trap_stepping'
  | 'reach_move_limit';
export type GameResultCategory = 'win' | 'lost' | 'trapped';

export interface SessionsTable {
  id: number;
  session_id: string;
  user_id: string;
  last_active_at: Date | null;
  revoke_type: RevokeType | null;
  revoked_at: Date | null;
  created_at: Date;
  updated_at: Date | null;
}

export interface UsersTable {
  id: number;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date | null;
}

export interface GamePlaysTable {
  id: number;
  game_play_id: string;
  user_id: string;
  treasure_location: string;
  end_reason: GameEndReason;
  moves: string; // JSON stringify moves array
  score: number;
  created_at: Date;
  updated_at: Date | null;
}
