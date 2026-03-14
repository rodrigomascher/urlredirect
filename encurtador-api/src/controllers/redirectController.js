const Link = require('../models/Link');
const AccessLog = require('../models/AccessLog');
const User = require('../models/User');
const geoip = require('geoip-lite');
const slugCache = require('../config/slugCache');

const parseBooleanEnv = (name, fallback = false) => {
  const normalized = String(process.env[name] || '').trim().toLowerCase();

  if (!normalized) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(normalized);
};

const BLOCK_INACTIVE_USER_REDIRECTS = parseBooleanEnv('BLOCK_INACTIVE_USER_REDIRECTS', false);

const isUsuarioAtivo = async (usuarioId) => {
  const user = await User.findById(usuarioId, { _id: 1, ativo: 1 });
  return Boolean(user && user.ativo !== false);
};

const detectDevice = (userAgent) => {
  const ua = (userAgent || '').toLowerCase();
  return /android|iphone|ipad|ipod|mobile|blackberry|opera mini|iemobile/.test(ua)
    ? 'mobile'
    : 'desktop';
};

const detectPlatform = (userAgent) => {
  const ua = (userAgent || '').toLowerCase();

  if (ua.includes('android')) {
    return 'android';
  }

  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod') || ua.includes('ios')) {
    return 'iphone';
  }

  if (ua.includes('windows') || ua.includes('macintosh') || ua.includes('linux')) {
    return 'desktop';
  }

  return 'other';
};

const normalizeText = (value) => String(value || '').trim();

const normalizeIp = (value) => {
  const raw = normalizeText(value);

  if (!raw) {
    return '';
  }

  if (raw.includes(',')) {
    return normalizeIp(raw.split(',')[0]);
  }

  if (raw.startsWith('::ffff:')) {
    return raw.replace('::ffff:', '');
  }

  return raw;
};

const detectSource = ({ utmSource, referer }) => {
  const utm = normalizeText(utmSource).toLowerCase();
  if (utm) {
    return utm;
  }

  const ref = normalizeText(referer).toLowerCase();
  if (!ref) {
    return 'direct';
  }

  if (ref.includes('instagram')) {
    return 'instagram';
  }

  if (ref.includes('facebook')) {
    return 'facebook';
  }

  if (ref.includes('google')) {
    return 'google';
  }

  if (ref.includes('t.co') || ref.includes('twitter') || ref.includes('x.com')) {
    return 'x';
  }

  return 'referral';
};

const redirectBySlug = async (req, res) => {
  const { slug } = req.params;
  const slugNormalizado = String(slug || '').toLowerCase().trim();

  // Tenta cache antes de ir ao banco
  const cached = slugCache.get(slugNormalizado);
  let urlDestino, revisaoAtual, linkId, usuarioId, usuarioAtivo = true;

  if (cached) {
    urlDestino = cached.urlDestino;
    revisaoAtual = cached.revisaoAtual;
    linkId = cached.linkId;
    usuarioId = cached.usuarioId;
    if (typeof cached.usuarioAtivo === 'boolean') {
      usuarioAtivo = cached.usuarioAtivo;
    }
  } else {
    const link = await Link.findOne({ slug: slugNormalizado });
    if (!link) {
      return res.status(404).json({ message: 'Slug não encontrado.' });
    }
    urlDestino = link.urlDestino;
    revisaoAtual = link.revisaoAtual ?? 1;
    linkId = link._id;
    usuarioId = link.usuarioId;

    if (BLOCK_INACTIVE_USER_REDIRECTS) {
      usuarioAtivo = await isUsuarioAtivo(usuarioId);
    }

    slugCache.set(slugNormalizado, urlDestino, revisaoAtual, linkId, usuarioId, usuarioAtivo);
  }

  if (BLOCK_INACTIVE_USER_REDIRECTS) {
    // Compatibilidade com entradas antigas em memória (sem usuarioAtivo).
    if (typeof cached?.usuarioAtivo !== 'boolean') {
      usuarioAtivo = await isUsuarioAtivo(usuarioId);
      slugCache.set(slugNormalizado, urlDestino, revisaoAtual, linkId, usuarioId, usuarioAtivo);
    }

    if (!usuarioAtivo) {
      return res.status(404).json({ message: 'Slug não encontrado.' });
    }
  }

  const userAgent = req.headers['user-agent'] || '';
  const referer = normalizeText(req.headers.referer || req.headers.referrer || '');
  const utmSource = normalizeText(req.query.utm_source || '').toLowerCase();
  const utmMedium = normalizeText(req.query.utm_medium || '').toLowerCase();
  const utmCampaign = normalizeText(req.query.utm_campaign || '').toLowerCase();
  const ip = normalizeIp(req.headers['x-forwarded-for'] || req.ip || '');
  const dispositivo = detectDevice(userAgent);
  const plataforma = detectPlatform(userAgent);
  const source = detectSource({ utmSource, referer });
  const geo = ip ? geoip.lookup(ip) : null;
  const country = normalizeText(geo?.country || 'unknown').toLowerCase() || 'unknown';
  const region = normalizeText(geo?.region || '').toLowerCase();
  const city = normalizeText(geo?.city || '').toLowerCase();
  const horaAcesso = new Date().getHours();

  void AccessLog.create({
    linkId,
    slug: slugNormalizado,
    revisao: revisaoAtual,
    usuarioId,
    dispositivo,
    plataforma,
    userAgent,
    ip,
    referer,
    source,
    utmSource,
    utmMedium,
    utmCampaign,
    country,
    region,
    city,
    horaAcesso,
    criadoEm: new Date()
  }).catch((error) => {
    console.error('Falha ao registrar access log:', error.message);
  });

  return res.redirect(302, urlDestino);
};

module.exports = { redirectBySlug };
