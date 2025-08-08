import express from 'express';
import router from '@routes';
import cors from 'cors';
import { errorHandler } from '@utils/error-handler';
import { requestHandler, otherRouter } from '@utils/app-handlers';
import cookieParser from 'cookie-parser';
import { checkApiKey } from '@middlewares';

const app = express();

app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));

app.use(
  cors({
    origin: ['http://localhost:3000'],
    credentials: true,
  })
);

app.use(requestHandler);

app.use('/api', checkApiKey, router);

app.use(errorHandler);

app.use(otherRouter);

export default app;
