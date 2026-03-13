const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Token ausente ou inválido.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = { id: payload.sub, email: payload.email, role: payload.role || 'user' };
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
