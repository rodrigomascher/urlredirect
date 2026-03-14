/**
 * Cache em memória para slug → { urlDestino, revisaoAtual, linkId, usuarioId, usuarioAtivo }
 * TTL padrão: 60 s. Invalidação explícita em updates/deletes de links e inativação de usuários.
 * Limite máximo: 20 000 entradas (FIFO — expulsa a mais antiga ao atingir o teto).
 */

const DEFAULT_TTL_MS = 60_000;
const DEFAULT_MAX_SIZE = 20_000;

const parsePositiveIntEnv = (name, fallback) => {
  const rawValue = String(process.env[name] || '').trim();

  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    console.warn(`${name} inválido (${rawValue}). Usando valor padrão: ${fallback}.`);
    return fallback;
  }

  return parsed;
};

const TTL_MS = parsePositiveIntEnv('SLUG_CACHE_TTL_MS', DEFAULT_TTL_MS);
const MAX_SIZE = parsePositiveIntEnv('SLUG_CACHE_MAX_SIZE', DEFAULT_MAX_SIZE);

/** @type {Map<string, { urlDestino: string, revisaoAtual: number, linkId: string, usuarioId: string, usuarioAtivo: boolean, expiresAt: number }>} */
const store = new Map();

const get = (slug) => {
  const entry = store.get(slug);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(slug);
    return null;
  }
  return {
    urlDestino: entry.urlDestino,
    revisaoAtual: entry.revisaoAtual,
    linkId: entry.linkId,
    usuarioId: entry.usuarioId,
    usuarioAtivo: entry.usuarioAtivo
  };
};

const set = (slug, urlDestino, revisaoAtual, linkId, usuarioId, usuarioAtivo = true) => {
  // Se já existe, remove antes de reinserir para atualizar posição FIFO
  if (store.has(slug)) {
    store.delete(slug);
  } else if (store.size >= MAX_SIZE) {
    // Expulsa a entrada mais antiga (primeira chave do Map)
    store.delete(store.keys().next().value);
  }
  store.set(slug, { urlDestino, revisaoAtual, linkId, usuarioId, usuarioAtivo, expiresAt: Date.now() + TTL_MS });
};

const invalidate = (slug) => {
  store.delete(slug);
};

const invalidateByUserId = (userId) => {
  const userIdNormalizado = String(userId || '').trim();

  if (!userIdNormalizado) {
    return 0;
  }

  let removidos = 0;

  for (const [slug, entry] of store.entries()) {
    if (String(entry.usuarioId) === userIdNormalizado) {
      store.delete(slug);
      removidos += 1;
    }
  }

  return removidos;
};

const size = () => store.size;

module.exports = { get, set, invalidate, invalidateByUserId, size };
