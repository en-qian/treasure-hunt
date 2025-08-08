import * as express from 'express';
import { authenticateUser } from '@middlewares';
import * as gamePlayControllers from '@controllers/gameplay';

const router = express.Router({ mergeParams: true });

router.post('/', authenticateUser(), gamePlayControllers.recordGamePlay);

export default router;
