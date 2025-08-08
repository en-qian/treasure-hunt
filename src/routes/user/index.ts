import * as express from 'express';
import gamePlayRouter from './game-plays';

const router = express.Router({ mergeParams: true });

router.use('/game-plays', gamePlayRouter);

export default router;
