# Publicação na Google (quase grátis)

Este projeto está preparado para:
- Backend: **Google Cloud Run**
- Frontend: **Firebase Hosting**
- Banco: **MongoDB Atlas Free (M0)**

## 1) Pré-requisitos

- Conta Google Cloud com billing ativado
- Projeto criado no GCP
- `gcloud` CLI instalado
- Node.js instalado

## 2) Variáveis que você vai usar

No PowerShell, defina:

```powershell
$PROJECT_ID="SEU_PROJECT_ID"
$REGION="us-central1"
$SERVICE_API="encurtador-api"
```

## 3) Deploy do Backend (Cloud Run)

No diretório raiz do workspace:

```powershell
Set-Location "c:\extensão\urlredirect"
gcloud auth login
gcloud config set project $PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

Deploy com build remoto (usa `encurtador-api/Dockerfile`):

```powershell
gcloud run deploy $SERVICE_API `
  --source .\encurtador-api `
  --region $REGION `
  --allow-unauthenticated `
  --set-env-vars "MONGO_URI=SEU_MONGO_ATLAS_URI,JWT_SECRET=SEU_SEGREDO,JWT_EXPIRES_IN=1d,FRONTEND_URL=URL_DO_FIREBASE,ADMIN_EMAIL=admin@encurtador.local,ADMIN_PASSWORD=SENHA_ADMIN_FORTE"
```

Pegue a URL gerada (exemplo):

```text
https://encurtador-api-xxxxx-uc.a.run.app
```

## 4) Ajustar frontend para usar a API publicada

Edite:
- `encurtador-web/src/environments/environment.prod.ts`

Troque:
- `SEU_BACKEND_CLOUD_RUN_URL`

Por exemplo:

```ts
apiUrl: 'https://encurtador-api-xxxxx-uc.a.run.app/api',
shortBaseUrl: 'https://SEU_PROJETO.web.app/r'
```

Com isso, os links curtos ficam no frontend (ex.: `https://SEU_PROJETO.web.app/r/meu-slug`) e o Firebase faz rewrite de `r/**` para o Cloud Run.

## 5) Build de produção do frontend

```powershell
Set-Location "c:\extensão\urlredirect\encurtador-web"
npm run build -- --configuration production
```

## 6) Deploy do Frontend (Firebase Hosting)

Instalar CLI e autenticar:

```powershell
npm install -g firebase-tools
firebase login
```

Inicializar hosting (uma vez):

```powershell
firebase use --add
```

Deploy:

```powershell
firebase deploy --only hosting
```

A URL final será algo como:

```text
https://SEU_PROJETO.web.app
```

## 7) Pós deploy (importante)

- Atualize a variável `FRONTEND_URL` no Cloud Run com a URL do Firebase:

```powershell
gcloud run services update $SERVICE_API --region $REGION --set-env-vars "FRONTEND_URL=https://SEU_PROJETO.web.app"
```

- Teste:
  - Frontend abre login
  - Admin consegue pré-cadastrar usuário
  - Usuário cria slug
  - URL curta redireciona com 302

## 8) Custos / grátis

- Cloud Run e Firebase têm free tier, mas podem cobrar se exceder limites.
- Para economizar:
  - mantenha `min instances = 0` (padrão)
  - evite tráfego alto e logs excessivos.
