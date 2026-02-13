import {
  serversForUser,
  insertServer,
  addMember,
  serverById,
  isMember,
  channelsByServer,
  insertChannel,
} from '../db.js';

export function applyServerRoutes(app, requireAuth) {
  app.get('/api/servers', requireAuth, (req, res) => {
    const rows = serversForUser.all(req.user.id);
    res.json(rows.map((r) => ({ id: r.id, name: r.name, owner_id: r.owner_id })));
  });

  app.post('/api/servers', requireAuth, (req, res) => {
    const name = (req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Server name required' });
    const run = insertServer.run(name, req.user.id);
    const serverId = run.lastInsertRowid;
    addMember.run(serverId, req.user.id, 'owner');
    insertChannel.run(serverId, 'general', 'text');
    const server = serverById.get(serverId);
    res.status(201).json(server);
  });

  app.get('/api/servers/:id/channels', requireAuth, (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid server id' });
    if (!isMember.get(id, req.user.id)) return res.status(403).json({ error: 'Not a member' });
    const rows = channelsByServer.all(id);
    res.json(rows);
  });

  app.post('/api/servers/:id/channels', requireAuth, (req, res) => {
    const serverId = Number(req.params.id);
    if (!serverId) return res.status(400).json({ error: 'Invalid server id' });
    if (!isMember.get(serverId, req.user.id)) return res.status(403).json({ error: 'Not a member' });
    const name = (req.body?.name || '').trim().toLowerCase().replace(/\s+/g, '-');
    if (!name) return res.status(400).json({ error: 'Channel name required' });
    try {
      insertChannel.run(serverId, name, 'text');
      const channels = channelsByServer.all(serverId);
      const created = channels.find((c) => c.name === name);
      res.status(201).json(created);
    } catch (e) {
      if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'Channel already exists' });
      throw e;
    }
  });
}
