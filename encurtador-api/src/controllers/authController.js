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
    const user = await User.create({ nome, email: emailNormalizado, senhaHash, role: 'user' });
    const token = createToken({ id: user._id, email: user.email, role: user.role });

    return res.status(201).json({
      token,
      usuario: { id: user._id, nome: user.nome, email: user.email, role: user.role }
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

    const user = await User.findOne({ email: emailNormalizado });
    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const ok = await bcrypt.compare(senha, user.senhaHash);
    if (!ok) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const role = user.role || 'user';
    const token = createToken({ id: user._id, email: user.email, role });
    return res.json({ token, usuario: { id: user._id, nome: user.nome, email: user.email, role } });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao autenticar usuário.' });
  }
};

const changePassword = async (req, res) => {
  const { senhaAtual, novaSenha } = req.body;

  if (!senhaAtual || !novaSenha) {
    return res.status(400).json({ message: 'senhaAtual e novaSenha são obrigatórias.' });
  }

  if (novaSenha.length < 6) {
    return res.status(400).json({ message: 'novaSenha deve ter pelo menos 6 caracteres.' });
  }

  const user = await User.findById(req.usuario.id);
  if (!user) {
    return res.status(404).json({ message: 'Usuário não encontrado.' });
  }

  const senhaCorreta = await bcrypt.compare(senhaAtual, user.senhaHash);
  if (!senhaCorreta) {
    return res.status(401).json({ message: 'Senha atual incorreta.' });
  }

  user.senhaHash = await bcrypt.hash(novaSenha, 10);
  await user.save();

  return res.json({ message: 'Senha alterada com sucesso.' });
};

module.exports = { register, login, changePassword, changePassword };
