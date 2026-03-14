const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: 'Configuração de autenticação inválida.' });
  }

  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Token ausente ou inválido.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(payload.sub, { _id: 1, email: 1, role: 1, ativo: 1 });
    if (!user) {
      return res.status(401).json({ message: 'Usuário do token não encontrado.' });
    }

    if (user.ativo === false) {
      return res.status(403).json({ message: 'Usuário inativo. Acesso bloqueado.' });
    }

    req.usuario = { id: String(user._id), email: user.email, role: user.role || 'user' };
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Token expirado ou inválido.' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.usuario?.role !== 'admin') {
    return res.status(403).json({ message: 'Acesso restrito para administradores.' });
  }

  return next();
};

const requireUser = (req, res, next) => {
  if (req.usuario?.role !== 'user') {
    return res.status(403).json({ message: 'Acesso permitido apenas para usuários do encurtador.' });
  }

  return next();
};

module.exports = { authMiddleware, requireAdmin, requireUser };
