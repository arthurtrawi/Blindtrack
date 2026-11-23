# Diagramas de Sequência

Fluxos principais da API, como estão implementados. O fluxo genérico
"concluir etapa" está no [arquitetura.md §5](../../arquitetura.md).

Convenções: **R** = routes, **MW** = middlewares (`authenticate` → `authorize` →
`validate`), **C** = controller, **S** = service, **D** = domínio puro
(`services/domain`), **DB** = Prisma/PostgreSQL. Toda escrita com mais de uma tabela
acontece numa única `$transaction` (RN29).

## 1. Login e requisição autenticada

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant RL as rate-limit (login)
    participant V as validate (Zod)
    participant AS as auth.service
    participant DB as PostgreSQL
    participant MW as authenticate

    U->>RL: POST /auth/login {email, senha}
    RL->>V: dentro do limite de falhas por IP?
    V->>AS: email normalizado (trim, minúsculas)
    AS->>DB: busca usuário por e-mail
    AS->>AS: bcrypt.compare (com hash fictício se o e-mail não existe → tempo constante)
    alt inválido, inexistente ou inativo
        AS-->>U: 401 "E-mail ou senha inválidos" (mensagem única)
    else válido
        AS->>DB: UPDATE ultimo_login_em
        AS-->>U: 200 {token JWT HS256 (8 h), usuario}
    end

    U->>MW: GET /ordens-servico (Authorization: Bearer)
    MW->>MW: verifica assinatura, algoritmo, emissor, público, expiração
    MW->>DB: recarrega usuário (ativo? perfil atual? senha_alterada_em)
    alt inativo ou token anterior à troca de senha
        MW-->>U: 401
    else ok
        MW->>MW: req.user = usuário → segue para authorize(perfis)
    end
```

### 1.1 Variante do front-end: sessão por cookie HttpOnly (ADR-26)

```mermaid
sequenceDiagram
    autonumber
    participant F as Front-end (navegador)
    participant API as API /api/v1
    participant MW as authenticate

    F->>API: POST /auth/login (X-Requested-With: BlindTrack, credentials: include)
    API-->>F: 200 {tipo: "Cookie", usuario} + Set-Cookie bt_sessao (HttpOnly, SameSite=Strict, Path=/api)
    note over F: o JavaScript nunca vê o token
    F->>MW: GET /cliente/minhas-ordens (cookie enviado pelo navegador)
    MW-->>F: 200 (leitura: o cookie basta)
    F->>MW: PATCH /etapas/:id/status (cookie, SEM X-Requested-With)
    MW-->>F: 403 CSRF_BLOQUEADO
    F->>MW: PATCH /etapas/:id/status (cookie + X-Requested-With: BlindTrack)
    MW-->>F: segue para authorize → validate → controller
    F->>API: POST /auth/logout
    API-->>F: 204 + Set-Cookie bt_sessao expirado
```

## 2. Abrir ordem de serviço (UC05)

```mermaid
sequenceDiagram
    autonumber
    actor A as Atendimento
    participant C as ordem-servico.controller
    participant S as ordem-servico.service
    participant DB as PostgreSQL

    A->>C: POST /ordens-servico {clienteId, veiculoId, previsaoEntrega}
    C->>S: abrirOrdem(dados, contexto)
    S->>DB: veículo + cliente
    S->>S: RN01 veículo pertence ao cliente? previsão futura?
    S->>DB: existe OS não encerrada para o veículo? (RN03)
    S->>DB: modelos de etapa ativos (ENTREGA deve ser a última)
    rect rgb(235, 245, 255)
        note over S,DB: $transaction
        S->>DB: INSERT ordens_servico (numero = gerar_numero_os() via sequence)
        S->>DB: INSERT etapas_processo (cópia do modelo, RN04)
        S->>DB: INSERT historico_status (null → ABERTA)
        S->>DB: INSERT auditoria (CRIAR)
    end
    note over DB: índice único parcial também barra 2ª OS ativa em corrida (→ 409)
    S-->>C: OS com etapas e prazos calculados
    C-->>A: 201 Created + Location
```

## 3. Concluir a entrega (UC13, RN17)

```mermaid
sequenceDiagram
    autonumber
    actor T as Técnico responsável
    participant S as etapa.service
    participant D as etapa.state-machine
    participant O as ordem-servico.service
    participant DB as PostgreSQL

    T->>S: PATCH /etapas/:id/status {acao: CONCLUIR}
    rect rgb(235, 245, 255)
        note over S,DB: $transaction
        S->>DB: etapa + OS (encerrada? suspensa? → 422)
        S->>DB: etapas da OS, ocorrências impeditivas da etapa
        S->>D: validarTransicaoEtapa(CONCLUIR)
        D-->>S: ok (perfil, RN16, status, RN12)
        S->>DB: ocorrências abertas na OS; tipos de documento APROVADOS
        S->>D: pendenciasParaEntrega(...)
        alt há pendências
            D-->>S: ["Documentos obrigatórios sem aprovação: ..."]
            S-->>T: 422 RN17 + lista de pendências (rollback)
        else sem pendências
            S->>DB: UPDATE etapa SET CONCLUIDA, data_conclusao WHERE status = EM_ANDAMENTO
            note over S,DB: 0 linhas afetadas → 409 (alteração concorrente)
            S->>DB: INSERT historico_status + auditoria
            S->>O: sincronizarStatusOrdem()
            O->>DB: UPDATE OS SET ENTREGUE, data_entrega
            O->>DB: INSERT historico_status (→ ENTREGUE)
            S-->>T: 200 {etapa, statusOrdem: ENTREGUE}
        end
    end
```

## 4. Enviar documento (UC11)

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário interno
    participant M as multer (memória, ≤ 10 MB)
    participant V as validate (campos do formulário)
    participant S as documento.service
    participant ST as storage.service
    participant FS as Disco (UPLOAD_DIR)
    participant DB as PostgreSQL

    U->>M: POST /ordens-servico/:id/documentos (multipart: arquivo, nome, tipo)
    alt acima de 10 MB
        M-->>U: 413
    end
    M->>V: nome, tipo, visivelCliente
    V->>S: enviarDocumento(...)
    S->>DB: OS operável? (RN05)
    S->>ST: salvarArquivo(buffer)
    ST->>ST: assinatura binária é PDF/PNG/JPEG? (ignora extensão e MIME declarado)
    alt conteúdo não permitido
        ST-->>U: 422 ARQUIVO_INVALIDO (nada gravado)
    end
    ST->>FS: grava AAAA/MM/<uuid>.<ext> (modo 0600)
    ST-->>S: chave, mimeType, tamanho, sha256
    rect rgb(235, 245, 255)
        note over S,DB: $transaction
        S->>DB: INSERT documentos (PENDENTE)
        S->>DB: INSERT historico_status + auditoria
    end
    alt falha na transação
        S->>FS: remove o arquivo (compensação)
    end
    S-->>U: 201 documento
```

## 5. Portal: acompanhar OS (UC16)

```mermaid
sequenceDiagram
    autonumber
    actor CL as Cliente
    participant MW as authenticate + authorize(CLIENTE)
    participant P as portal.service
    participant DB as PostgreSQL

    CL->>MW: GET /cliente/ordens/:id/acompanhar
    MW->>P: req.user.clienteId
    P->>DB: OS WHERE id = :id AND cliente_id = clienteId do token
    alt não encontrada (inexistente OU de outro cliente)
        P-->>CL: 404 (mesma resposta nos dois casos, RN30)
    else encontrada
        P->>DB: etapas, ocorrências e documentos com visivel_cliente = true, histórico visível
        P->>P: monta resposta por LISTA BRANCA de campos (RN31)
        P->>P: linha do tempo com mensagens padronizadas (nunca a descrição interna)
        P-->>CL: 200 {status, previsão, etapas, ocorrências, documentos, linhaDoTempo}
    end
```
