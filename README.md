# BlindTrack — Gestão e Rastreabilidade de Blindagem Automotiva

O **BlindTrack** acompanha cada veículo blindado da entrada na oficina até a entrega ao
cliente: ordens de serviço, etapas de produção e responsáveis, prazos, ocorrências,
documentos e um histórico que não pode ser alterado.

O repositório reúne os dois projetos do sistema:

| Pasta                    | Projeto                                                                   | Porta  |
| ------------------------ | ------------------------------------------------------------------------- | ------ |
| [`backend/`](backend/)   | API REST — Node.js, Express 5, TypeScript, PostgreSQL 16 e Prisma 7       | `3000` |
| [`frontend/`](frontend/) | Portal do cliente e painel administrativo — React 19, Vite e Tailwind CSS | `5173` |

> O sistema é **administrativo e de rastreabilidade**. Ele não toma decisões de engenharia,
> certificação ou conformidade legal; só registra as decisões humanas (quem aprovou, quando e
> o quê).

## Sumário

- [Arquitetura](#arquitetura)
- [Pré-requisitos](#pré-requisitos)
- [Instalação passo a passo](#instalação-passo-a-passo)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Executando o projeto](#executando-o-projeto)
- [Usuários de teste](#usuários-de-teste)
- [Comandos úteis](#comandos-úteis)
- [Testes e qualidade](#testes-e-qualidade)
- [Solução de problemas](#solução-de-problemas)
- [Documentação detalhada](#documentação-detalhada)

## Arquitetura

```
 Navegador ──► frontend (Vite, :5173) ──► backend (API, :3000/api/v1) ──► PostgreSQL 16 (Docker, :5433)
                React + TypeScript         Express + Prisma                 volume persistente
```

- **Autenticação:** cookie de sessão `HttpOnly` (o token nunca fica acessível ao JavaScript),
  mais o cabeçalho anti-CSRF `X-Requested-With` nas gravações. Clientes de API também podem
  usar `Authorization: Bearer`.
- **Perfis:** `ADMIN`, `GESTOR`, `TECNICO` e `ATENDIMENTO` usam o painel (`/painel`); `CLIENTE`
  usa o portal (`/portal`), só com as próprias ordens de serviço.
- **API documentada** com OpenAPI/Swagger em `http://localhost:3000/api/v1/docs`.

## Pré-requisitos

| Ferramenta                     | Versão                                 | Verificar com            |
| ------------------------------ | -------------------------------------- | ------------------------ |
| **Node.js**                    | 22.13 ou superior (LTS 24 recomendado) | `node --version`         |
| **npm**                        | o que acompanha o Node                 | `npm --version`          |
| **Docker Engine** + Compose v2 | recente                                | `docker compose version` |
| **Git**                        | recente                                | `git --version`          |
| **OpenSSL**                    | qualquer (gera o segredo do JWT)       | `openssl version`        |

<details>
<summary>Instalação no Ubuntu/Debian</summary>

```bash
# Docker e Git
sudo apt update
sudo apt install -y docker.io docker-compose-v2 git openssl
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"   # docker sem sudo (vale a partir do próximo login)
newgrp docker

# Node.js via nvm (sem sudo)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 24
```

</details>

> **Windows:** use o [WSL 2](https://learn.microsoft.com/windows/wsl/install) com Ubuntu e o
> Docker Desktop com integração WSL; os comandos abaixo funcionam iguais dentro do WSL.

## Instalação passo a passo

### 1. Clonar o repositório

```bash
git clone https://github.com/<seu-usuario>/blindtrack.git
cd blindtrack
```

### 2. Backend: variáveis de ambiente

```bash
cd backend
cp .env.example .env
openssl rand -base64 48      # copie a saída para JWT_SECRET no .env
```

Abra o `backend/.env` e troque **todos** os valores de exemplo:

- `JWT_SECRET` — a saída do `openssl` acima (mínimo de 32 caracteres);
- `POSTGRES_PASSWORD` — uma senha para o banco, **repetida** dentro de `DATABASE_URL` e
  `TEST_DATABASE_URL` (no trecho `blindtrack:<senha>@localhost`);
- `SEED_SENHA_INICIAL` — a senha dos usuários de teste (mínimo de 12 caracteres).

Detalhes de cada variável em [Variáveis de ambiente](#variáveis-de-ambiente).

### 3. Backend: dependências e banco de dados

```bash
npm ci                       # instala as versões exatas do package-lock (gera o Prisma Client)
docker compose up -d         # sobe o PostgreSQL 16 (cria também o banco de testes)
docker compose ps            # aguarde o STATUS "healthy"
npm run db:deploy            # cria as tabelas (migrations)
npm run db:seed              # etapas padrão, usuários e dados de exemplo
cd ..
```

### 4. Frontend: variáveis e dependências

```bash
cd frontend
cp .env.example .env         # o padrão já aponta para a API local
npm ci
cd ..
```

## Variáveis de ambiente

Os arquivos `.env` **não são versionados** (estão no `.gitignore`). Cada projeto traz um
`.env.example` com valores fictícios para copiar.

### `backend/.env`

As variáveis são validadas na inicialização: se faltar alguma ou houver valor inválido, a API
não sobe e mostra o motivo.

| Variável                          | Obrigatória | Exemplo / padrão                                                          | Descrição                                                     |
| --------------------------------- | ----------- | ------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `NODE_ENV`                        | não         | `development`                                                             | `development`, `production` ou `test`                         |
| `PORT`                            | não         | `3000`                                                                    | Porta HTTP da API                                             |
| `LOG_LEVEL`                       | não         | `info`                                                                    | `fatal` … `trace` ou `silent`                                 |
| `CORS_ORIGINS`                    | sim\*       | `http://localhost:5173`                                                   | Origens do front autorizadas, separadas por vírgula           |
| `JWT_SECRET`                      | **sim**     | saída de `openssl rand -base64 48`                                        | Segredo de assinatura da sessão (mín. 32 caracteres)          |
| `JWT_EXPIRES_IN`                  | não         | `8h`                                                                      | Duração da sessão                                             |
| `BCRYPT_SALT_ROUNDS`              | não         | `12`                                                                      | Custo do hash das senhas (10 a 15)                            |
| `LOGIN_RATE_LIMIT_MAX`            | não         | `10`                                                                      | Tentativas de login falhas permitidas por IP…                 |
| `LOGIN_RATE_LIMIT_WINDOW_MINUTES` | não         | `15`                                                                      | …dentro desta janela (minutos)                                |
| `UPLOAD_DIR`                      | não         | `./uploads`                                                               | Pasta dos documentos enviados (fora do Git)                   |
| `UPLOAD_MAX_SIZE_MB`              | não         | `10`                                                                      | Tamanho máximo de cada arquivo                                |
| `POSTGRES_USER` / `POSTGRES_DB`   | **sim**     | `blindtrack`                                                              | Usuário e banco criados pelo Docker                           |
| `POSTGRES_PASSWORD`               | **sim**     | —                                                                         | Senha do banco (a mesma usada nas URLs abaixo)                |
| `POSTGRES_TEST_DB`                | não         | `blindtrack_test`                                                         | Banco separado usado pelos testes                             |
| `POSTGRES_PORT`                   | não         | `5433`                                                                    | Porta do PostgreSQL no host (só em `127.0.0.1`)               |
| `DATABASE_URL`                    | **sim**     | `postgresql://blindtrack:<senha>@localhost:5433/blindtrack?schema=public` | Conexão do Prisma                                             |
| `TEST_DATABASE_URL`               | para testes | `…/blindtrack_test?schema=public`                                         | Conexão usada pelos testes de integração                      |
| `SEED_SENHA_INICIAL`              | para o seed | —                                                                         | Senha inicial de todos os usuários criados pelo seed          |
| `SEED_DADOS_EXEMPLO`              | não         | `true`                                                                    | Cria clientes, veículos e OS fictícios (ignorado em produção) |

\* Sem `CORS_ORIGINS` contendo a origem do front, o navegador bloqueia as chamadas.

### `frontend/.env`

| Variável       | Obrigatória | Padrão                         | Descrição                                      |
| -------------- | ----------- | ------------------------------ | ---------------------------------------------- |
| `VITE_API_URL` | **sim**     | `http://localhost:3000/api/v1` | URL base da API, incluindo o prefixo de versão |

> O front não guarda segredos: tudo que começa com `VITE_` vai para o código público do
> navegador. Se mudar a porta ou o endereço do front, inclua a nova origem em `CORS_ORIGINS`.

## Executando o projeto

Use **dois terminais**, a partir da raiz do repositório:

```bash
# Terminal 1 — API (recarrega ao salvar)
cd backend && npm run dev

# Terminal 2 — front-end
cd frontend && npm run dev
```

| Endereço                              | O que é                                       |
| ------------------------------------- | --------------------------------------------- |
| <http://localhost:5173>               | Aplicação (login, portal do cliente e painel) |
| <http://localhost:3000/api/v1/health> | Saúde da API e do banco (`200` = tudo no ar)  |
| <http://localhost:3000/api/v1/docs>   | Documentação interativa da API (Swagger)      |

O banco continua rodando em segundo plano pelo Docker. Ao religar a máquina, suba-o de novo
com `cd backend && docker compose up -d`.

### Versão de produção (local)

```bash
cd backend  && npm run build && npm start       # API compilada (dist/)
cd frontend && npm run build && npm run preview # front compilado, servido em :5173
```

## Usuários de teste

Criados pelo `npm run db:seed`. **Todos usam a senha definida em `SEED_SENHA_INICIAL`** no
`backend/.env`; nenhuma senha fica no repositório.

| E-mail                           | Perfil      | Área                                                |
| -------------------------------- | ----------- | --------------------------------------------------- |
| `admin@blindtrack.example`       | ADMIN       | Painel completo, incluindo usuários e configurações |
| `gestor@blindtrack.example`      | GESTOR      | Painel: operação, prazos, aprovações                |
| `tecnico1@blindtrack.example`    | TECNICO     | Painel: só as etapas sob sua responsabilidade       |
| `atendimento@blindtrack.example` | ATENDIMENTO | Painel: clientes, veículos e abertura de OS         |
| `cliente@blindtrack.example`     | CLIENTE     | Portal: acompanhamento da própria blindagem         |

> Troque as senhas antes de qualquer uso fora do ambiente de desenvolvimento.

## Comandos úteis

| Onde        | Comando                                 | O que faz                                             |
| ----------- | --------------------------------------- | ----------------------------------------------------- |
| `backend/`  | `npm run dev`                           | API em modo desenvolvimento                           |
| `backend/`  | `docker compose up -d` / `down`         | Sobe / para o PostgreSQL (os dados são mantidos)      |
| `backend/`  | `npm run db:deploy`                     | Aplica as migrations                                  |
| `backend/`  | `npm run db:seed`                       | Popula os dados iniciais (pode rodar mais de uma vez) |
| `backend/`  | `npm run db:studio`                     | Abre o Prisma Studio para ver os dados                |
| `backend/`  | `npm run db:reset`                      | ⚠️ **Apaga** o banco de desenvolvimento e recria tudo |
| `frontend/` | `npm run dev`                           | Front em modo desenvolvimento                         |
| `frontend/` | `npm run build`                         | Typecheck + build de produção                         |
| ambos       | `npm test`                              | Testes automatizados                                  |
| ambos       | `npm run typecheck` / `lint` / `format` | Tipos, ESLint e Prettier                              |

## Testes e qualidade

```bash
cd backend  && npm test    # unitários + integração (precisa do PostgreSQL no ar; usa o banco de testes)
cd frontend && npm test    # componentes e telas (Vitest + Testing Library + axe-core)
```

- Os testes do backend usam o banco `blindtrack_test` e **nunca** tocam o de desenvolvimento.
- O front verifica acessibilidade (WCAG 2.1 AA) automaticamente nas telas principais.
- Em máquinas lentas ou VMs, rode o front com `npx vitest run --maxWorkers=1`.

## Solução de problemas

| Sintoma                                     | Causa provável e solução                                                                             |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| API não sobe e lista variáveis inválidas    | `backend/.env` incompleto: compare com o `.env.example`.                                             |
| `/health` responde `503` / `database: down` | Banco parado: `cd backend && docker compose up -d`. Confira a senha e a porta em `DATABASE_URL`.     |
| `permission denied` ao usar o Docker        | Usuário fora do grupo `docker`: `sudo usermod -aG docker $USER` e faça login de novo.                |
| Porta `5173` ou `3000` em uso               | Outro processo usa a porta. A `5173` é fixa porque é a origem autorizada no CORS.                    |
| Erro de CORS no console do navegador        | A origem do front não está em `CORS_ORIGINS` (backend) ou `VITE_API_URL` aponta para o lugar errado. |
| Login recusado com “muitas tentativas”      | Limite de tentativas falhas: espere a janela (padrão de 15 min) ou ajuste `LOGIN_RATE_LIMIT_*`.      |
| Login como cliente não mostra nenhuma OS    | O seed rodou com `SEED_DADOS_EXEMPLO=false`: mude para `true` e rode `npm run db:seed` de novo.      |

## Documentação detalhada

- [backend/README.md](backend/README.md) — API: endpoints, regras de negócio, segurança e testes.
- [backend/docs/](backend/docs/) — requisitos, casos de uso, modelagem, diagramas e evidências.
- [backend/docs/api/openapi.json](backend/docs/api/openapi.json) — especificação OpenAPI (Postman/Insomnia).
- [frontend/README.md](frontend/README.md) — front-end: estrutura, autenticação e qualidade.
- [frontend/docs/fase-1-planejamento.md](frontend/docs/fase-1-planejamento.md) — planejamento de telas, rotas e acessibilidade.
- [backend/DOCUMENTACAO_IA.md](backend/DOCUMENTACAO_IA.md) — como a IA foi usada no desenvolvimento.

---

Projeto acadêmico desenvolvido em fases, com apoio de IA.
