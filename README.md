# BlindTrack — Front-end

Interface web do sistema **Blindada-veiculo** (gestão e rastreabilidade de blindagem
automotiva): **portal do cliente** e **painel administrativo**. Aplicação SPA independente,
que consome a API REST do backend (`~/Blindada-veiculo`).

**Status:** Fase 4 (portal do cliente) concluída: seleção de veículo, progresso calculado das
etapas reais, linha do tempo da blindagem (vertical no celular, horizontal a partir de 1024 px),
ocorrências, documentos com download autenticado e atualizações. O painel administrativo é a
Fase 5. Planejamento em [docs/fase-1-planejamento.md](docs/fase-1-planejamento.md).

## Como testar o login

Com o backend e o front no ar, abra <http://localhost:5173> e entre com um usuário do seed do
backend (senha em `SEED_SENHA_INICIAL` no `.env` do backend):

| E-mail                                                                | Vai para  |
| --------------------------------------------------------------------- | --------- |
| `cliente@blindtrack.example`                                          | `/portal` |
| `gestor@blindtrack.example`, `tecnico1@…`, `atendimento@…`, `admin@…` | `/painel` |

Para ver a proteção por perfil, logado como cliente, abra `/painel` (e vice-versa): aparece
"Acesso negado". Recarregar a página mantém a sessão; "Sair" a encerra.

## Tecnologias

| Camada      | Tecnologia                                                      |
| ----------- | --------------------------------------------------------------- |
| Base        | React 19, TypeScript 5.9 (`strict`), Vite 8                     |
| Estilo      | Tailwind CSS 4 (tokens no `@theme` de `src/styles/globals.css`) |
| Rotas       | React Router DOM 7                                              |
| Ícones      | Lucide React                                                    |
| Formulários | React Hook Form + Zod (a partir da Fase 3)                      |
| Datas       | date-fns                                                        |
| HTTP        | Fetch API, centralizada em `src/services/api.ts`                |
| Testes      | Vitest + React Testing Library + jsdom                          |

> **React Router DOM:** o prompt pede `react-router-dom`. Esse pacote está na 7.x (é a
> mesma biblioteca do `react-router`, com o nome antigo) e não acompanhou a 8.x. Usamos a
> 7.18.6. **TypeScript 5.9:** o `typescript-eslint` ainda não suporta o TypeScript 7.

## Pré-requisitos

- Node.js 22.13+ e npm.
- Backend em execução (`cd ~/Blindada-veiculo && npm run dev`), com `http://localhost:5173` em `CORS_ORIGINS` (já é o padrão do `.env.example` do backend).

## Instalação e execução

```bash
cd ~/blindada-frontend
cp .env.example .env        # VITE_API_URL=http://localhost:3000/api/v1
npm ci
npm run dev                 # http://localhost:5173
```

A página inicial (e `/status`) mostra o **diagnóstico da conexão** com dados reais do
`GET /health`: API disponível, banco conectado e endereço configurado. Se aparecer
"Não foi possível conectar ao servidor", confira se o backend está no ar e se o
`VITE_API_URL` está correto.

## Configuração

| Variável       | Exemplo                        | Descrição                                |
| -------------- | ------------------------------ | ---------------------------------------- |
| `VITE_API_URL` | `http://localhost:3000/api/v1` | URL base da API, com o prefixo de versão |

O front não guarda segredos: tudo que começa com `VITE_` vai para o JavaScript público.

## Autenticação (como funciona)

A sessão usa um **cookie HttpOnly** definido pelo backend (`bt_sessao`, SameSite=Strict):

- o JavaScript **nunca** vê o token, então um XSS não consegue roubá-lo;
- todas as chamadas usam `credentials: 'include'` e o cabeçalho `X-Requested-With: BlindTrack`, que o backend exige em escritas via cookie (proteção contra CSRF);
- a senha nunca é persistida; nada vai para `localStorage`;
- um 401 em qualquer chamada avisa o `AuthContext` (Fase 3), que encerra a sessão.

A autorização real é do backend. As rotas protegidas do React só organizam a navegação.

## Estrutura

```
src/
├── components/ui/      Button, Card, Badge, estados de carregamento/erro/vazio
├── hooks/useApi.ts     carregamento com cancelamento e estados derivados
├── pages/              sistema/ (diagnóstico), erros/ (404)
├── routes/AppRoutes.tsx
├── services/           api.ts (único ponto de fetch) + um serviço por domínio
├── styles/globals.css  design tokens (Tailwind 4)
└── types/              contratos da API, conferidos no backend
tests/                  Vitest + Testing Library
```

## Comandos

| Comando                                                     | Descrição                                      |
| ----------------------------------------------------------- | ---------------------------------------------- |
| `npm run dev`                                               | Servidor de desenvolvimento (porta 5173, fixa) |
| `npm run build`                                             | Typecheck + build de produção em `dist/`       |
| `npm run preview`                                           | Serve o build de produção                      |
| `npm test` / `npm run test:watch` / `npm run test:coverage` | Testes                                         |
| `npm run typecheck` / `npm run lint` / `npm run format`     | Qualidade                                      |
