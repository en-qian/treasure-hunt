import * as express from 'express';
import { authenticateUser } from '@middlewares';
import * as authControllers from '@controllers/auth';

const router = express.Router({ mergeParams: true });

router.post('/initialize', authenticateUser(), authControllers.initialize);

router.post('/register', authControllers.register);

router.post('/login', authControllers.login);

router.post('/logout', authenticateUser(), authControllers.logout);

router.put('/profile', authenticateUser(), authControllers.updateProfile);

router.get('/profile', authenticateUser(), authControllers.getProfile);

export default router;
