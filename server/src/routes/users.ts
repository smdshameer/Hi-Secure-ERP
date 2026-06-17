import { Router } from 'express';
import { UserService } from '../services/UserService';
import { requirePermission } from '../middleware/auth';

export const usersRouter = Router();
const userService = new UserService();

usersRouter.use((req, res, next) => {
  if (req.method === 'GET') {
    return requirePermission('users:view')(req, res, next);
  } else {
    return requirePermission('users:manage')(req, res, next);
  }
});

usersRouter.get('/', async (_req, res) => {
  try {
    const users = await userService.getUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

usersRouter.post('/', async (req, res) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json({ user_id: user.user_id, username: user.username, email: user.email });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

usersRouter.put('/:id', async (req, res) => {
  try {
    await userService.updateUser(Number(req.params.id), req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

usersRouter.delete('/:id', async (req, res) => {
  try {
    await userService.deleteUser(Number(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});