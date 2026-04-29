const express = require('express');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Store in memory, upload to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const router = express.Router({ mergeParams: true });
router.use(authenticate);

function getMembership(userId, orgId) {
  return db.prepare(`SELECT * FROM memberships WHERE user_id = ? AND org_id = ? AND status = 'active'`).get(userId, orgId);
}

function expenseWithUser(id) {
  return db.prepare(`
    SELECT e.*, u.username,
           COALESCE(m.display_name, u.username) as display_name,
           ab.username as actioned_by_username
    FROM expenses e
    JOIN users u ON e.user_id = u.id
    LEFT JOIN memberships m ON m.user_id = e.user_id AND m.org_id = e.org_id AND m.status = 'active'
    LEFT JOIN users ab ON e.actioned_by = ab.id
    WHERE e.id = ?
  `).get(id);
}

async function uploadToCloudinary(buffer, mimetype) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'micaja', resource_type: 'image' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

// List expenses
router.get('/', (req, res) => {
  const m = getMembership(req.user.id, req.params.orgId);
  if (!m) return res.status(403).json({ error: 'Sin acceso' });

  let expenses;
  if (m.role === 'admin') {
    expenses = db.prepare(`
      SELECT e.*, u.username,
             COALESCE(mem.display_name, u.full_name, u.username) as display_name,
             ab.username as actioned_by_username
      FROM expenses e
      JOIN users u ON e.user_id = u.id
      LEFT JOIN memberships mem ON mem.user_id = e.user_id AND mem.org_id = e.org_id AND mem.status = 'active'
      LEFT JOIN users ab ON e.actioned_by = ab.id
      WHERE e.org_id = ?
      ORDER BY e.submitted_at DESC
    `).all(req.params.orgId);
  } else {
    expenses = db.prepare(`
      SELECT e.*, u.username,
             COALESCE(mem.display_name, u.full_name, u.username) as display_name,
             ab.username as actioned_by_username
      FROM expenses e
      JOIN users u ON e.user_id = u.id
      LEFT JOIN memberships mem ON mem.user_id = e.user_id AND mem.org_id = e.org_id AND mem.status = 'active'
      LEFT JOIN users ab ON e.actioned_by = ab.id
      WHERE e.org_id = ? AND e.user_id = ?
      ORDER BY e.submitted_at DESC
    `).all(req.params.orgId, req.user.id);
  }
  res.json(expenses);
});

// Submit expense
router.post('/', upload.single('photo'), async (req, res) => {
  const m = getMembership(req.user.id, req.params.orgId);
  if (!m) return res.status(403).json({ error: 'Sin acceso' });

  const { description, amount } = req.body;
  if (!description || !amount) return res.status(400).json({ error: 'Descripción e importe son requeridos' });

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) return res.status(400).json({ error: 'Importe inválido' });

  let photoUrl = null;
  if (req.file) {
    try {
      photoUrl = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
    } catch (e) {
      return res.status(500).json({ error: 'Error al subir la foto' });
    }
  }

  const result = db.prepare(`
    INSERT INTO expenses (user_id, org_id, description, photo_path, amount, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `).run(req.user.id, req.params.orgId, description.trim(), photoUrl, parsedAmount);

  res.json(expenseWithUser(Number(result.lastInsertRowid)));
});

// Action on expense
router.put('/:expId', upload.single('photo'), async (req, res) => {
  const m = getMembership(req.user.id, req.params.orgId);
  if (!m) return res.status(403).json({ error: 'Sin acceso' });

  const expense = db.prepare('SELECT * FROM expenses WHERE id = ? AND org_id = ?').get(req.params.expId, req.params.orgId);
  if (!expense) return res.status(404).json({ error: 'Gasto no encontrado' });

  const { action, description, amount } = req.body;

  if (m.role === 'admin') {
    if (action !== 'approve' && action !== 'deny') return res.status(400).json({ error: 'Acción inválida' });
    if (expense.status !== 'pending') return res.status(400).json({ error: 'El gasto ya fue procesado' });

    const newStatus = action === 'approve' ? 'approved' : 'denied';
    db.prepare('UPDATE expenses SET status = ?, actioned_at = ?, actioned_by = ? WHERE id = ?')
      .run(newStatus, new Date().toISOString(), req.user.id, expense.id);

    if (action === 'approve') {
      db.prepare('UPDATE organizations SET current_balance = current_balance - ? WHERE id = ?')
        .run(expense.amount, req.params.orgId);
      db.prepare('UPDATE memberships SET reimbursement_balance = reimbursement_balance + ? WHERE user_id = ? AND org_id = ?')
        .run(expense.amount, expense.user_id, req.params.orgId);
    }

    const submitterMem = db.prepare(`SELECT COALESCE(m.display_name, u.full_name, u.username) as name FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.user_id = ? AND m.org_id = ? AND m.status = 'active'`).get(expense.user_id, req.params.orgId);
    db.prepare('INSERT INTO movements (org_id, type, description, affected_user_id, actioned_by, amount) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.params.orgId,
        `expense_${newStatus}`,
        `Gasto ${newStatus === 'approved' ? 'aprobado' : 'denegado'}: "${expense.description}" de ${submitterMem?.name || '?'}`,
        expense.user_id, req.user.id, expense.amount);

  } else {
    if (expense.user_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
    if (expense.status !== 'pending') return res.status(400).json({ error: 'No se puede modificar un gasto ya procesado' });

    if (action === 'cancel') {
      db.prepare('UPDATE expenses SET status = ? WHERE id = ?').run('cancelled', expense.id);
    } else {
      const parsedAmount = amount ? parseFloat(amount) : null;
      if (parsedAmount !== null && (isNaN(parsedAmount) || parsedAmount <= 0)) {
        return res.status(400).json({ error: 'Importe inválido' });
      }
      let newPhoto = expense.photo_path;
      if (req.file) {
        try {
          newPhoto = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
        } catch (e) {
          return res.status(500).json({ error: 'Error al subir la foto' });
        }
      }
      db.prepare('UPDATE expenses SET description = ?, amount = ?, photo_path = ? WHERE id = ?')
        .run(description?.trim() || expense.description, parsedAmount || expense.amount, newPhoto, expense.id);
    }
  }

  res.json(expenseWithUser(expense.id));
});

module.exports = router;
