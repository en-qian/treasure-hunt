import './dotenv-loader';
import app from './app';
import http from 'http';
import { sqlConfig } from '@config/sql-config';
import * as sql from 'mssql';

const PORT = Number(process.env.PORT) || 3000;

const connectToSql = async () => {
  try {
    await sql.connect(sqlConfig);

    console.log('Connected to SQL Server successfully');
  } catch (error) {
    console.error('Error connecting to SQL Server:', error);
  }
};

(async () => {
  try {
    await connectToSql();

    const httpServer = http.createServer(app);

    httpServer.listen(PORT, '0.0.0.0', async () => {
      console.log(`Server is running on port ${PORT} at ${new Date()}`);
    });
  } catch (error) {
    console.log(error);
  }
})();
