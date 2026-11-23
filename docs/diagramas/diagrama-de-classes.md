# Diagrama de Classes (domínio)

Visão orientada a objetos das entidades persistidas e dos enums que controlam os estados.
Os métodos indicados são as operações de domínio que os services implementarão na
Fase 4. Não são métodos das entidades do Prisma, que são apenas dados.

```mermaid
classDiagram
    direction LR

    class Cliente {
        +UUID id
        +TipoPessoa tipoPessoa
        +String nome
        +String cpfCnpj
        +String email
        +String telefone
        +Endereco endereco
        +DateTime? deletedAt
        +inativar()
    }
    class Veiculo {
        +UUID id
        +String placa
        +String chassi
        +String marca
        +String modelo
        +int anoFabricacao
        +int anoModelo
        +String cor
        +transferirPara(Cliente)
    }
    class Usuario {
        +UUID id
        +String nome
        +String email
        -String senhaHash
        +PerfilUsuario perfil
        +bool ativo
        +desativar()
    }
    class ModeloEtapa {
        +UUID id
        +String codigo
        +String nome
        +int ordem
        +bool obrigatoria
        +bool ativo
    }
    class OrdemServico {
        +UUID id
        +String numero
        +StatusOrdemServico status
        +DateTime dataEntrada
        +DateTime previsaoEntrega
        +DateTime? dataEntrega
        +String? observacoes
        +abrir(Cliente, Veiculo, ModeloEtapa[])
        +suspender(justificativa)
        +retomar()
        +cancelar(justificativa)
        +replanejarEntrega(data, justificativa)
        +estaAtrasada() bool
        +estaEncerrada() bool
    }
    class EtapaProcesso {
        +UUID id
        +String codigo
        +String nome
        +int ordem
        +bool obrigatoria
        +StatusEtapa status
        +DateTime? dataInicio
        +DateTime? previsaoConclusao
        +DateTime? dataConclusao
        +iniciar(responsavel)
        +pausar(justificativa)
        +retomar()
        +concluir()
        +dispensar(justificativa)
        +reabrir(justificativa)
        +estaAtrasada() bool
    }
    class Ocorrencia {
        +UUID id
        +String titulo
        +String descricao
        +TipoOcorrencia tipo
        +PrioridadeOcorrencia prioridade
        +StatusOcorrencia status
        +bool impeditiva
        +bool visivelCliente
        +DateTime dataAbertura
        +DateTime? dataResolucao
        +iniciarTratamento()
        +resolver(solucao)
        +cancelar(motivo)
    }
    class Documento {
        +UUID id
        +String nome
        +TipoDocumento tipo
        +String caminhoArquivo
        +String hashSha256
        +StatusDocumento status
        +bool visivelCliente
        +aprovar(avaliador)
        +rejeitar(avaliador, motivo)
    }
    class HistoricoStatus {
        <<imutável>>
        +UUID id
        +TipoEventoHistorico tipoEvento
        +String? statusAnterior
        +String statusNovo
        +String descricao
        +bool visivelCliente
        +DateTime createdAt
    }
    class AlteracaoPrevisao {
        <<imutável>>
        +UUID id
        +DateTime? previsaoAnterior
        +DateTime previsaoNova
        +String justificativa
        +DateTime createdAt
    }
    class Auditoria {
        <<imutável>>
        +UUID id
        +String entidade
        +UUID entidadeId
        +AcaoAuditoria acao
        +Json? dadosAnteriores
        +Json? dadosNovos
        +DateTime createdAt
    }

    class PerfilUsuario {
        <<enumeration>>
        ADMIN
        GESTOR
        TECNICO
        ATENDIMENTO
        CLIENTE
    }
    class StatusOrdemServico {
        <<enumeration>>
        ABERTA
        EM_ANDAMENTO
        SUSPENSA
        PRONTA_PARA_ENTREGA
        ENTREGUE
        CANCELADA
    }
    class StatusEtapa {
        <<enumeration>>
        PENDENTE
        EM_ANDAMENTO
        PAUSADA
        CONCLUIDA
        DISPENSADA
    }
    class StatusOcorrencia {
        <<enumeration>>
        ABERTA
        EM_TRATAMENTO
        RESOLVIDA
        CANCELADA
    }
    class StatusDocumento {
        <<enumeration>>
        PENDENTE
        APROVADO
        REJEITADO
    }

    Cliente "1" --> "0..*" Veiculo : possui
    Cliente "1" --> "0..*" OrdemServico : solicita
    Cliente "1" -- "0..1" Usuario : acessoPortal
    Veiculo "1" --> "0..*" OrdemServico : recebe
    OrdemServico "1" *-- "1..*" EtapaProcesso : contém
    ModeloEtapa "1" ..> "0..*" EtapaProcesso : origina (cópia)
    Usuario "0..1" <-- "0..*" EtapaProcesso : responsável
    OrdemServico "1" *-- "0..*" Ocorrencia
    EtapaProcesso "0..1" <-- "0..*" Ocorrencia : afeta
    OrdemServico "1" *-- "0..*" Documento
    OrdemServico "1" *-- "0..*" HistoricoStatus
    OrdemServico "1" *-- "0..*" AlteracaoPrevisao
    Usuario "1" <-- "0..*" HistoricoStatus : autor
    Usuario "0..1" <-- "0..*" Auditoria : executa

    Usuario --> PerfilUsuario
    OrdemServico --> StatusOrdemServico
    EtapaProcesso --> StatusEtapa
    Ocorrencia --> StatusOcorrencia
    Documento --> StatusDocumento
```

**Composição (◆):** etapas, ocorrências, documentos, histórico e replanejamentos não existem
sem a OS. Mesmo assim, nada é excluído em cascata (`onDelete: Restrict`), porque a OS também
nunca é excluída.
