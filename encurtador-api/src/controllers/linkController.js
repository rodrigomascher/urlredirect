const mongoose = require('mongoose');
const Link = require('../models/Link');
const AccessLog = require('../models/AccessLog');
const slugCache = require('../config/slugCache');

const SLUG_REGEX = /^[a-z0-9-]{3,40}$/;

const validarUrl = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (error) {
    return false;
  }
};

const parseLinkIdsFromQuery = (query) => {
  const rawValues = [];

  const appendRawValue = (value) => {
    if (typeof value !== 'string') {
      return;
    }

    const normalized = value.trim();
    if (normalized) {
      rawValues.push(normalized);
    }
  };

  appendRawValue(query.linkId);

  if (Array.isArray(query.linkIds)) {
    query.linkIds.forEach((value) => appendRawValue(String(value)));
  } else if (typeof query.linkIds === 'string') {
    query.linkIds.split(',').forEach((value) => appendRawValue(value));
  }

  const uniqueRawValues = [...new Set(rawValues)];
  const validIds = uniqueRawValues.filter((value) => mongoose.Types.ObjectId.isValid(value));

  return {
    isRequested: uniqueRawValues.length > 0,
    objectIds: validIds.map((value) => new mongoose.Types.ObjectId(value))
  };
};

const buildPeriodLabels = (inicio, periodoDias) => {
  const labels = [];

  for (let i = 0; i < periodoDias; i += 1) {
    const dia = new Date(inicio);
    dia.setDate(inicio.getDate() + i);
    labels.push(dia.toISOString().slice(0, 10));
  }

  return labels;
};

const listLinks = async (req, res) => {
  const usuarioId = req.usuario.id;
  const links = await Link.find({ usuarioId }).sort({ dataCriacao: -1 });
  return res.json(links);
};

const createLink = async (req, res) => {
  const usuarioId = req.usuario.id;
  const { slug, urlDestino } = req.body;

  if (typeof slug !== 'string' || typeof urlDestino !== 'string') {
    return res.status(400).json({ message: 'slug e urlDestino são obrigatórios.' });
  }

  const slugNormalizado = slug.trim().toLowerCase();
  const urlDestinoNormalizada = urlDestino.trim();

  if (!SLUG_REGEX.test(slugNormalizado)) {
    return res.status(400).json({ message: 'slug inválido. Use 3-40 caracteres [a-z0-9-].' });
  }

  if (!validarUrl(urlDestinoNormalizada)) {
    return res.status(400).json({ message: 'urlDestino inválida. Use http(s).' });
  }

  try {
    const agora = new Date();
    const link = await Link.create({
      slug: slugNormalizado,
      urlDestino: urlDestinoNormalizada,
      usuarioId,
      revisaoAtual: 1,
      revisoes: [{ revisao: 1, urlDestino: urlDestinoNormalizada, inicioEm: agora, fimEm: null }]
    });
    return res.status(201).json(link);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Slug já está em uso.' });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Dados inválidos para criação do link.' });
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

  if (typeof urlDestino !== 'string' || !validarUrl(urlDestino.trim())) {
    return res.status(400).json({ message: 'urlDestino inválida. Use http(s).' });
  }

  const urlDestinoNova = urlDestino.trim();
  const agora = new Date();

  const link = await Link.findOne({ _id: id, usuarioId });
  if (!link) {
    return res.status(404).json({ message: 'Link não encontrado.' });
  }

  if (link.urlDestino === urlDestinoNova) {
    return res.json(link);
  }

  const novaRevisao = (link.revisaoAtual ?? 1) + 1;

  // Fecha a revisão atual
  const revisoesFechadas = (link.revisoes || []).map((r) => {
    const obj = r.toObject ? r.toObject() : { ...r };
    return obj.fimEm == null ? { ...obj, fimEm: agora } : obj;
  });

  // Adiciona a nova revisão
  revisoesFechadas.push({ revisao: novaRevisao, urlDestino: urlDestinoNova, inicioEm: agora, fimEm: null });

  const updated = await Link.findOneAndUpdate(
    { _id: id, usuarioId },
    { urlDestino: urlDestinoNova, revisaoAtual: novaRevisao, revisoes: revisoesFechadas },
    { new: true }
  );

  // Invalida cache para que o próximo redirect use a nova URL
  slugCache.invalidate(updated.slug);

  return res.json(updated);
};

const getLast7DaysClicks = async (req, res) => {
  const usuarioId = req.usuario.id;
  const usuarioObjectId = new mongoose.Types.ObjectId(usuarioId);
  const daysValue = Number(req.query.days || 7);
  const allowedDays = [7, 15, 30];
  const periodoDias = allowedDays.includes(daysValue) ? daysValue : 7;
  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);

  const inicio = new Date();
  inicio.setDate(inicio.getDate() - (periodoDias - 1));
  inicio.setHours(0, 0, 0, 0);

  const { isRequested: hasLinkFilter, objectIds: linkObjectIds } = parseLinkIdsFromQuery(req.query);

  if (hasLinkFilter && linkObjectIds.length === 0) {
    return res.status(400).json({ message: 'linkId/linkIds inválido(s).' });
  }

  const comparisonMode = linkObjectIds.length > 1;

  const labels = buildPeriodLabels(inicio, periodoDias);

  const matchBase = {
    usuarioId: usuarioObjectId,
    criadoEm: { $gte: inicio, $lte: hoje }
  };

  if (linkObjectIds.length === 1) {
    matchBase.linkId = linkObjectIds[0];
  } else if (linkObjectIds.length > 1) {
    matchBase.linkId = { $in: linkObjectIds };
  }

  if (req.query.revisao !== undefined) {
    matchBase.revisao = Number(req.query.revisao);
  }

  if (!comparisonMode) {
    const aggregate = await AccessLog.aggregate([
      {
        $match: matchBase
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
    const resultado = labels.map((dia) => ({ dia, cliques: mapa.get(dia) || 0 }));

    return res.json(resultado);
  }

  const [aggregate, selectedLinks] = await Promise.all([
    AccessLog.aggregate([
      {
        $match: matchBase
      },
      {
        $group: {
          _id: {
            dia: { $dateToString: { format: '%Y-%m-%d', date: '$criadoEm' } },
            linkId: '$linkId'
          },
          cliques: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.dia': 1 }
      }
    ]),
    Link.find({ _id: { $in: linkObjectIds }, usuarioId: usuarioObjectId }, { slug: 1 }).lean()
  ]);

  const linkSlugById = new Map(selectedLinks.map((item) => [String(item._id), item.slug]));
  const orderedLinkIds = linkObjectIds
    .map((id) => String(id))
    .filter((id) => linkSlugById.has(id));

  const clicksByLinkAndDay = new Map(
    aggregate.map((item) => [`${String(item._id.linkId)}:${item._id.dia}`, item.cliques])
  );

  const series = orderedLinkIds.map((linkId) => {
    const valores = labels.map((dia) => clicksByLinkAndDay.get(`${linkId}:${dia}`) || 0);
    const totalCliques = valores.reduce((soma, atual) => soma + atual, 0);

    return {
      linkId,
      slug: linkSlugById.get(linkId) || linkId,
      valores,
      totalCliques
    };
  });

  const totaisPorDia = labels.map((dia, index) => ({
    dia,
    cliques: series.reduce((soma, item) => soma + (item.valores[index] || 0), 0)
  }));

  const totalCliques = totaisPorDia.reduce((soma, item) => soma + item.cliques, 0);

  return res.json({
    periodoDias,
    labels,
    totalCliques,
    totaisPorDia,
    series
  });
};

const getSegmentationMetrics = async (req, res) => {
  const usuarioId = req.usuario.id;
  const usuarioObjectId = new mongoose.Types.ObjectId(usuarioId);
  const daysValue = Number(req.query.days || 7);
  const allowedDays = [7, 15, 30];
  const periodoDias = allowedDays.includes(daysValue) ? daysValue : 7;
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - (periodoDias - 1));
  inicio.setHours(0, 0, 0, 0);

  const { isRequested: hasLinkFilter, objectIds: linkObjectIds } = parseLinkIdsFromQuery(req.query);

  if (hasLinkFilter && linkObjectIds.length === 0) {
    return res.status(400).json({ message: 'linkId/linkIds inválido(s).' });
  }

  const baseMatch = {
    usuarioId: usuarioObjectId,
    criadoEm: { $gte: inicio }
  };

  if (linkObjectIds.length === 1) {
    baseMatch.linkId = linkObjectIds[0];
  } else if (linkObjectIds.length > 1) {
    baseMatch.linkId = { $in: linkObjectIds };
  }

  if (req.query.revisao !== undefined) {
    baseMatch.revisao = Number(req.query.revisao);
  }

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

  let comparativoLinks = [];

  if (linkObjectIds.length > 1) {
    const [selectedLinks, clicksByLink] = await Promise.all([
      Link.find({ _id: { $in: linkObjectIds }, usuarioId: usuarioObjectId }, { slug: 1 }).lean(),
      AccessLog.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$linkId', cliques: { $sum: 1 } } }
      ])
    ]);

    const slugByLinkId = new Map(selectedLinks.map((item) => [String(item._id), item.slug]));
    const clicksByLinkId = new Map(clicksByLink.map((item) => [String(item._id), item.cliques]));

    comparativoLinks = linkObjectIds
      .map((id) => String(id))
      .filter((id) => slugByLinkId.has(id))
      .map((id) => ({
        linkId: id,
        slug: slugByLinkId.get(id),
        totalCliques: clicksByLinkId.get(id) || 0
      }))
      .sort((a, b) => b.totalCliques - a.totalCliques);
  }

  return res.json({
    periodoDias,
    totalCliques: total,
    dispositivos: dispositivos.map((item) => ({ dispositivo: item._id || 'unknown', cliques: item.cliques })),
    plataformas: plataformas.map((item) => ({ plataforma: item._id || 'unknown', cliques: item.cliques })),
    origens: origens.map((item) => ({ origem: item._id || 'unknown', cliques: item.cliques })),
    paises: paises.map((item) => ({ pais: item._id || 'unknown', cliques: item.cliques })),
    cidades: cidades.map((item) => ({ cidade: item._id || 'unknown', cliques: item.cliques })),
    horas: horas.map((item) => ({ hora: Number.isInteger(item._id) ? item._id : 0, cliques: item.cliques })),
    referers: referers.map((item) => ({ referer: item._id || 'unknown', cliques: item.cliques })),
    comparativoLinks
  });
};

const getRevisions = async (req, res) => {
  const usuarioId = req.usuario.id;
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'ID inválido.' });
  }

  const link = await Link.findOne({ _id: id, usuarioId }, { revisoes: 1, revisaoAtual: 1, slug: 1, urlDestino: 1 });
  if (!link) {
    return res.status(404).json({ message: 'Link não encontrado.' });
  }

  // Conta cliques por revisão
  const clicksPorRevisao = await AccessLog.aggregate([
    { $match: { linkId: new mongoose.Types.ObjectId(id) } },
    { $group: { _id: '$revisao', cliques: { $sum: 1 } } }
  ]);

  const mapaCliques = new Map(clicksPorRevisao.map((r) => [r._id, r.cliques]));

  const revisoes = (link.revisoes || []).map((r) => ({
    revisao: r.revisao,
    urlDestino: r.urlDestino,
    inicioEm: r.inicioEm,
    fimEm: r.fimEm,
    cliques: mapaCliques.get(r.revisao) || 0
  }));

  return res.json({
    slug: link.slug,
    urlDestino: link.urlDestino,
    revisaoAtual: link.revisaoAtual,
    revisoes
  });
};

module.exports = {
  listLinks,
  createLink,
  updateLinkDestino,
  getRevisions,
  getLast7DaysClicks,
  getSegmentationMetrics
};
