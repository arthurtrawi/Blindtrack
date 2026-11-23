# Documentação do BlindTrack

## Requisitos

| Documento                                                                     | Conteúdo                                                      |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [01-visao-geral.md](requisitos/01-visao-geral.md)                             | Problema, objetivo, escopo, atores, ciclo de vida             |
| [02-requisitos-funcionais.md](requisitos/02-requisitos-funcionais.md)         | RF01–RF43, com perfis e prioridade                            |
| [03-requisitos-nao-funcionais.md](requisitos/03-requisitos-nao-funcionais.md) | RNF01–RNF22: segurança, LGPD, integridade, desempenho, testes |
| [04-regras-de-negocio.md](requisitos/04-regras-de-negocio.md)                 | RN00–RN36 e as máquinas de estado da OS e da etapa            |

## Casos de uso

| Documento                                       | Conteúdo                                                                                           |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [casos-de-uso.md](casos-de-uso/casos-de-uso.md) | Diagrama de casos de uso e especificação dos principais (UC01, UC05, UC07, UC10, UC12, UC13, UC16) |

## Modelagem e diagramas

| Documento                                                        | Conteúdo                                                                                                |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [modelo-de-dados.md](modelagem/modelo-de-dados.md)               | Diagrama entidade-relacionamento, cardinalidades, decisões, regras garantidas pelo banco, índices, LGPD |
| [diagrama-de-classes.md](diagramas/diagrama-de-classes.md)       | Entidades, enums e operações de domínio                                                                 |
| [diagramas-de-sequencia.md](diagramas/diagramas-de-sequencia.md) | Login, abertura de OS, conclusão da entrega, upload de documento, portal                                |
| [../arquitetura.md](../arquitetura.md)                           | Diagrama de arquitetura, fluxo de requisição, decisões (ADRs), matriz de permissões                     |

Todos os diagramas usam **Mermaid** e são renderizados pelo GitHub, pelo GitLab e pelo VS Code (extensão de pré-visualização Mermaid).

## API

| Documento                            | Conteúdo                                                                    |
| ------------------------------------ | --------------------------------------------------------------------------- |
| [api/openapi.json](api/openapi.json) | Especificação OpenAPI 3.0 (42 operações), gerada com `npm run docs:openapi` |
| Swagger UI                           | `http://localhost:3000/api/v1/docs`, com a API em execução                  |

## Qualidade

| Documento                                              | Conteúdo                                                                                       |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| [plano-de-testes.md](qualidade/plano-de-testes.md)     | Estratégia, resultados, cobertura e rastreabilidade RN → teste                                 |
| [revisao-seguranca.md](qualidade/revisao-seguranca.md) | OWASP API Top 10, falhas encontradas e corrigidas, riscos aceitos                              |
| [evidencias/](evidencias/)                             | Saídas reais de testes, cobertura, auditoria de dependências e verificação de instalação limpa |
