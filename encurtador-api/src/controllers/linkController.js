const mongoose = require('mongoose');
const Link = require('../models/Link');
const AccessLog = require('../models/AccessLog');

const validarUrl = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (error) {
    return false;
  }
};

const listLinks = async (req, res) => {
  const usuarioId = req.usuario.id;
  const links = await Link.find({ usuarioId }).sort({ dataCriacao: -1 });
  return res.json(links);
};

const createLink = async (req, res) => {
  const usuarioId = req.usuario.id;
  const { slug, urlDestino } = req.body;

  if (!slug || !urlDestino) {
    return res.status(400).json({ message: 'slug e urlDestino são obrigatórios.' });
  }

  if (!validarUrl(urlDestino)) {
    return res.status(400).json({ message: 'urlDestino inválida. Use http(s).' });
  }

  const slugNormalizado = slug.trim().toLowerCase();

  try {
    const link = await Link.create({ slug: slugNormalizado, urlDestino: urlDestino.trim(), usuarioId });
    return res.status(201).json(link);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Slug já está em uso.' });
    }
    return res.status(500).json({ message: 'Erro ao criar link.' });
  }
};

const updateLinkDestino = async (req, res) => {
  const usuarioId = req.usuario.id;
  const { id } = req.params;
  const { urlDestino } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'ID inválido.' });
  }

  if (!urlDestino || !validarUrl(urlDestino)) {
    return res.status(400).json({ message: 'urlDestino inválida. Use http(s).' });
  }

  const updated = await Link.findOneAndUpdate(
    { _id: id, usuarioId },
    { urlDestino: urlDestino.trim() },
    { new: true }
  );

  if (!updated) {
    return res.status(404).json({ message: 'Link não encontrado.' });
  }

  return res.json(updated);
};

const getLast7DaysClicks = async (req, res) => {
  const usuarioId = req.usuario.id;
  const daysValue = Number(req.query.days || 7);
  const allowedDays = [7, 15, 30];
  const periodoDias = allowedDays.includes(daysValue) ? daysValue : 7;
  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);

  const inicio = new Date();
  inicio.setDate(inicio.getDate() - (periodoDias - 1));
  inicio.setHours(0, 0, 0, 0);

  const aggregate = await AccessLog.aggregate([
    {
      $match: {
        usuarioId: new mongoose.Types.ObjectId(usuarioId),
        criadoEm: { $gte: inicio, $lte: hoje }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$criadoEm' }
        },
        cliques: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  const mapa = new Map(aggregate.map((item) => [item._id, item.cliques]));
  const resultado = [];

  for (let i = 0; i < periodoDias; i += 1) {
    const dia = new Date(inicio);
    dia.setDate(inicio.getDate() + i);
    const chave = dia.toISOString().slice(0, 10);
    resultado.push({ dia: chave, cliques: mapa.get(chave) || 0 });
  }

  return res.json(resultado);
};

const getSegmentationMetrics = async (req, res) => {
  const usuarioId = req.usuario.id;
  const daysValue = Number(req.query.days || 7);
  const allowedDays = [7, 15, 30];
  const periodoDias = allowedDays.includes(daysValue) ? daysValue : 7;
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - (periodoDias - 1));
  inicio.setHours(0, 0, 0, 0);

  const baseMatch = {
    usuarioId: new mongoose.Types.ObjectId(usuarioId),
    criadoEm: { $gte: inicio }
  };

  const [dispositivos, plataformas, origens, paises, cidades, horas, referers, total] = await Promise.all([
    AccessLog.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$dispositivo', cliques: { $sum: 1 } } },
      { $sort: { cliques: -1 } }
    ]),
    AccessLog.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$plataforma', cliques: { $sum: 1 } } },
      { $sort: { cliques: -1 } }
    ]),
    AccessLog.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$source', cliques: { $sum: 1 } } },
      { $sort: { cliques: -1 } }
    ]),
    AccessLog.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$country', cliques: { $sum: 1 } } },
      { $sort: { cliques: -1 } },
      { $limit: 10 }
    ]),
    AccessLog.aggregate([
      {
        $match: {
          ...baseMatch,
          city: { $ne: '' }
        }
      },
      { $group: { _id: '$city', cliques: { $sum: 1 } } },
      { $sort: { cliques: -1 } },
      { $limit: 10 }
    ]),
    AccessLog.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$horaAcesso', cliques: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]),
    AccessLog.aggregate([
      {
        $match: {
          ...baseMatch,
          referer: { $ne: '' }
        }
      },
      { $group: { _id: '$referer', cliques: { $sum: 1 } } },
      { $sort: { cliques: -1 } },
      { $limit: 10 }
    ]),
    AccessLog.countDocuments(baseMatch)
  ]);

  return res.json({
    periodoDias,
    totalCliques: total,
    dispositivos: dispositivos.map((item) => ({ dispositivo: item._id || 'unknown', cliques: item.cliques })),
    plataformas: plataformas.map((item) => ({ plataforma: item._id || 'unknown', cliques: item.cliques })),
    origens: origens.map((item) => ({ origem: item._id || 'unknown', cliques: item.cliques })),
    paises: paises.map((item) => ({ pais: item._id || 'unknown', cliques: item.cliques })),
    cidades: cidades.map((item) => ({ cidade: item._id || 'unknown', cliques: item.cliques })),
    horas: horas.map((item) => ({ hora: Number.isInteger(item._id) ? item._id : 0, cliques: item.cliques })),
    referers: referers.map((item) => ({ referer: item._id || 'unknown', cliques: item.cliques }))
  });
};

module.exports = {
  listLinks,
  createLink,
  updateLinkDestino,
  getLast7DaysClicks,
  getSegmentationMetrics
};
