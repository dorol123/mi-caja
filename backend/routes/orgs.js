const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function generateCode() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

// Get user's active orgs
router.get('/', (req, res) => {
  const orgs = db.prepare(`
    SELECT o.*, m.role, m.status, m.reimbursement_balance
    FROM organizations o
    JOIN memberships m ON m.org_id = o.id
    WHERE m.user_id = ? AND m.status = 'active'
    ORDER BY o.name
  `).all(req.user.id);
  res.json(orgs);
});

// Create org — uses explicit transaction since node:sqlite has no db.transaction()
router.post('/', (req, res) => {
  const { name, initialAmount, isUnlimited, showBalanceToUsers } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'El nombre es requerido' });

  let code;
  let attempts = 0;
  do {
    code = generateCode();
    if (++attempts > 100) return res.status(500).json({ error: 'No se pudo generar código único' });
  } while (db.prepare('SELECT id FROM organizations WHERE code = ?').get(code));

  const unlimited = isUnlimited === true || isUnlimited === 'true';
  const amount = unlimited ? null : (parseFloat(initialAmount) || 0);

  db.exec('BEGIN');
  try {
    const org = db.prepare(`
      INSERT INTO organizations (name, code, creator_id, initial_amount, is_unlimited, current_balance, show_balance_to_users)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name.trim(), code, req.user.id, amount, unlimited ? 1 : 0, amount || 0, showBalanceToUsers ? 1 : 0);

    const orgId = Number(org.lastInsertRowid);
    db.prepare(`INSERT INTO memberships (user_id, org_id, role, status) VALUES (?, ?, 'admin', 'active')`)
      .run(req.user.id, orgId);

    db.exec('COMMIT');
    const created = db.prepare('SELECT * FROM organizations WHERE id = ?').get(orgId);
    res.json({ ...created, role: 'admin', reimbursement_balance: 0 });
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
});

// Get org detail
router.get('/:id', (req, res) => {
  const m = db.prepare(`SELECT * FROM memberships WHERE user_id = ? AND org_id = ? AND status = 'active'`).get(req.user.id, req.params.id);
  if (!m) return res.status(403).json({ error: 'Sin acceso' });

  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.id);
  if (!org) return res.status(404).json({ error: 'Organización no encontrada' });

  res.json({ ...org, role: m.role, reimbursement_balance: m.reimbursement_balance, display_name: m.display_name });
});

// Update org settings (admin only)
router.put('/:id', (req, res) => {
  const m = db.prepare(`SELECT * FROM memberships WHERE user_id = ? AND org_id = ? AND status = 'active'`).get(req.user.id, req.params.id);
  if (!m || m.role !== 'admin') return res.status(403).json({ error: 'No autorizado' });

  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.id);
  if (!org) return res.status(404).json({ error: 'No encontrada' });

  const { name, initialAmount, isUnlimited, showBalanceToUsers } = req.body;
  const unlimited = isUnlimited === true || isUnlimited === 'true';
  const amount = unlimited ? null : (parseFloat(initialAmount) ?? org.initial_amount);

  db.prepare(`UPDATE organizations SET name=?, initial_amount=?, is_unlimited=?, show_balance_to_users=? WHERE id=?`)
    .run(name?.trim() || org.name, amount, unlimited ? 1 : 0, showBalanceToUsers ? 1 : 0, req.params.id);

  db.prepare('INSERT INTO movements (org_id, type, description, actioned_by) VALUES (?, ?, ?, ?)')
    .run(req.params.id, 'settings_updated', 'Configuración de la organización actualizada', req.user.id);

  const updated = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.id);
  res.json({ ...updated, role: m.role, reimbursement_balance: m.reimbursement_balance });
});

// Join org by code
router.post('/join', (req, res) => {
  const { code, displayName } = req.body;
  if (!code) return res.status(400).json({ error: 'Código requerido' });
  if (!displayName?.trim()) return res.status(400).json({ error: 'Nombre requerido' });

  const org = db.prepare('SELECT * FROM organizations WHERE code = ?').get(code.trim());
  if (!org) return res.status(404).json({ error: 'Código inválido' });

  if (org.creator_id === req.user.id) return res.status(400).json({ error: 'Ya sos el creador de esta organización' });

  const dn = displayName.trim();
  const existing = db.prepare('SELECT * FROM memberships WHERE user_id = ? AND org_id = ?').get(req.user.id, org.id);
  if (existing) {
    if (existing.status === 'active') return res.status(400).json({ error: 'Ya sos miembro de esta organización' });
    if (existing.status === 'pending') return res.status(400).json({ error: 'Ya tenés una solicitud pendiente' });
    db.prepare('UPDATE memberships SET status = ?, requested_at = ?, actioned_at = NULL, actioned_by = NULL, display_name = ? WHERE id = ?')
      .run('pending', new Date().toISOString(), dn, existing.id);
  } else {
    db.prepare(`INSERT INTO memberships (user_id, org_id, role, status, display_name) VALUES (?, ?, 'user', 'pending', ?)`).run(req.user.id, org.id, dn);
  }

  res.json({ message: 'Solicitud enviada. Esperá la aprobación de un administrador.' });
});

// Settle cash (admin only)
router.post('/:id/settle', (req, res) => {
  const m = db.prepare(`SELECT * FROM memberships WHERE user_id = ? AND org_id = ? AND status = 'active'`).get(req.user.id, req.params.id);
  if (!m || m.role !== 'admin') return res.status(403).json({ error: 'No autorizado' });

  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.id);
  if (!org) return res.status(404).json({ error: 'No encontrada' });

  const { type, amount } = req.body;
  let settled, newBalance;

  if (type === 'complete') {
    settled = org.current_balance;
    newBalance = org.is_unlimited ? 0 : (org.initial_amount || 0);
  } else {
    settled = parseFloat(amount);
    if (isNaN(settled) || settled <= 0) return res.status(400).json({ error: 'Monto inválido' });
    newBalance = Math.max(0, org.current_balance - settled);
  }

  db.prepare('UPDATE organizations SET current_balance = ? WHERE id = ?').run(newBalance, req.params.id);
  db.prepare('INSERT INTO movements (org_id, type, description, actioned_by, amount) VALUES (?, ?, ?, ?, ?)')
    .run(req.params.id, 'cash_settled',
      type === 'complete' ? 'Caja saldada y repuesta al monto inicial' : 'Caja saldada por monto personalizado',
      req.user.id, settled);

  res.json({ current_balance: newBalance, settled });
});

module.exports = router;
