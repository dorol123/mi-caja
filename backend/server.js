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

// Privacy policy
app.get('/privacidad', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Política de Privacidad — Mi Caja</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 700px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.7; }
    h1 { color: #059669; }
    h2 { color: #374151; margin-top: 2em; }
    p, li { color: #4b5563; }
    footer { margin-top: 3em; color: #9ca3af; font-size: 0.85em; }
  </style>
</head>
<body>
  <h1>Política de Privacidad</h1>
  <p><strong>Aplicación:</strong> Mi Caja<br/>
  <strong>Última actualización:</strong> 28 de abril de 2025</p>
  <p>Esta política describe cómo Mi Caja recopila, usa y protege la información de sus usuarios.</p>
  <h2>1. Información que recopilamos</h2>
  <ul>
    <li><strong>Nombre de usuario y contraseña:</strong> para autenticar tu cuenta.</li>
    <li><strong>Nombre completo (opcional):</strong> para personalizar tu perfil.</li>
    <li><strong>Datos de gastos e ingresos:</strong> que vos mismo ingresás en la aplicación.</li>
  </ul>
  <h2>2. Cómo usamos tu información</h2>
  <ul>
    <li>Permitirte acceder a tu cuenta y organizaciones.</li>
    <li>Mostrar y gestionar los registros de tu organización.</li>
    <li>Facilitar la colaboración entre miembros de una misma organización.</li>
  </ul>
  <h2>3. Almacenamiento y seguridad</h2>
  <p>Tus datos se almacenan en servidores seguros. Las contraseñas se guardan encriptadas y nunca en texto plano. No vendemos ni compartimos tu información con terceros.</p>
  <h2>4. Datos de terceros</h2>
  <p>Mi Caja no comparte información personal con terceros, anunciantes ni servicios de análisis externos.</p>
  <h2>5. Eliminación de datos</h2>
  <p>Podés solicitar la eliminación de tu cuenta y todos tus datos contactándonos por correo electrónico.</p>
  <h2>6. Contacto</h2>
  <p><a href="mailto:facubenitoviale@gmail.com">facubenitoviale@gmail.com</a></p>
  <footer>© 2025 Mi Caja. Todos los derechos reservados.</footer>
</body>
</html>`);
});

// Serve frontend build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Mi Caja backend corriendo en http://localhost:${PORT}`));
