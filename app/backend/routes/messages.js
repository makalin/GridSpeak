import { channelById, messagesByChannel, insertMessage, isMember } from '../db.js';

function messageRowToJson(row) {
  return {
    id: row.id,
    channel_id: row.channel_id,
    content: row.content,
    created_at: row.created_at,
    author: {
      id: row.user_id,
      username: row.username,
      display_name: row.display_name,
    },
  };
}

export function applyMessageRoutes(app, requireAuth) {
  app.get('/api/channels/:id/messages', requireAuth, (req, res) => {
    const channelId = Number(req.params.id);
    if (!channelId) return res.status(400).json({ error: 'Invalid channel id' });
    const ch = channelById.get(channelId);
    if (!ch) return res.status(404).json({ error: 'Channel not found' });
    if (!isMember.get(ch.server_id, req.user.id)) return res.status(403).json({ error: 'Not a member' });
    const rows = messagesByChannel.all(channelId);
    res.json(rows.map(messageRowToJson));
  });

  app.post('/api/channels/:id/messages', requireAuth, (req, res) => {
    const channelId = Number(req.params.id);
    if (!channelId) return res.status(400).json({ error: 'Invalid channel id' });
    const ch = channelById.get(channelId);
    if (!ch) return res.status(404).json({ error: 'Channel not found' });
    if (!isMember.get(ch.server_id, req.user.id)) return res.status(403).json({ error: 'Not a member' });
    const content = (req.body?.content || '').trim();
    if (!content) return res.status(400).json({ error: 'Message content required' });
    insertMessage.run(channelId, req.user.id, content);
    const rows = messagesByChannel.all(channelId);
    const last = rows[rows.length - 1];
    res.status(201).json(messageRowToJson(last));
  });
}
