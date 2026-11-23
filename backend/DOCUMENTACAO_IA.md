# Documentação do Uso de Inteligência Artificial

Este documento registra como a IA foi usada no desenvolvimento do BlindTrack: o que ela
produziu, o que verificou, onde errou e o que depende de validação humana.

> As seções **4** e **5** precisam ser completadas pelo desenvolvedor. A IA registrou ali
> apenas fatos que observou durante o trabalho. Ela não pode atestar a revisão humana em
> nome de ninguém.

## 1. Ferramentas utilizadas

| Ferramenta                        | Versão / modelo | Uso                                                                                                 |
| --------------------------------- | --------------- | --------------------------------------------------------------------------------------------------- |
| Claude Code (extensão do VS Code) | Claude Opus 5.5 | Planejamento, geração de código, testes, execução de comandos no terminal, depuração e documentação |

A IA trabalhou diretamente no ambiente do desenvolvedor: criou e editou arquivos, executou
comandos (npm, Prisma, Docker, psql, curl, git em modo leitura) e leu as saídas reais. Os
commits foram feitos pelo desenvolvedor.

## 2. Prompts utilizados

| Fase               | Prompt do desenvolvedor (resumo fiel)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 — Planejamento   | **Prompt mestre**: "Desenvolvimento de um Sistema de Gestão e Rastreabilidade de Blindagem Automotiva". Define papel (arquiteto/tech lead), contexto, stack obrigatória (Node 22/24, Express, TypeScript, PostgreSQL 16 em Docker, Prisma, Zod, JWT, bcrypt, Helmet, CORS, Pino, Swagger, Jest/Vitest, Supertest), monólito modular, estrutura de pastas, entidades, regras de negócio, segurança/LGPD, endpoints, testes, documentação acadêmica e execução em 6 fases, com planejamento antes da implementação. O texto integral fica com o desenvolvedor. |
| 2 — Infraestrutura | Aprovação das decisões da Fase 1 e respostas às suposições: nome `Blindada-veiculo`; prefixo `/api/v1`; documentos obrigatórios (contrato, checklist de vistoria, declaração de blindagem, termo de entrega, aprovados por GESTOR/ADMIN); só `TROCA_VIDROS` dispensável; JWT único de 8 h; manter o Node v26 instalado, garantindo compatibilidade com o 24 LTS; pedido dos comandos de instalação do Docker e do Git.                                                                                                                                       |
| 2 (cont.)          | "Fiz o que pediu. Poderia verificar para que possamos dar seguimento" (validação do ambiente).                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 3, 4a, 4b, 5, 6    | Aprovação para iniciar cada fase ("sim, aprovado, pode iniciar") e, após interrupções, "pode continuar de onde parou".                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Front-end — Fase 1 | **Prompt mestre do front-end** "Front-end do sistema Blindada-veiculo": React + TypeScript + Vite + Tailwind, portal do cliente e painel administrativo, design system, execução em 6 fases com aprovação entre elas.                                                                                                                                                                                                                                                                                                                                        |
| Fase 4c (backend)  | Decisões sobre o planejamento do front: D1 cookie HttpOnly, "fazer os ajustes necessários"; D2 "pode fazer as alterações necessárias" (contratos P1, P2, P5, P7, P8); D3 estados reais de etapa; D4 pasta `~/blindada-frontend`.                                                                                                                                                                                                                                                                                                                             |

## 3. Etapas com auxílio da IA

| Fase                      | Commit                  | Entregas geradas com IA                                                                                                                                                                                                                                                                                       |
| ------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Planejamento          | (incluído no `5fea060`) | `docs/requisitos/01..04` (visão, 43 RF, 22 RNF, 36 RN, máquinas de estado), `arquitetura.md` (versão inicial, 14 ADRs), este arquivo                                                                                                                                                                          |
| 2 — Infraestrutura        | `5fea060`               | `package.json`, `tsconfig*.json`, `docker-compose.yml`, script de criação do banco de testes, `.env.example`, `.gitignore`, `prisma.config.ts`, `src/config/*`, middlewares de log/erro/404, rota `/health`, `app.ts`, `server.ts`, ESLint/Prettier/Vitest, testes iniciais, `README.md`                      |
| 3 — Modelagem             | `c26772b`               | `prisma/schema.prisma` (11 modelos, 11 enums), migrations `init` (com SQL manual: sequence, índices parciais, CHECKs, triggers) e `erro_imutabilidade`, `prisma/seed.ts`, infraestrutura de testes com banco real, `docs/modelagem/modelo-de-dados.md`, `docs/diagramas/diagrama-de-classes.md`               |
| 4a — Cadastros            | `c26772b`               | Autenticação (JWT, bcrypt, rate limit), usuários, clientes, veículos; middlewares `authenticate`/`authorize`/`validate`; auditoria; validação de CPF/CNPJ (inclui alfanumérico); migration `cnpj_alfanumerico`                                                                                                |
| 4b — Operação             | `4e45d4e`               | Máquinas de estado (OS, etapa, ocorrência) e prazos em `services/domain`; OS, etapas, histórico, linha do tempo, ocorrências, documentos (upload com verificação de conteúdo), modelo de etapas, portal do cliente                                                                                            |
| 5 — Qualidade             | `d3be0fa`               | OpenAPI gerado dos schemas Zod (42 operações) e teste de contrato; máscara de dados pessoais nos logs; revogação de sessão na troca de senha (migration `revogacao_token_senha`); override da dependência `effect`; testes de tratamento de erros; `docs/qualidade/`                                          |
| 6 — Documentação final    | (pendente)              | README reestruturado; `arquitetura.md` revisado contra o código; `docs/casos-de-uso/casos-de-uso.md`; `docs/diagramas/diagramas-de-sequencia.md`; `docs/README.md`; `docs/evidencias/`; `kanban-prints/README.md`; este documento consolidado                                                                 |
| 4c — API para o front-end | (pendente)              | Sessão por cookie HttpOnly com proteção CSRF e `POST /auth/logout`; `GET /dashboard/indicadores` (P1/RF43); listagem de OS com etapa atual, responsável, busca por cliente e ordenação (P2); descrição da etapa no portal (P5); `GET /usuarios/responsaveis` (P7); testes `sessao-cookie` e `apoio-front-end` |

## 4. Modificações e decisões do desenvolvedor

### 4.1 Registradas pela IA (fatos observados)

- **Decisões de requisito** tomadas pelo desenvolvedor na Fase 2: nome do projeto, prefixo da API, lista de documentos obrigatórios para a entrega, etapa dispensável, política de token e manutenção do Node 26.
- **Instalação e configuração do ambiente:** Docker, Docker Compose e Git, com os comandos fornecidos pela IA. O container do banco foi colocado no ar e o repositório local foi criado.
- **Porta do PostgreSQL alterada para 5433** no `docker-compose.yml`, `.env` e `.env.example`, para não conflitar com um PostgreSQL nativo na porta 5432 (alteração feita fora da IA, durante a Fase 2).
- **Commits** de cada fase (`5fea060`, `c26772b`, `4e45d4e`, `d3be0fa`).
- **Interrupções** de ações em andamento em alguns momentos, seguidas de pedidos de continuidade.
- **Reinicializações da VM**, inclusive com aumento de memória (de 4,4 GB para 5,5 GB) durante o projeto.

### 4.2 A completar pelo desenvolvedor

_(Descreva o que você alterou, removeu ou acrescentou no código ou nos documentos gerados
pela IA, e por quê. Se nada foi alterado, registre isso explicitamente.)_

## 5. Validação humana

_(A completar pelo desenvolvedor. Descreva como cada entrega foi revisada.)_

Checklist sugerido:

- [ ] Li as regras de negócio (`docs/requisitos/04-regras-de-negocio.md`) e confirmei que refletem o processo real de blindagem.
- [ ] Conferi o algoritmo do **CNPJ alfanumérico** contra a documentação oficial da Receita Federal (IN RFB 2.229/2024).
- [ ] Executei `npm test` na minha máquina e obtive o mesmo resultado das evidências.
- [ ] Subi a API, fiz login no Swagger e executei o fluxo de uma OS (abertura → etapas → documentos → entrega).
- [ ] Acessei o portal com o usuário `cliente@blindtrack.example` e confirmei que não vê dados internos.
- [ ] Revisei o SQL manual das migrations (`prisma/migrations/*/migration.sql`).
- [ ] Li a revisão de segurança e concordo com os riscos aceitos.
- [ ] Revisei os diagramas e confirmei que correspondem ao comportamento observado.

## 6. Verificações automáticas executadas pela IA

Todas foram executadas de verdade, com a saída lida pela IA. Nenhum resultado foi presumido.

| Fase | Verificação                                                                          | Resultado                                                                                                             |
| ---- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| 2    | `npm install`, `tsc`, `eslint`, `vitest`, build, servidor sem banco                  | 10 testes aprovados; servidor tenta 5 vezes conectar e encerra com log `fatal`                                        |
| 2    | Após a instalação do Docker: banco de teste criado, `/health` 200, commit sem `.env` | OK                                                                                                                    |
| 3    | 12 regras do SQL manual violadas de propósito via `psql`                             | Todas rejeitadas pelo banco                                                                                           |
| 3    | Seed executado 2 vezes; `prisma migrate diff`                                        | Idempotente; sem divergência                                                                                          |
| 4a   | Suíte + teste manual com o servidor e os usuários do seed                            | 93 testes; log sem senha nem CPF (nas rotas testadas)                                                                 |
| 4b   | Suíte + teste manual (atrasadas, portal, 404 entre clientes)                         | 151 testes                                                                                                            |
| 5    | Suíte com cobertura; `npm audit --omit=dev`; medição de logs com o servidor real     | 206 testes; 94,07% das linhas; 0 vulnerabilidades em produção                                                         |
| 6    | **Instalação limpa** em pasta nova (só arquivos versionáveis + `npm ci`)             | typecheck, lint, build, migrations OK; suíte 3 de 3 vezes com 206 aprovados. Ver [docs/evidencias/](docs/evidencias/) |
| 4c   | Suíte completa com cobertura                                                         | 228 testes aprovados (1 ignorado); 94,28% das linhas; services 92,56%; OpenAPI com 45 operações                       |

## 7. Erros da IA e como foram corrigidos

Registrados para transparência: a validação humana deve levar em conta que a IA erra.

| Fase    | Erro                                                                                                                                                                             | Como foi detectado                                      | Correção                                                                                                                                               |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 3       | Trigger com SQLSTATE `23001`, que o Prisma reporta como "Foreign key constraint violated"                                                                                        | Testes de integração                                    | Nova migration (`P0001`), sem editar a migration já aplicada. O Prisma 7 bloqueou o `migrate reset` sem consentimento do usuário, e a IA não insistiu. |
| 3       | CHECK de CPF/CNPJ só numérico, quando o CNPJ alfanumérico já estava em vigor                                                                                                     | Revisão da própria IA na Fase 4a                        | Migration `cnpj_alfanumerico` e novo validador                                                                                                         |
| 4a      | Handlers do Express com query tipada (erro de tipos)                                                                                                                             | `tsc --noEmit`                                          | Helper `queryValidada`                                                                                                                                 |
| 4a      | Timeouts intermitentes atribuídos inicialmente a locks no banco                                                                                                                  | Investigação com `pg_stat_activity`                     | Causa real: VM sobrecarregada (processo do GNOME travado, swap). Timeouts dos testes ajustados.                                                        |
| 4b      | UUID vazio (`''`) na validação do modelo de etapas → erro 500                                                                                                                    | Testes de integração                                    | Parâmetro opcional                                                                                                                                     |
| 4b      | `diasAtraso` arredondado para cima (2 dias e alguns ms viravam 3)                                                                                                                | Testes de integração                                    | Dias completos, mínimo 1 (RN27d)                                                                                                                       |
| 4b      | Seed gravava o evento de abertura fora da ordem cronológica                                                                                                                      | Teste manual da linha do tempo                          | Seed corrigido. Os dados antigos do banco de desenvolvimento permanecem, porque o histórico é imutável.                                                |
| 5       | **CPF e e-mail gravados nos logs** pela query string (defeito de segurança introduzido nas fases anteriores)                                                                     | Revisão de segurança + medição com o servidor real      | Máscara no serializador de logs                                                                                                                        |
| 5       | Sessão sobrevivia à troca de senha                                                                                                                                               | Revisão de segurança                                    | Revogação por `senha_alterada_em`                                                                                                                      |
| 5       | Diagnóstico errado: "logs sendo perdidos"                                                                                                                                        | Repetição isolada do teste                              | Era um servidor anterior ainda ativo na mesma porta                                                                                                    |
| 5       | Script `db:migrate` repassava `--name` ao comando errado e travava numa pergunta interativa                                                                                      | Processo parado por 5 minutos                           | `generate` movido para os hooks `postdb:*`                                                                                                             |
| 6       | `arquitetura.md` com 12 afirmações desatualizadas, entre elas uma **permissão para consultar auditoria que nunca foi implementada**                                              | Revisão contra o código                                 | Documento reescrito; seção de requisitos não implementados                                                                                             |
| Front 1 | O planejamento do front revelou uma lacuna do backend: só o ADMIN listava usuários, mas o GESTOR atribui responsáveis às etapas e não tinha como escolher o técnico              | Conferência dos contratos de API durante o planejamento | `GET /usuarios/responsaveis` (P7)                                                                                                                      |
| 6       | Verificação de instalação limpa feita em `/tmp` (tmpfs, em RAM) numa VM sem swap, o que causou pressão de memória, 1 falha não identificada e um processo encerrado pelo sistema | Erro "Invalid cross-device link" revelou o tmpfs        | Refeita em disco: 3 de 3 rodadas aprovadas                                                                                                             |

## 8. Limitações

- **Requisitos não implementados:** RF28 (consulta da auditoria), desejável (o RF43, painel de indicadores, foi implementado na Fase 4c). Também não há teste de carga para a meta de desempenho (RNF14). Detalhes no [arquitetura.md §10](arquitetura.md).
- **Diagramas Mermaid:** foram escritos à mão e revisados, mas a IA não os renderizou neste ambiente (sem navegador). Confira a visualização no GitHub ou no VS Code.
- **Kanban:** as capturas em `kanban-prints/` dependem do desenvolvedor.
- **Dados de exemplo:** os registros do banco de desenvolvimento criados antes da correção do seed mantêm o evento de abertura fora de ordem. Um banco novo (`docker compose down -v` + migrations + seed) não tem esse problema.
