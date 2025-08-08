import * as TreasureGameTable from './database-table';

export interface TreasureGameDatabase {
  sessions: TreasureGameTable.SessionsTable;
  users: TreasureGameTable.UsersTable;
  game_plays: TreasureGameTable.GamePlaysTable;
}

export default TreasureGameDatabase;
