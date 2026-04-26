const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors({
  origin: [
    'http://localhost',
    'http://localhost:5173',
    'capacitor://localhost',
    'https://micaja.up.railway.app'
  ],
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/orgs', require('./routes/orgs'));
app.use('/api/orgs/:orgId/expenses', require('./routes/expenses'));
app.use('/api/orgs/:orgId/members', require('./routes/members'));

// Serve frontend build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Mi Caja backend corriendo en http://localhost:${PORT}`));
