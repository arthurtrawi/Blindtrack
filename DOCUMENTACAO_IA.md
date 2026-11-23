# Documentação do Uso de IA

> Documento vivo, atualizado ao fim de cada fase. As seções marcadas _(a preencher pelo
> desenvolvedor)_ precisam ser escritas por quem fez a validação humana.

## 1. Ferramentas utilizadas

| Ferramenta                     | Modelo          | Uso                                            |
| ------------------------------ | --------------- | ---------------------------------------------- |
| Claude Code (extensão VS Code) | Claude Opus 5.5 | Planejamento, geração de código e documentação |

## 2. Prompts utilizados

| Fase | Prompt                                                                                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | "Prompt Mestre — Desenvolvimento de um Sistema de Gestão e Rastreabilidade de Blindagem Automotiva" (texto integral mantido pelo desenvolvedor no repositório/relatório). |

## 3. Etapas com auxílio da IA

| Fase                                                                 | Data       | Entregas geradas com IA                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Planejamento                                                     | 2026-11-23 | `docs/requisitos/01..04`, `arquitetura.md`, este arquivo                                                                                                                                                                                                                                                                                        |
| 4b — Backend: OS, etapas, histórico, ocorrências, documentos, portal | 2026-11-23 | `services/domain/*` (máquinas de estado de OS, etapa e ocorrência; prazos); services, controllers, rotas e schemas de OS, etapas, ocorrências, documentos, modelo de etapas e portal; `historico.service`, `storage.service`, middleware de upload; 4 novos arquivos de teste                                                                   |
| 4a — Backend: auth, usuários, clientes, veículos                     | 2026-11-23 | middlewares `authenticate`/`authorize`/`validate`/`rate-limit`; services, controllers, rotas e schemas Zod dos 4 módulos; `auditoria.service`; utilitários de CPF/CNPJ (inclui CNPJ alfanumérico), placa/chassi e paginação; migration `cnpj_alfanumerico`; 7 novos arquivos de teste                                                           |
| 3 — Modelagem                                                        | 2026-11-23 | `prisma/schema.prisma` (11 modelos, 11 enums), migrations `init` (com SQL manual: sequence, índices parciais, CHECKs, triggers) e `erro_imutabilidade`, `prisma/seed.ts`, `tests/setup/global-setup.ts`, `tests/helpers/db.ts`, `tests/integration/banco.test.ts`, `docs/modelagem/modelo-de-dados.md`, `docs/diagramas/diagrama-de-classes.md` |
| 2 — Infraestrutura                                                   | 2026-11-23 | `package.json`, `tsconfig*.json`, `docker-compose.yml`, script de init do banco de testes, `.env.example`, `.gitignore`, `prisma.config.ts`, `prisma/schema.prisma` (só gerador/datasource), `src/config/*`, middlewares de log/erro/404, rota `/health`, `app.ts`, `server.ts`, ESLint/Prettier/Vitest, testes iniciais, `README.md`           |

## 4. Modificações realizadas pelo desenvolvedor

_(a preencher pelo desenvolvedor: o que foi alterado, removido ou acrescentado em relação ao que a IA gerou)_

## 5. Validação humana

_(a preencher pelo desenvolvedor: como cada entrega foi revisada, por exemplo leitura crítica das regras de negócio, execução das migrations, execução dos testes, testes manuais no Swagger)_

## 6. Limitações observadas

- Fase 1: nenhuma migration nem teste executado.
- Fase 2 (executado pela IA em 2026-11-23, Node v26.12.1, **sem Docker instalado**): `npm install`, `prisma generate`, `tsc --noEmit`, `eslint`, `vitest run` (10 testes aprovados, 1 pulado por exigir banco), `npm run build` e subida do servidor compilado sem banco disponível (5 tentativas de conexão e saída com log fatal, como esperado).
- **Não validado pela IA**: conexão real com o PostgreSQL do Docker, o teste `/health` → 200 e o script de criação do banco de testes. Depende da instalação do Docker pelo desenvolvedor.
- Fase 3 (executado pela IA em 2026-11-23, PostgreSQL 16.16 no Docker): `prisma migrate dev` aplicou as 2 migrations no banco de desenvolvimento, e o globalSetup aplicou as mesmas no banco de testes. O seed rodou duas vezes (a segunda confirmou a idempotência). As 12 regras do SQL manual foram testadas provocando violações via `psql`, e todas foram rejeitadas. `prisma migrate diff` não acusou divergência. `vitest run`: 20 testes aprovados e 1 pulado (o caso "banco indisponível").
- Correção durante a Fase 3: o primeiro trigger usava SQLSTATE `23001`, que o Prisma reporta como "Foreign key constraint violated" (P2003). Isso foi detectado pelos testes e corrigido numa **nova** migration (`P0001`), sem editar a migration já aplicada. O Prisma 7 bloqueou o `migrate reset` pedido pela IA sem consentimento explícito do usuário, e a abordagem com nova migration evitou apagar o banco.
- Fase 4a (executado pela IA em 2026-11-23): `tsc --noEmit` e `eslint` sem erros. `vitest run`: **93 testes aprovados** e 1 pulado (caso "banco indisponível"). São 41 unitários e 52 de integração com Supertest contra o PostgreSQL real; a contagem por arquivo foi conferida para garantir que nenhum teste de integração foi pulado. Teste manual com o servidor rodando e os usuários do seed: login, listagens, máscara de CPF para TECNICO, 403 em `/usuarios` para ATENDIMENTO, e o log não contém senha nem CPF.
- Durante a Fase 4a, a IA identificou que o CHECK de CPF/CNPJ criado na Fase 3 rejeitaria o **CNPJ alfanumérico**, obrigatório desde jul/2026. Foi corrigido com uma nova migration e com o validador. **Recomenda-se validação humana** do algoritmo contra a documentação oficial da Receita Federal.
- Também na Fase 4a, a IA precisou corrigir um erro de tipos (query tipada nos handlers do Express) que só apareceu no typecheck. A solução foi o helper `queryValidada`.
- **Pendente (Fase 5):** documentação Swagger/OpenAPI dos novos endpoints. Hoje `/api/v1/docs` só descreve `/health`.
- Falhas intermitentes observadas na Fase 4a: em algumas execuções, testes de integração estouraram o timeout (5 s por teste, 10 s por hook). A IA investigou e descartou locks no PostgreSQL (`pg_stat_activity` sem esperas de lock). A causa foi falta de recursos da VM: load average de 15–17 em 3 vCPUs, memória quase esgotada com swap ativo e um processo `glycin-svg` do GNOME travado consumindo ~77% de CPU. Os timeouts foram elevados para 30 s/60 s em `vitest.config.ts`. Nessas mesmas condições, a suíte completa passou (93 aprovados, 235 s).
- Fase 4b (executado pela IA em 2026-11-23): `tsc --noEmit` e `eslint` sem erros. `vitest run`: **151 testes aprovados** e 1 pulado, em 41 s, com a VM já reiniciada e sem sobrecarga. O teste `fluxo-ordem.test.ts` percorre via HTTP o ciclo completo de uma OS: abertura, sequência de etapas, ocorrência impeditiva, dispensa, reabertura, documentos, aprovação, entrega e bloqueio pós-entrega. Teste manual com o servidor e os dados do seed: filtro de atrasadas, etapa atrasada, portal do cliente e 404 para OS de outro cliente.
- Defeitos encontrados pelos testes da Fase 4b e corrigidos: (1) a validação do modelo de etapas passava `''` como UUID e gerava erro 500; (2) `diasAtraso` arredondava para cima (2 dias e alguns ms viravam 3), e foi redefinido como dias completos com mínimo 1 (RN27d); (3) o seed gravava o evento de abertura com a data real, fora da ordem cronológica. Os dados de exemplo já gravados no banco de desenvolvimento mantêm essa ordem antiga, porque o histórico é imutável.
- **Pendente (Fase 5):** Swagger/OpenAPI de todos os endpoints. Hoje `/api/v1/docs` só descreve `/health`.
