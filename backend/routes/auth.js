const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET, authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Faltan datos' });
  if (username.trim().length < 3) return res.status(400).json({ error: 'Usuario debe tener al menos 3 caracteres' });
  if (password.length < 6) return res.status(400).json({ error: 'Contraseña debe tener al menos 6 caracteres' });

  const hash = await bcrypt.hash(password, 10);
  try {
    const result = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username.trim(), hash);
    const userId = Number(result.lastInsertRowid);
    const token = jwt.sign({ id: userId, username: username.trim() }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: userId, username: username.trim(), full_name: null } });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'El usuario ya existe' });
    res.status(500).json({ error: 'Error interno' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Faltan datos' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
  if (!user) return res.status(400).json({ error: 'Credenciales inválidas' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(400).json({ error: 'Credenciales inválidas' });

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, full_name: user.full_name || null } });
});

router.put('/me', authenticate, (req, res) => {
  const { full_name } = req.body;
  const name = full_name?.trim();
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  db.prepare('UPDATE users SET full_name = ? WHERE id = ?').run(name, req.user.id);
  res.json({ success: true, full_name: name });
});

module.exports = router;
