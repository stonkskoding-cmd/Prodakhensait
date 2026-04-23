import { Router } from 'express';

const router = Router();

// ВРЕМЕННОЕ ХРАНИЛИЩЕ
const users = [];

router.post('/register', (req, res) => {
  const { email, password } = req.body;

  const exists = users.find(u => u.email === email);
  if (exists) {
    return res.status(400).json({ error: 'User already exists' });
  }

  const user = {
    id: Date.now(),
    email,
    password
  };

  users.push(user);

  res.json({
    token: 'dev-token',
    user
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  const user = users.find(
    u => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.json({
    token: 'dev-token',
    user
  });
});

router.get('/me', (req, res) => {
  res.json({ user: null });
});

export default router;
