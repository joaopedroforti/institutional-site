# Deploy no EasyPanel

Este projeto possui 3 serviços:
- `backend` (Laravel API)
- `admin` (Painel React/Vite)
- `main-site` (Site institucional Next.js)

## 1) Backend (Laravel)

- **Path:** `Backend`
- **Dockerfile:** `Backend/Dockerfile`
- **Porta do container:** `80`

### Variáveis de ambiente (recomendadas)
Use como base `Backend/.env.example`.

Obrigatórias em produção:
- `APP_ENV=production`
- `APP_DEBUG=false`
- `APP_URL=https://api.seudominio.com`
- `APP_KEY=<gerar com php artisan key:generate --show>`
- `DB_CONNECTION=pgsql`
- `DB_HOST=<host postgres>`
- `DB_PORT=5432`
- `DB_DATABASE=<database>`
- `DB_USERNAME=<usuario>`
- `DB_PASSWORD=<senha>`
- `CORS_ALLOWED_ORIGINS=https://admin.seudominio.com,https://seudominio.com`

WhatsApp/Evolution (se usar):
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- `EVOLUTION_INSTANCE`
- `EVOLUTION_WEBHOOK_URL`

### Comando pós-deploy (executar uma vez)
No terminal do container do backend:

```bash
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## 2) Admin (React/Vite)

- **Path:** `admin`
- **Dockerfile:** `admin/Dockerfile`
- **Porta do container:** `80`

### Variáveis de ambiente
Use como base `admin/.env.example`:
- `VITE_BACKEND_URL=https://api.seudominio.com`
- `VITE_API_URL=https://api.seudominio.com/api` (opcional, sobrescreve `VITE_BACKEND_URL + /api`)
- `VITE_MAIN_SITE_URL=https://seudominio.com`
- `VITE_ADMIN_URL=https://admin.seudominio.com`
- `VITE_WS_URL=wss://ws.seudominio.com` (opcional)

## 3) Main Site (Next.js)

- **Path:** `main-site`
- **Dockerfile:** `main-site/Dockerfile`
- **Porta do container:** `3000`

### Variáveis de ambiente
Use como base `main-site/.env.example`:
- `NEXT_PUBLIC_BACKEND_URL=https://api.seudominio.com`
- `NEXT_PUBLIC_API_BASE_URL=https://api.seudominio.com/api` (opcional, sobrescreve `NEXT_PUBLIC_BACKEND_URL + /api`)
- `NEXT_PUBLIC_MAIN_SITE_URL=https://seudominio.com`
- `NEXT_PUBLIC_ADMIN_URL=https://admin.seudominio.com`
- `NEXT_PUBLIC_WS_URL=wss://ws.seudominio.com` (opcional)

## Observações
- Configure domínio/subdomínio por serviço no EasyPanel.
- Garanta que o serviço do backend esteja no ar antes do admin/main-site.
- Se alterar migrations, rode novamente `php artisan migrate --force`.

## Evitar travamento da VPS no deploy

Em VPS menor, o principal risco é build concorrente (admin + main-site ao mesmo tempo).

Recomendado:
1. Deploy `backend` primeiro.
2. Deploy `admin` e aguarde concluir.
3. Deploy `main-site` por último.

Boas práticas no EasyPanel:
- Evite rebuild de múltiplos serviços simultaneamente.
- Se possível, limite cada serviço para memória fixa (ex.: 512MB~1GB por serviço frontend em build).
- Mantenha swap habilitado na VPS para evitar congelamento total do host.
- Prefira atualizar um serviço por vez em janelas curtas.
