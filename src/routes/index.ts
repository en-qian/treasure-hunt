import * as express from 'express';
import authRouter from './auth';
import userRouter from './user';

const router = express.Router({ mergeParams: true });

router.use('/auth', authRouter);
router.use('/user', userRouter);

export default router;
