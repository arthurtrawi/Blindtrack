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

| Fase               | Data       | Entregas geradas com IA                                                                                                                                                                                                                                                                                                               |
| ------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Planejamento   | 2026-11-23 | `docs/requisitos/01..04`, `arquitetura.md`, este arquivo                                                                                                                                                                                                                                                                              |
| 2 — Infraestrutura | 2026-11-23 | `package.json`, `tsconfig*.json`, `docker-compose.yml`, script de init do banco de testes, `.env.example`, `.gitignore`, `prisma.config.ts`, `prisma/schema.prisma` (só gerador/datasource), `src/config/*`, middlewares de log/erro/404, rota `/health`, `app.ts`, `server.ts`, ESLint/Prettier/Vitest, testes iniciais, `README.md` |

## 4. Modificações realizadas pelo desenvolvedor

_(a preencher pelo desenvolvedor: o que foi alterado, removido ou acrescentado em relação ao que a IA gerou)_

## 5. Validação humana

_(a preencher pelo desenvolvedor: como cada entrega foi revisada, por exemplo leitura crítica das regras de negócio, execução das migrations, execução dos testes, testes manuais no Swagger)_

## 6. Limitações observadas

- Fase 1: nenhuma migration nem teste executado.
- Fase 2 (executado pela IA em 2026-11-23, Node v26.12.1, **sem Docker instalado**): `npm install`, `prisma generate`, `tsc --noEmit`, `eslint`, `vitest run` (10 testes aprovados, 1 pulado por exigir banco), `npm run build` e subida do servidor compilado sem banco disponível (5 tentativas de conexão e saída com log fatal, como esperado).
- **Não validado pela IA**: conexão real com o PostgreSQL do Docker, o teste `/health` → 200 e o script de criação do banco de testes. Depende da instalação do Docker pelo desenvolvedor.
