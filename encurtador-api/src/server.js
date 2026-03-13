require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { connectDatabase } = require('./config/database');
const { bootstrapAdminUser } = require('./bootstrap/adminBootstrap');
const authRoutes = require('./routes/authRoutes');
const linkRoutes = require('./routes/linkRoutes');
const adminRoutes = require('./routes/adminRoutes');
const redirectRoutes = require('./routes/redirectRoutes');

const app = express();

const configuredOrigins = String(process.env.FRONTEND_URL || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const allowedOrigins =
  configuredOrigins.length > 0
    ? configuredOrigins
    : process.env.NODE_ENV === 'production'
      ? []
      : ['http://localhost:4200'];

if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
  throw new Error('FRONTEND_URL deve ser configurada em produção.');
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origem não permitida pelo CORS.'));
    }
  })
);
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/links', linkRoutes);
app.use('/api/admin', adminRoutes);
app.use('/', redirectRoutes);

app.use((error, req, res, next) => {
  console.error(error);
  return res.status(500).json({ message: 'Erro interno do servidor.' });
});

const startServer = async () => {
  try {
    await connectDatabase();
    await bootstrapAdminUser();
    const port = Number(process.env.PORT || 3000);
    app.listen(port, () => {
      console.log(`API rodando na porta ${port}`);
    });
  } catch (error) {
    console.error('Falha ao iniciar aplicação:', error.message);
    process.exit(1);
  }
};

startServer();
