require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { connectDatabase } = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const linkRoutes = require('./routes/linkRoutes');
const adminRoutes = require('./routes/adminRoutes');
const redirectRoutes = require('./routes/redirectRoutes');

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*'
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
