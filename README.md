# BlindTrack — Gestão e Rastreabilidade de Blindagem Automotiva

## Apresentação

O **BlindTrack** é uma API REST para empresas de blindagem automotiva acompanharem cada
veículo desde a entrada na oficina até a entrega ao cliente. A API cuida de:

- ordens de serviço;
- etapas de produção e seus responsáveis;
- prazos;
- ocorrências e documentos;
- histórico imutável de tudo o que acontece;
- portal de consulta para o cliente.

> O sistema é **administrativo e de rastreabilidade**. Ele não toma decisões técnicas de
> engenharia, certificação, inspeção ou conformidade legal: só registra as decisões humanas
> (quem aprovou, quando e o quê).

Projeto acadêmico, desenvolvido em 6 fases com auxílio de IA. Veja [DOCUMENTACAO_IA.md](DOCUMENTACAO_IA.md).

## Objetivo

Substituir planilhas, papel e grupos de mensagens por um registro único e confiável do
processo de blindagem, que permita:

- **controlar** as ordens de serviço e a sequência das etapas (recepção → desmontagem → manta
  → vidros → remontagem → vistoria → inspeção final → entrega);
- **rastrear** quem fez o quê e quando, com histórico que não pode ser alterado nem apagado;
- **identificar atrasos** de etapas e entregas automaticamente, separando prazo planejado e real;
- **registrar ocorrências** (falta de peça, retrabalho, pendência documental) e seu impacto no prazo;
- **exigir a documentação obrigatória** aprovada antes da entrega;
- **dar transparência ao cliente**, que acompanha só as próprias ordens e só o que foi autorizado.

## Tecnologias

| Camada       | Tecnologia                                                       |
| ------------ | ---------------------------------------------------------------- |
| Runtime      | Node.js ≥ 22.13 (LTS 22/24; testado também no 26)                |
| HTTP         | Express 5                                                        |
| Linguagem    | TypeScript 5.9 (`strict`, ESM / `NodeNext`)                      |
| Banco        | PostgreSQL 16 via Docker Compose                                 |
| ORM          | Prisma 7.10 + `@prisma/adapter-pg`                               |
| Validação    | Zod 4                                                            |
| Segurança    | JWT, bcrypt, Helmet, CORS, express-rate-limit                    |
| Upload       | multer                                                           |
| Logs         | Pino / pino-http (com máscara de dados pessoais)                 |
| Documentação | Swagger UI (OpenAPI 3) em `/api/v1/docs`, gerado dos schemas Zod |
| Testes       | Vitest + Supertest, contra PostgreSQL real                       |

Justificativas de cada escolha em [arquitetura.md](arquitetura.md).

## Pré-requisitos

- **Node.js 22.13+** e npm (recomendado: Node 24 LTS; veja `.nvmrc`).
- **Docker Engine** com o plugin **Docker Compose v2**.
- **Git**.
- Opcional: `jq` para formatar respostas JSON nos exemplos com `curl`.

<details>
<summary>Instalação do Docker e do Git no Ubuntu</summary>

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2 git
sudo systemctl enable --now docker        # inicia agora e em todo boot
sudo usermod -aG docker "$USER"           # docker sem sudo (vale no próximo login)
newgrp docker                             # aplica o grupo no terminal atual

docker run --rm hello-world && docker compose version && git --version
```

> Pertencer ao grupo `docker` equivale, na prática, a ter acesso de root. Faça isso só na
> sua máquina de desenvolvimento.

</details>

## Instalação

```bash
# 1. Obter o código
git clone <url-do-repositorio> Blindada-veiculo
cd Blindada-veiculo

# 2. Variáveis de ambiente (veja "Configuração" abaixo)
cp .env.example .env
openssl rand -base64 48        # cole a saída em JWT_SECRET no .env
#   e troque também POSTGRES_PASSWORD (nas 3 linhas em que aparece) e SEED_SENHA_INICIAL

# 3. Dependências (o postinstall gera o Prisma Client)
npm ci

# 4. Banco de dados
docker compose up -d
docker compose ps              # aguarde STATUS "healthy"

# 5. Estrutura do banco e dados iniciais
npm run db:deploy              # aplica as migrations versionadas
npm run db:seed                # etapas padrão, usuários e (opcional) dados de exemplo
```

> **Instalação limpa:** use `npm ci`. Ele instala exatamente as versões do `package-lock.json`.
> Os scripts de instalação permitidos (bcrypt, Prisma, esbuild) estão listados em
> `allowScripts` no `package.json`.

## Execução

```bash
npm run dev                    # desenvolvimento: recarrega ao salvar
# ou
npm run build && npm start     # versão compilada (dist/)
```

Validação rápida:

```bash
curl -i http://localhost:3000/api/v1/health
# 200 {"status":"ok","database":"up",...}          → API e banco OK
# 503 {"status":"degraded","database":"down",...}  → banco inacessível
```

- **Swagger UI:** <http://localhost:3000/api/v1/docs>. Faça login em `POST /auth/login` e use **Authorize** com o token.
- **Especificação OpenAPI:** [`docs/api/openapi.json`](docs/api/openapi.json), importável no Postman ou no Insomnia.

Exemplo com `curl`:

```bash
TOKEN=$(curl -s -X POST localhost:3000/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"atendimento@blindtrack.example","senha":"<SEED_SENHA_INICIAL>"}' | jq -r .data.token)
curl -s "localhost:3000/api/v1/ordens-servico?atrasada=true" -H "Authorization: Bearer $TOKEN" | jq
```

### Usuários criados pelo seed

| E-mail                                                        | Perfil                                     |
| ------------------------------------------------------------- | ------------------------------------------ |
| `admin@blindtrack.example`                                    | ADMIN                                      |
| `gestor@blindtrack.example`                                   | GESTOR                                     |
| `tecnico1@blindtrack.example` / `tecnico2@blindtrack.example` | TECNICO                                    |
| `atendimento@blindtrack.example`                              | ATENDIMENTO                                |
| `cliente@blindtrack.example`                                  | CLIENTE (só com `SEED_DADOS_EXEMPLO=true`) |

Todos usam a senha de `SEED_SENHA_INICIAL`. Nenhuma senha fica no repositório. O seed pode
ser executado várias vezes: não duplica dados nem sobrescreve senhas existentes.

## Configuração

Todas as variáveis ficam no `.env` (modelo: [`.env.example`](.env.example)). Elas são
**validadas com Zod na inicialização**: se faltar alguma ou houver valor inválido, a API não
sobe e mostra o motivo. O `.env` **nunca** deve ser versionado (já está no `.gitignore`).

| Variável                                           | Padrão                  | Descrição                                                               |
| -------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------- |
| `NODE_ENV`                                         | `development`           | `development` (logs legíveis), `production` (logs JSON) ou `test`       |
| `PORT`                                             | `3000`                  | Porta HTTP da API                                                       |
| `LOG_LEVEL`                                        | `info`                  | `fatal`, `error`, `warn`, `info`, `debug`, `trace` ou `silent`          |
| `CORS_ORIGINS`                                     | (vazio)                 | Origens permitidas, separadas por vírgula                               |
| `JWT_SECRET`                                       | **obrigatória**         | Segredo do JWT, com no mínimo 32 caracteres (`openssl rand -base64 48`) |
| `JWT_EXPIRES_IN`                                   | `8h`                    | Validade do token (`<número><s\|m\|h\|d>`)                              |
| `BCRYPT_SALT_ROUNDS`                               | `12`                    | Custo do hash de senha (10 a 15)                                        |
| `LOGIN_RATE_LIMIT_MAX` / `_WINDOW_MINUTES`         | `10` / `15`             | Tentativas de login falhas por IP na janela                             |
| `UPLOAD_DIR` / `UPLOAD_MAX_SIZE_MB`                | `./uploads` / `10`      | Pasta dos documentos enviados (fora do git) e tamanho máximo            |
| `POSTGRES_USER` / `_PASSWORD` / `_DB` / `_TEST_DB` | —                       | Credenciais e bancos criados pelo Docker Compose                        |
| `POSTGRES_PORT`                                    | `5433`                  | Porta publicada no host (só em `127.0.0.1`)                             |
| `DATABASE_URL` / `TEST_DATABASE_URL`               | **obrigatória** / —     | Conexão do Prisma: banco de desenvolvimento e banco de testes           |
| `SEED_SENHA_INICIAL`                               | **obrigatória p/ seed** | Senha inicial dos usuários do seed (mínimo 12 caracteres)               |
| `SEED_DADOS_EXEMPLO`                               | `false`                 | `true` cria clientes, veículos e OS fictícios (ignorado em produção)    |

> **Porta 5433:** o PostgreSQL do container é publicado em `127.0.0.1:5433` para não
> conflitar com um PostgreSQL nativo na 5432. `DATABASE_URL` e `TEST_DATABASE_URL` precisam
> usar a mesma porta de `POSTGRES_PORT`, e a mesma senha de `POSTGRES_PASSWORD`.

## Comandos principais

### Docker

| Comando                           | O que faz                                                                                                                              |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `docker compose up -d`            | Cria e inicia o PostgreSQL em segundo plano. Na primeira vez também cria o volume, a rede e o banco de testes.                         |
| `docker compose ps`               | Lista os containers e o estado do healthcheck (`starting`, `healthy`, `unhealthy`).                                                    |
| `docker compose logs -f postgres` | Acompanha os logs do PostgreSQL (`Ctrl+C` sai).                                                                                        |
| `docker compose down`             | Para e remove o container e a rede. **O volume com os dados é mantido.**                                                               |
| `docker compose down -v`          | Faz o mesmo e **apaga o volume `blindada_postgres_data`**: todos os dados são perdidos e o banco é recriado do zero na próxima subida. |

Use `down` no dia a dia. Use `down -v` só quando quiser zerar o banco de propósito.

### npm

| Script                                           | Descrição                                                              |
| ------------------------------------------------ | ---------------------------------------------------------------------- |
| `npm run dev`                                    | API com nodemon + tsx (recarrega ao salvar)                            |
| `npm run build` / `npm start`                    | Compila para `dist/` / executa a versão compilada                      |
| `npm test`                                       | Todos os testes                                                        |
| `npm run test:unit` / `npm run test:integration` | Só unitários (sem banco) / só integração                               |
| `npm run test:coverage`                          | Testes com cobertura (HTML em `coverage/index.html`)                   |
| `npm run typecheck` / `lint` / `format`          | Tipos / ESLint / Prettier                                              |
| `npm run db:deploy`                              | Aplica as migrations existentes e gera o Prisma Client                 |
| `npm run db:migrate -- --name <nome>`            | Desenvolvimento: cria e aplica uma nova migration a partir do schema   |
| `npm run db:seed`                                | Popula os dados iniciais                                               |
| `npm run db:studio`                              | Abre o Prisma Studio                                                   |
| `npm run db:reset`                               | **Apaga** o banco de desenvolvimento e reaplica as migrations e o seed |
| `npm run docs:openapi`                           | Exporta a especificação OpenAPI para `docs/api/openapi.json`           |

## Testes

```bash
npm test                       # 206 testes; os de integração precisam do PostgreSQL no ar
```

- Com `NODE_ENV=test`, a API usa `TEST_DATABASE_URL` (banco `blindtrack_test`): os testes
  **nunca** tocam o banco de desenvolvimento.
- Não há banco em memória: a integração roda contra o PostgreSQL real, e as migrations são
  aplicadas automaticamente antes da suíte.
- Sem banco disponível, os testes de integração são **marcados como ignorados**, não aprovados.

Resultados, cobertura e rastreabilidade das regras: [docs/qualidade/plano-de-testes.md](docs/qualidade/plano-de-testes.md).

## Endpoints

Todos sob `/api/v1`. Sucesso: `{ "data": ... }`. Listagens: `{ "data": [...], "meta": { page, pageSize, total, totalPages } }`.
Erro: `{ "error": { "code", "message", "details?", "requestId" } }`. Em regras de negócio
(422), `code` traz a regra violada (ex.: `RN09`).

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

## Documentação

| Documento                                | Conteúdo                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| [arquitetura.md](arquitetura.md)         | Visão geral, padrões, decisões (ADRs), fluxo de requisição, permissões          |
| [docs/](docs/README.md)                  | Índice completo: requisitos, casos de uso, modelagem, diagramas, API, qualidade |
| [DOCUMENTACAO_IA.md](DOCUMENTACAO_IA.md) | Uso de IA no projeto e validação humana                                         |
