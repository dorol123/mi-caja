const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(authenticate);

function getActiveMembership(userId, orgId) {
  return db.prepare(`SELECT * FROM memberships WHERE user_id = ? AND org_id = ? AND status = 'active'`).get(userId, orgId);
}

function getAdminMembership(userId, orgId) {
  const m = getActiveMembership(userId, orgId);
  return m?.role === 'admin' ? m : null;
}

router.get('/movements', (req, res) => {
  if (!getAdminMembership(req.user.id, req.params.orgId)) return res.status(403).json({ error: 'No autorizado' });

  const movements = db.prepare(`
    SELECT mv.*,
           au.username as actioned_by_username,
           uu.username as affected_username,
           COALESCE(um.display_name, uu.username) as affected_display_name
    FROM movements mv
    LEFT JOIN users au ON mv.actioned_by = au.id
    LEFT JOIN users uu ON mv.affected_user_id = uu.id
    LEFT JOIN memberships um ON um.user_id = mv.affected_user_id AND um.org_id = mv.org_id AND um.status = 'active'
    WHERE mv.org_id = ?
    ORDER BY mv.created_at DESC
  `).all(req.params.orgId);

  res.json(movements);
});

router.get('/pending', (req, res) => {
  if (!getAdminMembership(req.user.id, req.params.orgId)) return res.status(403).json({ error: 'No autorizado' });

  const pending = db.prepare(`
    SELECT u.id, COALESCE(m.display_name, u.full_name) as display_name, m.requested_at, m.id as membership_id
    FROM memberships m
    JOIN users u ON m.user_id = u.id
    WHERE m.org_id = ? AND m.status = 'pending'
    ORDER BY m.requested_at
  `).all(req.params.orgId);

  res.json(pending);
});

router.get('/', (req, res) => {
  if (!getAdminMembership(req.user.id, req.params.orgId)) return res.status(403).json({ error: 'No autorizado' });

  const members = db.prepare(`
    SELECT u.id, COALESCE(m.display_name, u.full_name) as display_name, m.role, m.status, m.reimbursement_balance, m.requested_at
    FROM memberships m
    JOIN users u ON m.user_id = u.id
    WHERE m.org_id = ? AND m.status = 'active'
    ORDER BY m.role DESC, display_name
  `).all(req.params.orgId);

  const org = db.prepare('SELECT creator_id FROM organizations WHERE id = ?').get(req.params.orgId);
  res.json(members.map(m => ({ ...m, is_creator: m.id === org.creator_id })));
});

router.put('/:userId', (req, res) => {
  const me = getActiveMembership(req.user.id, req.params.orgId);
  if (!me) return res.status(403).json({ error: 'Sin acceso' });

  const { action, amount, displayName } = req.body;
  const targetId = parseInt(req.params.userId);
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.orgId);
  const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
  if (!targetUser) return res.status(404).json({ error: 'Usuario no encontrado' });

  const target = db.prepare('SELECT * FROM memberships WHERE user_id = ? AND org_id = ?').get(targetId, req.params.orgId);

  if (action === 'set_display_name') {
    if (targetId !== req.user.id && me.role !== 'admin') return res.status(403).json({ error: 'No autorizado' });
    const dn = displayName?.trim();
    if (!dn) return res.status(400).json({ error: 'Nombre requerido' });
    db.prepare('UPDATE memberships SET display_name = ? WHERE user_id = ? AND org_id = ?').run(dn, targetId, req.params.orgId);
    if (targetId !== req.user.id) {
      db.prepare('INSERT INTO movements (org_id, type, description, affected_user_id, actioned_by) VALUES (?, ?, ?, ?, ?)')
        .run(req.params.orgId, 'settings_updated', `Nombre de miembro actualizado a "${dn}"`, targetId, req.user.id);
    }
    return res.json({ success: true });
  }

  if (me.role !== 'admin') return res.status(403).json({ error: 'No autorizado' });

  switch (action) {
    case 'approve':
      if (!target || target.status !== 'pending') return res.status(400).json({ error: 'Sin solicitud pendiente' });
      db.prepare('UPDATE memberships SET status = ?, actioned_at = ?, actioned_by = ? WHERE user_id = ? AND org_id = ?')
        .run('active', new Date().toISOString(), req.user.id, targetId, req.params.orgId);
      db.prepare('INSERT INTO movements (org_id, type, description, affected_user_id, actioned_by) VALUES (?, ?, ?, ?, ?)')
        .run(req.params.orgId, 'member_joined', `${target.display_name || targetUser.full_name || targetUser.username} ingresó a la organización`, targetId, req.user.id);
      break;

    case 'deny':
      if (!target || target.status !== 'pending') return res.status(400).json({ error: 'Sin solicitud pendiente' });
      db.prepare('UPDATE memberships SET status = ?, actioned_at = ?, actioned_by = ? WHERE user_id = ? AND org_id = ?')
        .run('denied', new Date().toISOString(), req.user.id, targetId, req.params.orgId);
      db.prepare('INSERT INTO movements (org_id, type, description, affected_user_id, actioned_by) VALUES (?, ?, ?, ?, ?)')
        .run(req.params.orgId, 'member_denied', `Solicitud de ${target.display_name || targetUser.full_name || targetUser.username} fue denegada`, targetId, req.user.id);
      break;

    case 'promote':
      if (!target || target.status !== 'active') return res.status(400).json({ error: 'Usuario no activo' });
      if (target.role === 'admin') return res.status(400).json({ error: 'Ya es administrador' });
      db.prepare('UPDATE memberships SET role = ? WHERE user_id = ? AND org_id = ?').run('admin', targetId, req.params.orgId);
      db.prepare('INSERT INTO movements (org_id, type, description, affected_user_id, actioned_by) VALUES (?, ?, ?, ?, ?)')
        .run(req.params.orgId, 'member_promoted', `${target.display_name || targetUser.full_name || targetUser.username} fue promovido a administrador`, targetId, req.user.id);
      break;

    case 'remove':
      if (!target || target.status !== 'active') return res.status(400).json({ error: 'Usuario no activo' });
      if (targetId === org.creator_id) return res.status(403).json({ error: 'No se puede remover al creador' });
      db.prepare('UPDATE memberships SET status = ? WHERE user_id = ? AND org_id = ?').run('removed', targetId, req.params.orgId);
      db.prepare('INSERT INTO movements (org_id, type, description, affected_user_id, actioned_by) VALUES (?, ?, ?, ?, ?)')
        .run(req.params.orgId, 'member_removed', `${target.display_name || targetUser.full_name || targetUser.username} fue removido`, targetId, req.user.id);
      break;

    case 'settle_reimbursement': {
      if (!target || target.status !== 'active') return res.status(400).json({ error: 'Usuario no activo' });
      const settle = parseFloat(amount) || target.reimbursement_balance;
      const actual = Math.min(settle, target.reimbursement_balance);
      if (actual <= 0) return res.status(400).json({ error: 'No hay reintegro pendiente' });
      db.prepare('UPDATE memberships SET reimbursement_balance = reimbursement_balance - ? WHERE user_id = ? AND org_id = ?')
        .run(actual, targetId, req.params.orgId);
      db.prepare('INSERT INTO movements (org_id, type, description, affected_user_id, actioned_by, amount) VALUES (?, ?, ?, ?, ?, ?)')
        .run(req.params.orgId, 'reimbursement_settled', `Reintegro pagado a ${target.display_name || targetUser.full_name || targetUser.username}`, targetId, req.user.id, actual);
      break;
    }

    default:
      return res.status(400).json({ error: 'Acción inválida' });
  }

  res.json({ success: true });
});

module.exports = router;
