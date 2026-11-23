# BlindTrack — Gestão e Rastreabilidade de Blindagem Automotiva

API REST para empresas de blindagem controlarem cada veículo desde a entrada até a
entrega: ordens de serviço, etapas, responsáveis, prazos, ocorrências, documentos e
histórico imutável, além de um portal de consulta para o cliente.

> O sistema é **administrativo e de rastreabilidade**. Ele não toma decisões técnicas de
> engenharia, certificação, inspeção ou conformidade legal: só registra as decisões humanas.

**Status:** Fase 5 concluída: API completa, documentada no Swagger, com revisão de segurança e 206 testes automatizados (94% de cobertura de linhas). A Fase 6 (documentação final) é a próxima.

## Tecnologias

| Camada       | Tecnologia                                        |
| ------------ | ------------------------------------------------- |
| Runtime      | Node.js ≥ 22.13 (LTS 22/24; testado também no 26) |
| HTTP         | Express 5                                         |
| Linguagem    | TypeScript 5.9 (`strict`, ESM / `NodeNext`)       |
| Banco        | PostgreSQL 16 via Docker Compose                  |
| ORM          | Prisma 7.10 + `@prisma/adapter-pg`                |
| Validação    | Zod 4                                             |
| Segurança    | JWT, bcrypt, Helmet, CORS, express-rate-limit     |
| Logs         | Pino / pino-http                                  |
| Documentação | Swagger UI (OpenAPI 3) em `/api/v1/docs`          |
| Testes       | Vitest + Supertest                                |

## Pré-requisitos

- Node.js 22.13+ (recomendado: 24 LTS; veja `.nvmrc`) e npm.
- Docker Engine com o plugin Docker Compose v2.
- Git.

### Instalação do Docker e do Git (Ubuntu 26.04)

```bash
# 1. Pacotes do repositório oficial do Ubuntu
sudo apt update
sudo apt install -y docker.io docker-compose-v2 git

# 2. Inicia o Docker agora e em todo boot
sudo systemctl enable --now docker

# 3. Permite usar o docker sem sudo (vale a partir do próximo login)
sudo usermod -aG docker "$USER"
newgrp docker            # aplica o grupo no terminal atual

# 4. Verificação
docker run --rm hello-world
docker compose version
git --version
```

> Pertencer ao grupo `docker` equivale, na prática, a ter acesso de root. Faça isso só
> na sua máquina de desenvolvimento.

### Configuração do Git (repositório local e privado)

```bash
git config --global user.name  "Seu Nome"
git config --global user.email "seu-email@exemplo.com"
git config --global init.defaultBranch main

cd ~/Blindada-veiculo
chmod 700 .              # só o seu usuário Linux pode ler a pasta
git init
git add .
git status               # confira: .env, node_modules/ e src/generated/ NÃO podem aparecer
git commit -m "chore: infraestrutura inicial (fase 2)"
```

O repositório não tem _remote_, então fica só na sua máquina. Para publicá-lo no GitHub
como **privado**: `gh repo create blindada-veiculo --private --source=. --push`.

## Instalação e execução

```bash
cd ~/Blindada-veiculo

# 1. Variáveis de ambiente (troque TODOS os segredos)
cp .env.example .env
openssl rand -base64 48   # use a saída como JWT_SECRET

# 2. Dependências. O postinstall já roda `prisma generate`.
npm install

# 3. Banco de dados
docker compose up -d
docker compose ps         # aguarde STATUS "healthy"

# 4. Migrations + Prisma Client e dados iniciais
npm run db:migrate        # aplica as migrations e regenera o Prisma Client
npm run db:seed           # modelos de etapa, usuários e (opcional) dados de exemplo

# 5. API em modo desenvolvimento (recarrega ao salvar)
npm run dev
```

Validação rápida:

```bash
curl -i http://localhost:3000/api/v1/health
# 200 {"status":"ok","database":"up",...}  → API e banco OK
# 503 {"status":"degraded","database":"down",...} → banco inacessível
```

Documentação interativa: <http://localhost:3000/api/v1/docs>

### Sobre as portas

O PostgreSQL do container fica publicado em **`127.0.0.1:5433`** (`POSTGRES_PORT`), para não
conflitar com um PostgreSQL instalado nativamente na porta 5432. Dentro do container, a
porta continua 5432. A `DATABASE_URL` do `.env` precisa usar a mesma porta de `POSTGRES_PORT`.

## Usuários do seed

| E-mail                                                        | Perfil                                     |
| ------------------------------------------------------------- | ------------------------------------------ |
| `admin@blindtrack.example`                                    | ADMIN                                      |
| `gestor@blindtrack.example`                                   | GESTOR                                     |
| `tecnico1@blindtrack.example` / `tecnico2@blindtrack.example` | TECNICO                                    |
| `atendimento@blindtrack.example`                              | ATENDIMENTO                                |
| `cliente@blindtrack.example`                                  | CLIENTE (só com `SEED_DADOS_EXEMPLO=true`) |

Todos usam a senha definida em `SEED_SENHA_INICIAL` no `.env`. Nenhuma senha fica no
repositório. O seed pode ser executado várias vezes: ele não duplica dados nem sobrescreve
senhas de usuários existentes.

> O Prisma 7 **não** regenera o client depois de `prisma migrate dev`. Por isso os scripts
> `db:migrate` e `db:deploy` já encadeiam `prisma generate`.

## Endpoints disponíveis

Todos sob `/api/v1`. Respostas de sucesso: `{ "data": ... }`. Listagens:
`{ "data": [...], "meta": { page, pageSize, total, totalPages } }`.

| Método e rota                                                                                                     | Perfis                                                          |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `POST /auth/login`                                                                                                | público (limite de tentativas falhas por IP)                    |
| `GET /auth/me`, `PATCH /auth/senha`                                                                               | qualquer usuário autenticado                                    |
| `POST/GET /usuarios`, `GET/PATCH /usuarios/:id`                                                                   | ADMIN                                                           |
| `POST /clientes`, `PATCH /clientes/:id`                                                                           | ADMIN, GESTOR, ATENDIMENTO (corrigir CPF/CNPJ: só ADMIN/GESTOR) |
| `GET /clientes`, `GET /clientes/:id`                                                                              | + TECNICO, que recebe dados reduzidos e documento mascarado     |
| `DELETE /clientes/:id` (inativação lógica)                                                                        | ADMIN, GESTOR                                                   |
| `POST /veiculos`, `PATCH /veiculos/:id`                                                                           | ADMIN, GESTOR, ATENDIMENTO                                      |
| `GET /veiculos`, `GET /veiculos/:id`                                                                              | + TECNICO                                                       |
| `POST /ordens-servico` (abre OS e gera as etapas)                                                                 | ADMIN, GESTOR, ATENDIMENTO                                      |
| `GET /ordens-servico` (`?status&clienteId&placa&numero&atrasada&entradaDe&entradaAte`), `GET /ordens-servico/:id` | internos                                                        |
| `PATCH /ordens-servico/:id` (observações)                                                                         | ADMIN, GESTOR, ATENDIMENTO                                      |
| `PATCH /ordens-servico/:id/status` (`SUSPENDER`/`RETOMAR`/`CANCELAR` + justificativa)                             | ADMIN, GESTOR                                                   |
| `PATCH /ordens-servico/:id/previsao` (replanejamento com justificativa)                                           | ADMIN, GESTOR                                                   |
| `GET /ordens-servico/:id/etapas`, `/historico`, `/linha-do-tempo`                                                 | internos                                                        |
| `PATCH /etapas/:id/status` (`INICIAR`, `PAUSAR`, `RETOMAR`, `CONCLUIR`, `DISPENSAR`, `REABRIR`)                   | ADMIN, GESTOR, TECNICO (só as próprias)                         |
| `PATCH /etapas/:id/responsavel`, `PATCH /etapas/:id/prazo`                                                        | ADMIN, GESTOR                                                   |
| `POST/GET /ordens-servico/:id/ocorrencias`, `PATCH /ocorrencias/:id`                                              | internos (alterar: gestão ou responsável)                       |
| `POST /ordens-servico/:id/documentos` (multipart, campo `arquivo`: PDF/PNG/JPEG até 10 MB)                        | internos                                                        |
| `GET /ordens-servico/:id/documentos`, `GET /documentos/:id/arquivo`                                               | internos                                                        |
| `PATCH /documentos/:id/status` (aprovar/rejeitar)                                                                 | ADMIN, GESTOR                                                   |
| `GET/POST /modelos-etapa`, `PATCH /modelos-etapa/:id`                                                             | ADMIN, GESTOR                                                   |
| `GET /cliente/minhas-ordens`, `GET /cliente/ordens/:id/acompanhar`, `GET /cliente/documentos/:id/arquivo`         | CLIENTE (só as próprias)                                        |

Exemplo rápido:

```bash
TOKEN=$(curl -s -X POST localhost:3000/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"atendimento@blindtrack.example","senha":"<SEED_SENHA_INICIAL>"}' | jq -r .data.token)
curl -s "localhost:3000/api/v1/clientes?nome=maria" -H "Authorization: Bearer $TOKEN" | jq
```

## Comandos Docker

| Comando                           | O que faz                                                                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker compose up -d`            | Cria e inicia o container do PostgreSQL em segundo plano. Na primeira vez também cria o volume, a rede e o banco de testes.                                                           |
| `docker compose ps`               | Lista os containers e o estado do healthcheck (`starting`, `healthy`, `unhealthy`).                                                                                                   |
| `docker compose logs -f postgres` | Acompanha os logs do PostgreSQL em tempo real (`Ctrl+C` sai).                                                                                                                         |
| `docker compose down`             | Para e remove o container e a rede. **O volume com os dados é mantido.**                                                                                                              |
| `docker compose down -v`          | Faz o mesmo e **apaga o volume nomeado `blindada_postgres_data`**. Todos os dados são perdidos, e na próxima subida o banco é recriado do zero, com o script de init rodando de novo. |

Use `down` no dia a dia. Use `down -v` só quando quiser zerar o banco de propósito.

## Scripts npm

| Script                                           | Descrição                                                              |
| ------------------------------------------------ | ---------------------------------------------------------------------- |
| `npm run dev`                                    | Sobe a API com nodemon + tsx                                           |
| `npm run build` / `npm start`                    | Compila para `dist/` e executa a versão compilada                      |
| `npm run typecheck`                              | Checagem de tipos sem gerar arquivos                                   |
| `npm run lint` / `npm run format`                | ESLint / Prettier                                                      |
| `npm test`                                       | Todos os testes (Vitest)                                               |
| `npm run test:unit` / `npm run test:integration` | Só unitários / só integração                                           |
| `npm run test:coverage`                          | Testes com relatório de cobertura (HTML em `coverage/index.html`)      |
| `npm run db:up` / `db:down` / `db:logs`          | Atalhos para o Docker Compose                                          |
| `npm run db:generate`                            | Gera o Prisma Client em `src/generated/prisma`                         |
| `npm run db:migrate`                             | Cria e aplica migrations em desenvolvimento                            |
| `npm run db:deploy`                              | Aplica migrations existentes (produção/CI)                             |
| `npm run db:seed`                                | Popula dados iniciais                                                  |
| `npm run db:studio`                              | Abre o Prisma Studio                                                   |
| `npm run docs:openapi`                           | Exporta a especificação OpenAPI para `docs/api/openapi.json`           |
| `npm run db:reset`                               | **Apaga** o banco de desenvolvimento e reaplica as migrations e o seed |

## Testes

Os testes usam `NODE_ENV=test`. Nesse modo o `src/config/env.ts` substitui `DATABASE_URL`
por `TEST_DATABASE_URL` (banco `blindtrack_test`), então os testes **nunca** tocam o banco
de desenvolvimento. Não há banco em memória: a integração roda contra o PostgreSQL real.

## Variáveis de ambiente

Todas estão documentadas em [`.env.example`](.env.example) e são validadas por Zod na
inicialização. Se faltar alguma ou houver valor inválido, a API não sobe e mostra o motivo.
O `.env` **nunca** deve ser versionado.

## Estrutura

Veja [arquitetura.md](arquitetura.md) e a pasta [docs/](docs/). Qualidade: [plano de testes](docs/qualidade/plano-de-testes.md) e [revisão de segurança](docs/qualidade/revisao-seguranca.md).

## Documentação da API

- **Swagger UI:** <http://localhost:3000/api/v1/docs>. Faça login em `POST /auth/login` e use **Authorize** com o token.
- **Especificação:** [`docs/api/openapi.json`](docs/api/openapi.json), gerada dos mesmos schemas Zod que validam as requisições (`npm run docs:openapi`). Importável no Postman/Insomnia.
