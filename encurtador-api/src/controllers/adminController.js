const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const User = require('../models/User');
const Link = require('../models/Link');
const AccessLog = require('../models/AccessLog');
const slugCache = require('../config/slugCache');

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
  const user = await User.create({ nome: String(nome).trim(), email: emailNormalizado, senhaHash, role: 'user' });

  return res.status(201).json({
    id: user._id,
    nome: user.nome,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  });
};

const listAllLinks = async (req, res) => {
  const links = await Link.find({}, { slug: 1, urlDestino: 1, usuarioId: 1, revisaoAtual: 1, dataCriacao: 1 })
    .sort({ dataCriacao: -1 })
    .populate('usuarioId', 'nome email');

  const linkIds = links.map((l) => l._id);

  const counts = await AccessLog.aggregate([
    { $match: { linkId: { $in: linkIds } } },
    { $group: { _id: '$linkId', cliques: { $sum: 1 } } }
  ]);

  const mapaCliques = new Map(counts.map((c) => [String(c._id), c.cliques]));

  const resultado = links.map((l) => ({
    _id: l._id,
    slug: l.slug,
    urlDestino: l.urlDestino,
    revisaoAtual: l.revisaoAtual ?? 1,
    dataCriacao: l.dataCriacao,
    usuario: l.usuarioId,
    cliques: mapaCliques.get(String(l._id)) || 0
  }));

  return res.json(resultado);
};

const deleteLink = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'ID inválido.' });
  }

  const link = await Link.findByIdAndDelete(id);
  if (!link) {
    return res.status(404).json({ message: 'Link não encontrado.' });
  }

  // Remove logs e invalida cache
  await AccessLog.deleteMany({ linkId: id });
  slugCache.invalidate(link.slug);

  return res.json({ message: 'Link excluído com sucesso.' });
};

const deleteOrInactivateUser = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'ID inválido.' });
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ message: 'Usuário não encontrado.' });
  }

  if (user.role === 'admin') {
    return res.status(400).json({ message: 'Usuário admin não pode ser excluído nem inativado.' });
  }

  const hasLinks = await Link.exists({ usuarioId: user._id });

  if (hasLinks) {
    if (user.ativo === false) {
      return res.json({ action: 'already_inactive', message: 'Usuário já está inativo.' });
    }

    user.ativo = false;
    await user.save();
    return res.json({
      action: 'inactivated',
      message: 'Usuário possui links cadastrados e foi inativado. Novos acessos estão bloqueados.'
    });
  }

  await User.deleteOne({ _id: user._id });
  await AccessLog.deleteMany({ usuarioId: user._id });

  return res.json({ action: 'deleted', message: 'Usuário excluído com sucesso.' });
};

module.exports = {
  listUsers,
  createUser,
  listAllLinks,
  deleteLink,
  deleteOrInactivateUser
};
