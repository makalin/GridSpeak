import { membersByServer, isMember } from '../db.js';

export function applyMemberRoutes(app, requireAuth) {
  app.get('/api/servers/:id/members', requireAuth, (req, res) => {
    const serverId = Number(req.params.id);
    if (!serverId) return res.status(400).json({ error: 'Invalid server id' });
    if (!isMember.get(serverId, req.user.id)) return res.status(403).json({ error: 'Not a member' });
    const rows = membersByServer.all(serverId);
    res.json(
      rows.map((r) => ({
        id: r.id,
        username: r.username,
        display_name: r.display_name,
        role: r.role,
      }))
    );
  });
}
