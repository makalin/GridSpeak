import { register, login, getUserById } from '../auth.js';

export function applyAuthRoutes(app) {
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, password, display_name } = req.body || {};
      const user = await register(username, password, display_name);
      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) return res.status(500).json({ error: 'Session save failed' });
        res.status(201).json(user);
      });
    } catch (e) {
      res.status(400).json({ error: e.message || 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body || {};
      const user = await login(username, password);
      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) return res.status(500).json({ error: 'Session save failed' });
        res.json(user);
      });
    } catch (e) {
      res.status(401).json({ error: e.message || 'Login failed' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ error: 'Logout failed' });
      res.clearCookie('connect.sid');
      res.status(204).end();
    });
  });

  app.get('/api/auth/me', (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ error: 'Not logged in' });
    const user = req.user || getUserById(req.session.userId);
    if (!user) return res.status(401).json({ error: 'Session invalid' });
    res.json(user);
  });
}
