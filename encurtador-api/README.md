# Encurtador API

## Executar localmente

1. Copie `.env.example` para `.env` e ajuste os valores.
2. Instale dependências:

```bash
npm install
```

3. Suba a API:

```bash
npm run dev
```

## Rotas principais

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/admin/users` (Bearer token admin)
- `POST /api/admin/users` (Bearer token admin)
- `GET /api/links` (Bearer token)
- `POST /api/links` (Bearer token)
- `PATCH /api/links/:id` (Bearer token)
- `GET /api/links/metrics/last-7-days` (Bearer token)
- `GET /api/links/metrics/segmentation` (Bearer token)
- `GET /:slug` (redireciona com HTTP 302 e registra acesso)

## Segmentação de origem

No acesso do slug, a API registra:

- `dispositivo` (`mobile` ou `desktop`)
- `source` (ex.: `instagram`, `google`, `direct`, `referral`)
- `referer`
- UTM (`utm_source`, `utm_medium`, `utm_campaign`)
- Geolocalização por IP (`country`, `region`, `city`) via `geoip-lite`

## Admin

- O `admin` agora é um usuário persistido no banco com `role: admin`.
- No primeiro start, a API pode criar esse admin automaticamente se `ADMIN_EMAIL` e `ADMIN_PASSWORD_HASH` estiverem definidos no `.env`.
- `ADMIN_PASSWORD` em texto puro ficou apenas como compatibilidade temporária de bootstrap; prefira `ADMIN_PASSWORD_HASH`.
- Depois de criado no banco, o login de admin acontece normalmente em `POST /api/auth/login`.
- Use o token admin para pré-cadastrar usuários do encurtador via `POST /api/admin/users`.
