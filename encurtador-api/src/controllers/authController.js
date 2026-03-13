const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const createToken = ({ id, email, role }) =>
  jwt.sign(
    {
      email,
      role
    },
    process.env.JWT_SECRET,
    {
      subject: String(id),
      expiresIn: process.env.JWT_EXPIRES_IN || '1d'
    }
  );

const register = async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ message: 'nome, email e senha são obrigatórios.' });
    }

    const emailNormalizado = email.toLowerCase().trim();
    const existing = await User.findOne({ email: emailNormalizado });

    if (existing) {
      return res.status(409).json({ message: 'E-mail já cadastrado.' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const user = await User.create({ nome, email: emailNormalizado, senhaHash });
    const token = createToken({ id: user._id, email: user.email, role: 'user' });

    return res.status(201).json({
      token,
      usuario: { id: user._id, nome: user.nome, email: user.email, role: 'user' }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao registrar usuário.' });
  }
};

const login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ message: 'email e senha são obrigatórios.' });
    }

    const emailNormalizado = email.toLowerCase().trim();
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@encurtador.local').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || '';

    if (emailNormalizado === adminEmail) {
      if (!adminPassword || senha !== adminPassword) {
        return res.status(401).json({ message: 'Credenciais inválidas.' });
      }

      const token = createToken({ id: 'admin', email: adminEmail, role: 'admin' });
      return res.json({
        token,
        usuario: {
          id: 'admin',
          nome: 'Administrador',
          email: adminEmail,
          role: 'admin'
        }
      });
    }

    const user = await User.findOne({ email: emailNormalizado });
    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const ok = await bcrypt.compare(senha, user.senhaHash);
    if (!ok) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const token = createToken({ id: user._id, email: user.email, role: 'user' });
    return res.json({ token, usuario: { id: user._id, nome: user.nome, email: user.email, role: 'user' } });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao autenticar usuário.' });
  }
};

module.exports = { register, login };
