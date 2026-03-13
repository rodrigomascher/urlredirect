/**
 * Cache em memória para slug → { urlDestino, revisaoAtual }
 * TTL padrão: 60 s. Invalidação explícita no updateLinkDestino.
 */

const TTL_MS = Number(process.env.SLUG_CACHE_TTL_MS || 60_000);

/** @type {Map<string, { urlDestino: string, revisaoAtual: number, linkId: string, usuarioId: string, expiresAt: number }>} */
const store = new Map();

const get = (slug) => {
  const entry = store.get(slug);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(slug);
    return null;
  }
  return { urlDestino: entry.urlDestino, revisaoAtual: entry.revisaoAtual, linkId: entry.linkId, usuarioId: entry.usuarioId };
};

const set = (slug, urlDestino, revisaoAtual, linkId, usuarioId) => {
  store.set(slug, { urlDestino, revisaoAtual, linkId, usuarioId, expiresAt: Date.now() + TTL_MS });
};

const invalidate = (slug) => {
  store.delete(slug);
};

const size = () => store.size;

module.exports = { get, set, invalidate, size };
