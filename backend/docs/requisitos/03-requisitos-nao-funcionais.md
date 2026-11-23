# Requisitos Não Funcionais

| ID    | Categoria        | Requisito                                                                                                                                                                    |
| ----- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RNF01 | Tecnologia       | Node.js LTS 22.x ou 24.x, Express, TypeScript em modo `strict`, PostgreSQL 16, Prisma ORM.                                                                                   |
| RNF02 | Infraestrutura   | O banco é provisionado só via Docker Compose, com volume nomeado, healthcheck, política de reinício e rede própria.                                                          |
| RNF03 | Segurança        | Senhas com bcrypt (custo ≥ 12). JWT assinado com segredo de pelo menos 32 caracteres vindo do `.env`, com expiração configurável.                                            |
| RNF04 | Segurança        | A autorização (perfil e propriedade do recurso) é sempre verificada no backend.                                                                                              |
| RNF05 | Segurança        | Helmet, CORS com lista de origens configurável e limite de tentativas no login.                                                                                              |
| RNF06 | Segurança        | Todas as entradas (body, params, query) são validadas com Zod antes de chegar ao service.                                                                                    |
| RNF07 | Segurança        | Nenhum segredo é versionado. O `.env` fica no `.gitignore`; o `.env.example` só tem valores fictícios.                                                                       |
| RNF08 | LGPD             | Minimização: o portal do cliente expõe apenas dados do próprio titular. Logs mascaram CPF/CNPJ, senha, token e o cabeçalho `Authorization`.                                  |
| RNF09 | LGPD             | Dados pessoais não são apagados fisicamente enquanto houver obrigação de guarda. A inativação de cliente é lógica e a anonimização fica documentada como evolução.           |
| RNF10 | Integridade      | Histórico de status e auditoria são _append-only_: não há endpoint de alteração ou exclusão, e um trigger no PostgreSQL rejeita `UPDATE`/`DELETE` nessas tabelas.            |
| RNF11 | Integridade      | Operações com várias escritas (ex.: abrir OS + gerar etapas + histórico + auditoria) rodam numa única transação.                                                             |
| RNF12 | Integridade      | Concorrência: mudanças de status usam atualização condicional (`WHERE status = <esperado>`), evitando que duas requisições simultâneas avancem a mesma etapa.                |
| RNF13 | Datas            | Datas gravadas como `timestamptz` (UTC) e devolvidas em ISO-8601. A conversão para `America/Sao_Paulo` fica a cargo do cliente da API.                                       |
| RNF14 | Desempenho       | Listagens sempre paginadas (padrão 20, máximo 100). Índices nos campos de filtro. Meta: p95 < 500 ms com 10 mil OS em ambiente local.                                        |
| RNF15 | Observabilidade  | Logs estruturados com Pino, um `requestId` por requisição e nível configurável por ambiente.                                                                                 |
| RNF16 | Padronização     | Respostas de erro num formato único: `{ "error": { "code", "message", "details?" } }`, com status HTTP adequado.                                                             |
| RNF17 | Documentação     | Especificação OpenAPI 3 servida via Swagger UI em `/api/docs`.                                                                                                               |
| RNF18 | Testabilidade    | Testes unitários (services e regras) e de integração (Supertest + PostgreSQL real num banco de teste separado). Sem banco em memória. Meta: ≥ 70% de cobertura nos services. |
| RNF19 | Manutenibilidade | ESLint + Prettier, nomenclatura consistente em português no domínio, uso de `any` proibido pela configuração do lint.                                                        |
| RNF20 | Portabilidade    | A aplicação sobe com `docker compose up -d` + `npm install` + `npm run db:migrate` + `npm run dev`.                                                                          |
| RNF21 | Versionamento    | API versionada no prefixo `/api/v1`.                                                                                                                                         |
| RNF22 | Arquivos         | Upload limitado a 10 MB e aos tipos PDF/JPEG/PNG (verificados pelo conteúdo, não só pela extensão). Os arquivos ficam fora do diretório público e não são versionados.       |
