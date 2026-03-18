import { Router, Request, Response } from 'express';

const router = Router();

router.post('/register', (_req: Request, res: Response) => {
  res.json({ message: 'register' });
});

router.post('/login', (_req: Request, res: Response) => {
  res.json({ message: 'login' });
});

router.post('/logout', (_req: Request, res: Response) => {
  res.json({ message: 'logout' });
});

router.get('/me', (_req: Request, res: Response) => {
  res.json({ message: 'me' });
});

export default router;