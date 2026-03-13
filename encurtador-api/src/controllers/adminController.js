const bcrypt = require('bcrypt');
const User = require('../models/User');

const listUsers = async (req, res) => {
  const users = await User.find({}, { senhaHash: 0 }).sort({ createdAt: -1 });
  return res.json(users);
};

const createUser = async (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ message: 'nome, email e senha são obrigatórios.' });
  }

  const emailNormalizado = String(email).toLowerCase().trim();
  const exists = await User.findOne({ email: emailNormalizado });

  if (exists) {
    return res.status(409).json({ message: 'E-mail já cadastrado.' });
  }

  const senhaHash = await bcrypt.hash(String(senha), 10);
  const user = await User.create({ nome: String(nome).trim(), email: emailNormalizado, senhaHash });

  return res.status(201).json({
    id: user._id,
    nome: user.nome,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  });
};

module.exports = {
  listUsers,
  createUser
};
