/**
 * Cache em memória para slug → { urlDestino, revisaoAtual, linkId, usuarioId }
 * TTL padrão: 60 s. Invalidação explícita no updateLinkDestino.
 * Limite máximo: 20 000 entradas (FIFO — expulsa a mais antiga ao atingir o teto).
 */

const TTL_MS = Number(process.env.SLUG_CACHE_TTL_MS || 60_000);
const MAX_SIZE = Number(process.env.SLUG_CACHE_MAX_SIZE || 20_000);

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
  // Se já existe, remove antes de reinserir para atualizar posição FIFO
  if (store.has(slug)) {
    store.delete(slug);
  } else if (store.size >= MAX_SIZE) {
    // Expulsa a entrada mais antiga (primeira chave do Map)
    store.delete(store.keys().next().value);
  }
  store.set(slug, { urlDestino, revisaoAtual, linkId, usuarioId, expiresAt: Date.now() + TTL_MS });
};

const invalidate = (slug) => {
  store.delete(slug);
};

const size = () => store.size;

module.exports = { get, set, invalidate, size };
