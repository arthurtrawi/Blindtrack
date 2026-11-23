# Plano de Testes

## 1. Objetivo

Verificar, de forma automatizada e repetível, que a API cumpre os requisitos funcionais, as
regras de negócio (RN), a segurança e a proteção de dados (LGPD) definidas em
[`docs/requisitos/`](../requisitos/).

## 2. Estratégia

| Nível               | Ferramenta         | O que cobre                                                                                                                | Banco                                  |
| ------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **Unitário**        | Vitest             | Funções puras: máquinas de estado, prazos, validadores (CPF/CNPJ, placa, senha), JWT, máscara de logs, tratamento de erros | Nenhum                                 |
| **Integração**      | Vitest + Supertest | Requisições HTTP reais contra o app Express: rotas, middlewares, services, transações                                      | PostgreSQL 16 real (`blindtrack_test`) |
| **Banco**           | Vitest + Prisma    | Restrições garantidas pelo PostgreSQL: CHECKs, índices parciais, sequence, triggers append-only                            | PostgreSQL 16 real                     |
| **Contrato**        | Vitest + Supertest | Cada operação do OpenAPI existe e responde 403 exatamente para os perfis não documentados                                  | PostgreSQL 16 real                     |
| **Manual (fumaça)** | curl               | Servidor real com os dados do seed; logs inspecionados para dados pessoais                                                 | Banco de desenvolvimento               |

### Decisões

- **Sem banco em memória e sem SQLite** (exigência do projeto e ADR-13). Só o PostgreSQL real exercita triggers, índices parciais, `timestamptz` e sequences.
- **Banco isolado:** com `NODE_ENV=test`, a aplicação usa `TEST_DATABASE_URL`. O `globalSetup` do Vitest aplica as migrations versionadas antes da suíte e recusa rodar se o banco de teste for o mesmo de desenvolvimento.
- **Limpeza:** cada arquivo esvazia as tabelas com `TRUNCATE` (que não dispara os triggers de linha). Os uploads de teste vão para `uploads-test/`, que é apagada ao fim da suíte.
- **Execução sequencial de arquivos** (`fileParallelism: false`), porque todos compartilham o mesmo banco.
- **Fábrica de dados** ([`tests/helpers/fabrica.ts`](../../tests/helpers/fabrica.ts)): cria usuários, clientes, veículos e o modelo de etapas direto pelo Prisma e gera tokens com o mesmo service da API.

## 3. Como executar

```bash
docker compose up -d          # PostgreSQL (o banco de teste é criado na 1ª subida)
npm test                      # toda a suíte
npm run test:unit             # só unitários (não precisam de banco)
npm run test:integration      # só integração
npm run test:coverage         # com cobertura (relatório HTML em coverage/index.html)
```

Sem o PostgreSQL disponível, os testes que dependem do banco são **marcados como ignorados**, e não como aprovados.

## 4. Resultados (execução de 2026-11-23)

| Métrica                                     | Resultado                                | Meta (RNF18) |
| ------------------------------------------- | ---------------------------------------- | ------------ |
| Testes                                      | **206 aprovados**, 1 ignorado¹, 0 falhas | —            |
| Arquivos de teste                           | 16 (6 unitários, 10 de integração)       | —            |
| Cobertura de linhas (total)                 | **94,07%**                               | —            |
| Cobertura de ramos (total)                  | **80,23%**                               | —            |
| Cobertura de linhas — `src/services`        | **91,05%**                               | ≥ 70% ✅     |
| Cobertura de linhas — `src/services/domain` | **98,00%**                               | —            |
| Tempo da suíte                              | ~40–50 s (VM com 3 vCPUs)                | —            |

¹ "GET /health retorna 503 com banco indisponível" só roda quando o banco está fora do ar.

| Arquivo                           | Testes | Foco                                                                                               |
| --------------------------------- | -----: | -------------------------------------------------------------------------------------------------- |
| `unit/dominio.test.ts`            |     20 | Máquinas de estado (etapa, OS, ocorrência), RN17, prazos                                           |
| `unit/documento.test.ts`          |     17 | CPF, CNPJ numérico e alfanumérico, máscara                                                         |
| `unit/validators.test.ts`         |     15 | Normalização e rejeição de entradas, mass assignment                                               |
| `unit/seguranca.test.ts`          |      8 | Rate limit, sanitização da auditoria, JWT (`alg: none`, segredo errado, expirado), máscara de logs |
| `unit/error-handler.test.ts`      |      7 | Tradução de erros; 500 sem vazar detalhes                                                          |
| `unit/app-error.test.ts`          |      3 | Hierarquia de erros                                                                                |
| `integration/openapi.test.ts`     |     44 | Documentação × rotas reais × perfis                                                                |
| `integration/fluxo-ordem.test.ts` |     16 | Ciclo de vida completo de uma OS                                                                   |
| `integration/operacao.test.ts`    |     16 | Prazos, suspensão, ocorrências, upload, modelo de etapas                                           |
| `integration/usuarios.test.ts`    |     12 | Gestão de usuários                                                                                 |
| `integration/banco.test.ts`       |     10 | Restrições do PostgreSQL                                                                           |
| `integration/clientes.test.ts`    |     10 | Clientes e LGPD                                                                                    |
| `integration/auth.test.ts`        |      9 | Login, `/me`, troca de senha, revogação de sessão                                                  |
| `integration/app.test.ts`         |      8 | Infraestrutura HTTP (404, Helmet, CORS, Swagger, health)                                           |
| `integration/portal.test.ts`      |      6 | Isolamento e lista branca do portal                                                                |
| `integration/veiculos.test.ts`    |      6 | Veículos, transferência de proprietário                                                            |

## 5. Rastreabilidade: regra de negócio → teste

| Regra            | Descrição resumida                            | Teste(s)                                                                                                                                      |
| ---------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| RN01             | Veículo pertence ao cliente da OS             | `fluxo-ordem`: "RN01: recusa abrir OS com veículo de outro cliente"                                                                           |
| RN02             | Número de OS único e gerado                   | `banco`: "gera número de OS único…"; `fluxo-ordem`: "abre a OS…"                                                                              |
| RN03             | Uma OS ativa por veículo                      | `banco` (índice parcial); `fluxo-ordem` (409); `operacao`: "cancelamento libera o veículo"                                                    |
| RN04             | Etapas copiadas do modelo                     | `fluxo-ordem`: "8 etapas copiadas"; `operacao`: "vale só para OS futuras"                                                                     |
| RN05             | OS encerrada não aceita alterações            | `fluxo-ordem`: "RN05: OS entregue não aceita…"; `dominio`                                                                                     |
| RN06             | Entregue só pela etapa ENTREGA                | `fluxo-ordem`: "OS vira ENTREGUE"; `banco` (CHECK)                                                                                            |
| RN07             | Suspender/cancelar com justificativa (gestão) | `operacao`: "Suspensão e cancelamento"                                                                                                        |
| RN08             | Status derivado das etapas                    | `dominio`: "deriva ABERTA, EM_ANDAMENTO…"; `fluxo-ordem`                                                                                      |
| RN09             | Sequência das etapas                          | `dominio`; `fluxo-ordem`: "RN09/RN10"                                                                                                         |
| RN10             | Etapa em andamento tem responsável            | `dominio`; `fluxo-ordem`; `banco` (CHECK)                                                                                                     |
| RN11             | Datas de início e conclusão                   | `fluxo-ordem`: "retomada preserva a data de início", "registrando a data de conclusão"                                                        |
| RN12             | Ocorrência impeditiva bloqueia conclusão      | `dominio`; `fluxo-ordem`: "RN12/RN23"                                                                                                         |
| RN13             | Só etapa dispensável é dispensada (gestão)    | `dominio`; `fluxo-ordem`; `operacao` (modelo)                                                                                                 |
| RN15             | Reabertura controlada                         | `dominio`; `fluxo-ordem`: "RN15: gestor reabre…"                                                                                              |
| RN16             | Técnico só altera as próprias etapas          | `dominio`; `fluxo-ordem`: "RN16"                                                                                                              |
| RN17             | Requisitos para a entrega                     | `dominio`: "Requisitos de entrega"; `fluxo-ordem`: "RN17", "documentos… liberam a entrega"                                                    |
| RN18, RN24, RN27 | Toda mudança gera histórico                   | `fluxo-ordem`: "histórico completo e imutável"; `operacao`: transições de ocorrência                                                          |
| RN19–RN22        | Regras de ocorrência                          | `dominio`; `operacao`: "Ocorrências"                                                                                                          |
| RN23, RN26       | Replanejamento com justificativa              | `fluxo-ordem`; `operacao`: "Prazos"                                                                                                           |
| RN27a–d          | Cálculo de atrasos                            | `dominio`: "Prazos"; `operacao`: "identifica OS atrasada…", "etapa atrasada"                                                                  |
| RN28             | Histórico/auditoria imutáveis                 | `banco`: "torna o histórico imutável", "auditoria imutável"                                                                                   |
| RN29             | Atomicidade (alteração + histórico)           | Coberto indiretamente: as escritas são feitas numa única `$transaction` e o teste de upload inválido confirma que nada é gravado (`operacao`) |
| RN30–RN32        | Portal do cliente                             | `portal`: isolamento (404), lista branca, nenhuma escrita (403)                                                                               |
| RN33, RN34       | Documentos e identificação de veículos        | `documento`, `validators`, `clientes`, `veiculos`, `banco`                                                                                    |
| RN36             | Inativação lógica controlada                  | `clientes`: "não inativa cliente com OS…", "inativa cliente (soft delete)…"; `usuarios`                                                       |

## 6. Limitações conhecidas

- **Concorrência real** (duas requisições simultâneas na mesma etapa) é protegida por atualização condicional (ADR-10), mas não há teste de carga que force a corrida.
- **Desempenho** (RNF14, p95 < 500 ms com 10 mil OS) não foi medido. Seria preciso um teste de carga com massa de dados.
- **Frontend:** não há interface; os testes cobrem só a API.
