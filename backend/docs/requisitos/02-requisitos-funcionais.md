# Requisitos Funcionais

Legenda de prioridade: **M** = obrigatório (MVP), **D** = desejável.

## Autenticação e usuários

| ID   | Requisito                                                                              | Perfis | Prior. |
| ---- | -------------------------------------------------------------------------------------- | ------ | ------ |
| RF01 | Autenticar com e-mail e senha e receber um token JWT de acesso.                        | Todos  | M      |
| RF02 | Consultar os dados do próprio usuário autenticado (`GET /auth/me`).                    | Todos  | M      |
| RF03 | Cadastrar usuários internos e usuários de cliente (vinculados a um `Cliente`).         | ADMIN  | M      |
| RF04 | Listar, consultar e editar usuários, inclusive ativar/desativar (sem exclusão física). | ADMIN  | M      |
| RF05 | Alterar a própria senha informando a senha atual.                                      | Todos  | D      |

## Clientes

| ID   | Requisito                                                                                          | Perfis                     | Prior. |
| ---- | -------------------------------------------------------------------------------------------------- | -------------------------- | ------ |
| RF06 | Cadastrar cliente pessoa física (CPF) ou jurídica (CNPJ), com validação dos dígitos verificadores. | ADMIN, GESTOR, ATENDIMENTO | M      |
| RF07 | Listar clientes com paginação e filtros (nome, documento, e-mail).                                 | ADMIN, GESTOR, ATENDIMENTO | M      |
| RF08 | Consultar e editar um cliente.                                                                     | ADMIN, GESTOR, ATENDIMENTO | M      |
| RF09 | Inativar cliente (exclusão lógica), bloqueada se houver OS não encerrada.                          | ADMIN, GESTOR              | M      |

## Veículos

| ID   | Requisito                                                                          | Perfis                              | Prior. |
| ---- | ---------------------------------------------------------------------------------- | ----------------------------------- | ------ |
| RF10 | Cadastrar veículo vinculado a um cliente (placa, chassi, marca, modelo, ano, cor). | ADMIN, GESTOR, ATENDIMENTO          | M      |
| RF11 | Listar veículos com paginação e filtros (placa, chassi, cliente).                  | ADMIN, GESTOR, ATENDIMENTO, TECNICO | M      |
| RF12 | Consultar e editar veículo; a troca de proprietário só é permitida sem OS ativa.   | ADMIN, GESTOR, ATENDIMENTO          | M      |

## Ordens de serviço

| ID   | Requisito                                                                                                                                                   | Perfis                     | Prior. |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------ |
| RF13 | Abrir OS informando cliente, veículo, previsão de entrega e observações. O sistema gera o número único e cria as etapas a partir do modelo de etapas ativo. | ADMIN, GESTOR, ATENDIMENTO | M      |
| RF14 | Listar OS com paginação e filtros: status, cliente, placa, período de entrada, somente atrasadas.                                                           | Internos                   | M      |
| RF15 | Consultar uma OS com cliente, veículo, etapas, indicadores de atraso e contadores de ocorrências/documentos.                                                | Internos                   | M      |
| RF16 | Editar dados não operacionais da OS (observações). Alterar a previsão de entrega exige justificativa (RF22).                                                | ADMIN, GESTOR, ATENDIMENTO | M      |
| RF17 | Alterar o status da OS de forma manual (suspender, retomar, cancelar) com justificativa.                                                                    | ADMIN, GESTOR              | M      |

## Etapas do processo

| ID   | Requisito                                                                                                                               | Perfis                  | Prior. |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------ |
| RF18 | Listar as etapas de uma OS na ordem configurada.                                                                                        | Internos                | M      |
| RF19 | Alterar o status de uma etapa (iniciar, pausar, retomar, concluir, dispensar, reabrir), respeitando a máquina de estados e a sequência. | ADMIN, GESTOR, TECNICO* | M      |
| RF20 | Atribuir ou trocar o responsável técnico de uma etapa.                                                                                  | ADMIN, GESTOR           | M      |
| RF21 | Definir ou alterar a previsão de conclusão de uma etapa, com justificativa.                                                             | ADMIN, GESTOR           | M      |
| RF22 | Registrar todo replanejamento de prazo (OS ou etapa) com valor anterior, novo valor, justificativa e usuário.                           | Sistema                 | M      |
| RF23 | Manter o modelo configurável de etapas (nome, ordem, obrigatória/dispensável, ativa). Alterações valem só para novas OS.                | ADMIN, GESTOR           | M      |

\* TECNICO só altera etapas em que ele é o responsável.

## Histórico, linha do tempo e auditoria

| ID   | Requisito                                                                                                             | Perfis   | Prior. |
| ---- | --------------------------------------------------------------------------------------------------------------------- | -------- | ------ |
| RF24 | Registrar automaticamente no histórico toda mudança de status de OS, etapa e ocorrência.                              | Sistema  | M      |
| RF25 | Consultar o histórico completo de uma OS.                                                                             | Internos | M      |
| RF26 | Consultar a linha do tempo consolidada (histórico + ocorrências + documentos + replanejamentos) em ordem cronológica. | Internos | M      |
| RF27 | Registrar auditoria (dados anteriores × novos) das operações de escrita relevantes.                                   | Sistema  | M      |
| RF28 | Consultar a trilha de auditoria por entidade.                                                                         | ADMIN    | D      |

## Ocorrências

| ID   | Requisito                                                                                                                                 | Perfis                     | Prior. |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------ |
| RF29 | Abrir ocorrência em uma OS (e opcionalmente em uma etapa) com título, descrição, tipo, prioridade, responsável e indicação de impeditiva. | Internos                   | M      |
| RF30 | Listar ocorrências de uma OS com filtros (status, tipo, prioridade).                                                                      | Internos                   | M      |
| RF31 | Atualizar, colocar em tratamento, resolver ou cancelar uma ocorrência.                                                                    | ADMIN, GESTOR, responsável | M      |
| RF32 | Permitir que a abertura de uma ocorrência informe uma nova previsão de entrega, aplicada como replanejamento (RF22).                      | ADMIN, GESTOR              | M      |
| RF33 | Marcar a ocorrência como visível ao cliente, com texto próprio para o cliente.                                                            | ADMIN, GESTOR, ATENDIMENTO | M      |

## Documentos

| ID   | Requisito                                                            | Perfis                       | Prior. |
| ---- | -------------------------------------------------------------------- | ---------------------------- | ------ |
| RF34 | Enviar documento (PDF/JPEG/PNG) para uma OS, informando tipo e nome. | Internos                     | M      |
| RF35 | Listar documentos de uma OS.                                         | Internos                     | M      |
| RF36 | Baixar o arquivo de um documento.                                    | Internos; CLIENTE se visível | M      |
| RF37 | Aprovar ou rejeitar um documento (decisão humana registrada).        | ADMIN, GESTOR                | M      |

## Portal do cliente

| ID   | Requisito                                                                                                                              | Perfis  | Prior. |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ |
| RF38 | Listar as próprias OS.                                                                                                                 | CLIENTE | M      |
| RF39 | Acompanhar uma OS própria: status, etapas (nome, status, datas), previsão de entrega, ocorrências e documentos marcados como visíveis. | CLIENTE | M      |

## Prazos e indicadores

| ID   | Requisito                                                                                            | Perfis        | Prior. |
| ---- | ---------------------------------------------------------------------------------------------------- | ------------- | ------ |
| RF40 | Identificar etapas atrasadas: não concluídas com previsão vencida, ou concluídas depois da previsão. | Sistema       | M      |
| RF41 | Identificar OS com previsão de entrega vencida.                                                      | Sistema       | M      |
| RF42 | Exibir, por OS e por etapa, prazo planejado, prazo real e desvio em dias.                            | Internos      | M      |
| RF43 | Painel resumido: OS por status, atrasadas, ocorrências abertas por prioridade.                       | ADMIN, GESTOR | D      |
