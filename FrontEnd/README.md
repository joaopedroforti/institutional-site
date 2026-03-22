# Site Institucional

Landing page institucional responsiva para serviços de consultoria tecnológica e desenvolvimento de sistemas.

## Stack

- Next.js 16
- React 19
- TypeScript
- CSS Modules

## Executar localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

## Build de produção

```bash
npm run build
npm run start
```

## Deploy no EasyPanel

Opção recomendada: usar Docker.

1. Crie um novo app no EasyPanel apontando para este repositório.
2. Configure build com o `Dockerfile` da raiz do projeto.
3. Exponha a porta `3000`.
4. Defina o domínio e habilite HTTPS.

## Estrutura principal

- `app/components/landing-page.tsx`: conteúdo e seções do site.
- `app/components/landing-page.module.css`: estilo, responsividade e animações.
- `app/layout.tsx`: metadados e tipografia.

## Personalização rápida

- Nome da empresa: ajuste `* Tecnologia` no arquivo `app/components/landing-page.tsx`.
- E-mail e WhatsApp: ajuste os links na seção de contato.
- Cores: ajuste variáveis no topo de `app/components/landing-page.module.css`.
