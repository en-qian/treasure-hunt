import * as express from 'express';
import { authenticateUser } from '@middlewares';
import * as gamePlayControllers from '@controllers/gameplay';

const router = express.Router({ mergeParams: true });

router.post('/', authenticateUser(), gamePlayControllers.recordGamePlay);

router.get('/', authenticateUser(), gamePlayControllers.getGamePlays);

router.get('/:gamePlayId', authenticateUser(), gamePlayControllers.getGamePlay);

export default router;
