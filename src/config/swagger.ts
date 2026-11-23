/**
 * Documento OpenAPI 3.0 da API.
 *
 * Os corpos e as queries são gerados dos MESMOS schemas Zod usados na validação
 * (`z.toJSONSchema`, modo "input"). Assim, documentação e validação não divergem.
 * Cada operação declara só o que o schema não sabe: resumo, perfis, exemplo e respostas.
 *
 * Exportado para arquivo com: npm run docs:openapi → docs/api/openapi.json
 */
import { z, type ZodType } from 'zod';
import type { PerfilUsuario } from '../generated/prisma/client.js';
import { alterarSenhaSchema, loginSchema } from '../validators/auth.schema.js';
import {
  atualizarClienteSchema,
  criarClienteSchema,
  listarClientesSchema,
} from '../validators/cliente.schema.js';
import { paginacaoSchema } from '../validators/comum.schema.js';
import { avaliarDocumentoSchema, enviarDocumentoSchema } from '../validators/documento.schema.js';
import {
  alterarPrazoEtapaSchema,
  alterarStatusEtapaSchema,
  atribuirResponsavelSchema,
} from '../validators/etapa.schema.js';
import { atualizarModeloEtapaSchema, criarModeloEtapaSchema } from '../validators/modelo-etapa.schema.js';
import {
  abrirOcorrenciaSchema,
  atualizarOcorrenciaSchema,
  listarOcorrenciasSchema,
} from '../validators/ocorrencia.schema.js';
import {
  abrirOrdemSchema,
  alterarPrevisaoOrdemSchema,
  alterarStatusOrdemSchema,
  atualizarOrdemSchema,
  listarOrdensSchema,
} from '../validators/ordem-servico.schema.js';
import {
  atualizarUsuarioSchema,
  criarUsuarioSchema,
  listarUsuariosSchema,
} from '../validators/usuario.schema.js';
import {
  atualizarVeiculoSchema,
  criarVeiculoSchema,
  listarVeiculosSchema,
} from '../validators/veiculo.schema.js';

type JsonSchema = Record<string, unknown>;
type Metodo = 'get' | 'post' | 'patch' | 'delete';
type Retorno = 'objeto' | 'lista' | 'paginado' | 'vazio' | 'arquivo';

export interface Operacao {
  metodo: Metodo;
  /** Caminho relativo a /api/v1, no formato OpenAPI (ex.: /clientes/{id}). */
  caminho: string;
  tag: string;
  resumo: string;
  descricao?: string;
  /** 'PUBLICO' = sem autenticação; [] = qualquer usuário autenticado. */
  perfis: PerfilUsuario[] | 'PUBLICO';
  query?: ZodType;
  corpo?: ZodType;
  /** Corpo multipart/form-data (campos de texto + arquivo "arquivo"). */
  multipart?: ZodType;
  exemplo?: unknown;
  sucesso: { status: number; retorno: Retorno; descricao: string };
  /** Status de erro de negócio relevantes além dos padrões. */
  erros?: number[];
}

const INTERNOS: PerfilUsuario[] = ['ADMIN', 'GESTOR', 'TECNICO', 'ATENDIMENTO'];
const CADASTRO: PerfilUsuario[] = ['ADMIN', 'GESTOR', 'ATENDIMENTO'];
const GESTAO: PerfilUsuario[] = ['ADMIN', 'GESTOR'];
const DATA = '2026-12-20T18:00:00-03:00';

/** Todas as operações da API v1 (fonte única para o Swagger e para o teste de cobertura da doc). */
export const OPERACOES: Operacao[] = [
  // Infraestrutura
  {
    metodo: 'get',
    caminho: '/health',
    tag: 'Infraestrutura',
    perfis: 'PUBLICO',
    resumo: 'Disponibilidade da API e do banco',
    sucesso: {
      status: 200,
      retorno: 'objeto',
      descricao: 'API e banco disponíveis (503 se o banco estiver fora)',
    },
  },
  // Autenticação
  {
    metodo: 'post',
    caminho: '/auth/login',
    tag: 'Autenticação',
    perfis: 'PUBLICO',
    corpo: loginSchema,
    resumo: 'Login com e-mail e senha',
    descricao: 'Retorna um JWT (Bearer) válido por 8 h. Tentativas falhas são limitadas por IP (429).',
    exemplo: { email: 'gestor@blindtrack.example', senha: 'sua-senha' },
    sucesso: { status: 200, retorno: 'objeto', descricao: 'Token e dados do usuário' },
    erros: [429],
  },
  {
    metodo: 'get',
    caminho: '/auth/me',
    tag: 'Autenticação',
    perfis: [],
    resumo: 'Usuário autenticado',
    sucesso: { status: 200, retorno: 'objeto', descricao: 'Dados do usuário do token' },
  },
  {
    metodo: 'patch',
    caminho: '/auth/senha',
    tag: 'Autenticação',
    perfis: [],
    corpo: alterarSenhaSchema,
    resumo: 'Alterar a própria senha',
    exemplo: { senhaAtual: 'senha-atual', novaSenha: 'NovaSenhaForte2026' },
    sucesso: { status: 204, retorno: 'vazio', descricao: 'Senha alterada' },
    erros: [422],
  },
  // Usuários
  {
    metodo: 'post',
    caminho: '/usuarios',
    tag: 'Usuários',
    perfis: ['ADMIN'],
    corpo: criarUsuarioSchema,
    resumo: 'Criar usuário interno ou de portal',
    descricao: 'Perfil CLIENTE exige clienteId (um usuário por cliente).',
    exemplo: {
      nome: 'Carlos Técnico',
      email: 'carlos@empresa.example',
      senha: 'SenhaForte2026',
      perfil: 'TECNICO',
    },
    sucesso: { status: 201, retorno: 'objeto', descricao: 'Usuário criado (sem hash de senha)' },
    erros: [409],
  },
  {
    metodo: 'get',
    caminho: '/usuarios',
    tag: 'Usuários',
    perfis: ['ADMIN'],
    query: listarUsuariosSchema,
    resumo: 'Listar usuários',
    sucesso: { status: 200, retorno: 'paginado', descricao: 'Página de usuários' },
  },
  {
    metodo: 'get',
    caminho: '/usuarios/{id}',
    tag: 'Usuários',
    perfis: ['ADMIN'],
    resumo: 'Consultar usuário',
    sucesso: { status: 200, retorno: 'objeto', descricao: 'Usuário' },
  },
  {
    metodo: 'patch',
    caminho: '/usuarios/{id}',
    tag: 'Usuários',
    perfis: ['ADMIN'],
    corpo: atualizarUsuarioSchema,
    resumo: 'Atualizar, desativar ou redefinir senha',
    descricao: 'Não desativa a si mesmo nem quem tem etapas em curso ou ocorrências abertas.',
    exemplo: { ativo: false },
    sucesso: { status: 200, retorno: 'objeto', descricao: 'Usuário atualizado' },
    erros: [409, 422],
  },
  // Clientes
  {
    metodo: 'post',
    caminho: '/clientes',
    tag: 'Clientes',
    perfis: CADASTRO,
    corpo: criarClienteSchema,
    resumo: 'Cadastrar cliente',
    descricao: 'CPF ou CNPJ (numérico ou alfanumérico) com dígitos verificadores válidos.',
    exemplo: {
      tipoPessoa: 'FISICA',
      nome: 'Maria da Silva',
      cpfCnpj: '529.982.247-25',
      email: 'maria@exemplo.example',
      telefone: '(11) 99999-0000',
      cidade: 'São Paulo',
      uf: 'SP',
    },
    sucesso: { status: 201, retorno: 'objeto', descricao: 'Cliente cadastrado' },
    erros: [409],
  },
  {
    metodo: 'get',
    caminho: '/clientes',
    tag: 'Clientes',
    perfis: INTERNOS,
    query: listarClientesSchema,
    resumo: 'Listar clientes',
    descricao: 'TECNICO recebe dados reduzidos e documento mascarado (LGPD).',
    sucesso: { status: 200, retorno: 'paginado', descricao: 'Página de clientes' },
  },
  {
    metodo: 'get',
    caminho: '/clientes/{id}',
    tag: 'Clientes',
    perfis: INTERNOS,
    resumo: 'Consultar cliente e seus veículos',
    sucesso: { status: 200, retorno: 'objeto', descricao: 'Cliente' },
  },
  {
    metodo: 'patch',
    caminho: '/clientes/{id}',
    tag: 'Clientes',
    perfis: CADASTRO,
    corpo: atualizarClienteSchema,
    resumo: 'Atualizar cliente',
    descricao: 'Corrigir CPF/CNPJ: só ADMIN/GESTOR. Endereço aceita null para remover.',
    exemplo: { telefone: '11988887777' },
    sucesso: { status: 200, retorno: 'objeto', descricao: 'Cliente atualizado' },
    erros: [409, 422],
  },
  {
    metodo: 'delete',
    caminho: '/clientes/{id}',
    tag: 'Clientes',
    perfis: GESTAO,
    resumo: 'Inativar cliente (exclusão lógica)',
    descricao: 'Bloqueado se houver OS não encerrada (RN36).',
    sucesso: { status: 204, retorno: 'vazio', descricao: 'Cliente inativado' },
    erros: [422],
  },
  // Veículos
  {
    metodo: 'post',
    caminho: '/veiculos',
    tag: 'Veículos',
    perfis: CADASTRO,
    corpo: criarVeiculoSchema,
    resumo: 'Cadastrar veículo',
    exemplo: {
      placa: 'BRA-2E19',
      chassi: '9BWZZZ377VT004251',
      marca: 'Toyota',
      modelo: 'Corolla Cross',
      anoFabricacao: 2025,
      anoModelo: 2026,
      cor: 'Preto',
      clienteId: '01a206c8-1cc1-759a-8e13-ca9a3d8f8864',
    },
    sucesso: { status: 201, retorno: 'objeto', descricao: 'Veículo cadastrado' },
    erros: [409, 422],
  },
  {
    metodo: 'get',
    caminho: '/veiculos',
    tag: 'Veículos',
    perfis: INTERNOS,
    query: listarVeiculosSchema,
    resumo: 'Listar veículos',
    sucesso: { status: 200, retorno: 'paginado', descricao: 'Página de veículos' },
  },
  {
    metodo: 'get',
    caminho: '/veiculos/{id}',
    tag: 'Veículos',
    perfis: INTERNOS,
    resumo: 'Consultar veículo',
    sucesso: { status: 200, retorno: 'objeto', descricao: 'Veículo' },
  },
  {
    metodo: 'patch',
    caminho: '/veiculos/{id}',
    tag: 'Veículos',
    perfis: CADASTRO,
    corpo: atualizarVeiculoSchema,
    resumo: 'Atualizar veículo',
    descricao: 'Troca de proprietário só sem OS ativa (RF12).',
    exemplo: { cor: 'Prata' },
    sucesso: { status: 200, retorno: 'objeto', descricao: 'Veículo atualizado' },
    erros: [409, 422],
  },
  // Ordens de serviço
  {
    metodo: 'post',
    caminho: '/ordens-servico',
    tag: 'Ordens de serviço',
    perfis: CADASTRO,
    corpo: abrirOrdemSchema,
    resumo: 'Abrir OS',
    descricao: 'Gera número único e copia as etapas do modelo ativo. Uma OS ativa por veículo.',
    exemplo: {
      clienteId: '01a206c8-1cc1-759a-8e13-ca9a3d8f8864',
      veiculoId: '01a206c8-1cd9-735f-975f-f70d541a3c16',
      previsaoEntrega: DATA,
      observacoes: 'Cliente solicitou nível III-A',
    },
    sucesso: { status: 201, retorno: 'objeto', descricao: 'OS aberta com etapas' },
    erros: [409, 422],
  },
  {
    metodo: 'get',
    caminho: '/ordens-servico',
    tag: 'Ordens de serviço',
    perfis: INTERNOS,
    query: listarOrdensSchema,
    resumo: 'Listar OS',
    descricao: 'Use atrasada=true para OS com previsão vencida (calculado na consulta).',
    sucesso: { status: 200, retorno: 'paginado', descricao: 'Página de OS com indicador de prazo' },
  },
  {
    metodo: 'get',
    caminho: '/ordens-servico/{id}',
    tag: 'Ordens de serviço',
    perfis: INTERNOS,
    resumo: 'Consultar OS com etapas e prazos',
    sucesso: { status: 200, retorno: 'objeto', descricao: 'OS' },
  },
  {
    metodo: 'patch',
    caminho: '/ordens-servico/{id}',
    tag: 'Ordens de serviço',
    perfis: CADASTRO,
    corpo: atualizarOrdemSchema,
    resumo: 'Atualizar observações',
    exemplo: { observacoes: 'Cliente buscará às 14h' },
    sucesso: { status: 200, retorno: 'objeto', descricao: 'OS atualizada' },
  },
  {
    metodo: 'patch',
    caminho: '/ordens-servico/{id}/status',
    tag: 'Ordens de serviço',
    perfis: GESTAO,
    corpo: alterarStatusOrdemSchema,
    resumo: 'Suspender, retomar ou cancelar',
    descricao: 'Demais status são derivados das etapas.',
    exemplo: { acao: 'SUSPENDER', justificativa: 'Aguardando pagamento da entrada' },
    sucesso: { status: 200, retorno: 'objeto', descricao: 'OS com novo status' },
    erros: [409, 422],
  },
  {
    metodo: 'patch',
    caminho: '/ordens-servico/{id}/previsao',
    tag: 'Ordens de serviço',
    perfis: GESTAO,
    corpo: alterarPrevisaoOrdemSchema,
    resumo: 'Replanejar entrega',
    exemplo: { previsaoEntrega: DATA, justificativa: 'Cliente solicitou acessório extra' },
    sucesso: { status: 200, retorno: 'objeto', descricao: 'OS com nova previsão' },
    erros: [422],
  },
  // Etapas
  {
    metodo: 'get',
    caminho: '/ordens-servico/{id}/etapas',
    tag: 'Etapas',
    perfis: INTERNOS,
    resumo: 'Etapas da OS, em ordem',
    sucesso: { status: 200, retorno: 'lista', descricao: 'Etapas com indicador de prazo' },
  },
  {
    metodo: 'patch',
    caminho: '/etapas/{id}/status',
    tag: 'Etapas',
    perfis: ['ADMIN', 'GESTOR', 'TECNICO'],
    corpo: alterarStatusEtapaSchema,
    resumo: 'Iniciar, pausar, retomar, concluir, dispensar ou reabrir',
    descricao:
      'Respeita a sequência (RN09), exige responsável (RN10) e bloqueia por ocorrência impeditiva (RN12). Concluir ENTREGA exige documentos aprovados (RN17). TECNICO só nas próprias etapas.',
    exemplo: { acao: 'PAUSAR', justificativa: 'Aguardando peça' },
    sucesso: { status: 200, retorno: 'objeto', descricao: 'Etapa atualizada e status da OS' },
    erros: [409, 422],
  },
  {
    metodo: 'patch',
    caminho: '/etapas/{id}/responsavel',
    tag: 'Etapas',
    perfis: GESTAO,
    corpo: atribuirResponsavelSchema,
    resumo: 'Atribuir responsável técnico',
    exemplo: { responsavelId: '01a206c8-1c88-7150-bdb6-dd889c41492f' },
    sucesso: { status: 200, retorno: 'objeto', descricao: 'Etapa atualizada' },
    erros: [422],
  },
  {
    metodo: 'patch',
    caminho: '/etapas/{id}/prazo',
    tag: 'Etapas',
    perfis: GESTAO,
    corpo: alterarPrazoEtapaSchema,
    resumo: 'Definir ou replanejar previsão da etapa',
    descricao: 'Replanejamento exige justificativa (RN26).',
    exemplo: { previsaoConclusao: DATA, justificativa: 'Fornecedor atrasou a manta' },
    sucesso: { status: 200, retorno: 'objeto', descricao: 'Etapa atualizada' },
    erros: [422],
  },
  // Histórico
  {
    metodo: 'get',
    caminho: '/ordens-servico/{id}/historico',
    tag: 'Histórico',
    perfis: INTERNOS,
    resumo: 'Histórico imutável de status',
    sucesso: { status: 200, retorno: 'lista', descricao: 'Eventos em ordem cronológica' },
  },
  {
    metodo: 'get',
    caminho: '/ordens-servico/{id}/linha-do-tempo',
    tag: 'Histórico',
    perfis: INTERNOS,
    resumo: 'Linha do tempo (histórico + replanejamentos)',
    sucesso: { status: 200, retorno: 'lista', descricao: 'Itens em ordem cronológica' },
  },
  // Ocorrências
  {
    metodo: 'post',
    caminho: '/ordens-servico/{id}/ocorrencias',
    tag: 'Ocorrências',
    perfis: INTERNOS,
    corpo: abrirOcorrenciaSchema,
    resumo: 'Abrir ocorrência',
    descricao: 'Pode ser impeditiva e pode replanejar a entrega (só ADMIN/GESTOR).',
    exemplo: {
      titulo: 'Manta com defeito',
      descricao: 'Lote com delaminação',
      tipo: 'AGUARDANDO_PECA',
      prioridade: 'ALTA',
      usuarioResponsavelId: '01a206c8-1c75-7048-ab14-2e9f1fc713f1',
      impeditiva: true,
      visivelCliente: true,
      descricaoCliente: 'Aguardando reposição de material',
    },
    sucesso: { status: 201, retorno: 'objeto', descricao: 'Ocorrência aberta' },
    erros: [422],
  },
  {
    metodo: 'get',
    caminho: '/ordens-servico/{id}/ocorrencias',
    tag: 'Ocorrências',
    perfis: INTERNOS,
    query: listarOcorrenciasSchema,
    resumo: 'Listar ocorrências da OS',
    sucesso: { status: 200, retorno: 'lista', descricao: 'Ocorrências' },
  },
  {
    metodo: 'patch',
    caminho: '/ocorrencias/{id}',
    tag: 'Ocorrências',
    perfis: INTERNOS,
    corpo: atualizarOcorrenciaSchema,
    resumo: 'Atualizar, tratar, resolver ou cancelar',
    descricao: 'TECNICO/ATENDIMENTO só se responsáveis. Resolver exige solução.',
    exemplo: { acao: 'RESOLVER', solucao: 'Novo lote recebido e conferido' },
    sucesso: { status: 200, retorno: 'objeto', descricao: 'Ocorrência atualizada' },
    erros: [422],
  },
  // Documentos
  {
    metodo: 'post',
    caminho: '/ordens-servico/{id}/documentos',
    tag: 'Documentos',
    perfis: INTERNOS,
    multipart: enviarDocumentoSchema,
    resumo: 'Enviar documento (PDF, PNG ou JPEG)',
    descricao: 'Tipo validado pelo conteúdo do arquivo. Limite de 10 MB (413).',
    sucesso: { status: 201, retorno: 'objeto', descricao: 'Documento registrado como PENDENTE' },
    erros: [413, 422],
  },
  {
    metodo: 'get',
    caminho: '/ordens-servico/{id}/documentos',
    tag: 'Documentos',
    perfis: INTERNOS,
    resumo: 'Listar documentos da OS',
    sucesso: { status: 200, retorno: 'lista', descricao: 'Documentos' },
  },
  {
    metodo: 'get',
    caminho: '/documentos/{id}/arquivo',
    tag: 'Documentos',
    perfis: INTERNOS,
    resumo: 'Baixar arquivo',
    sucesso: { status: 200, retorno: 'arquivo', descricao: 'Arquivo como anexo' },
  },
  {
    metodo: 'patch',
    caminho: '/documentos/{id}/status',
    tag: 'Documentos',
    perfis: GESTAO,
    corpo: avaliarDocumentoSchema,
    resumo: 'Aprovar ou rejeitar (decisão humana)',
    exemplo: { status: 'APROVADO' },
    sucesso: { status: 200, retorno: 'objeto', descricao: 'Documento avaliado' },
    erros: [422],
  },
  // Modelo de etapas
  {
    metodo: 'get',
    caminho: '/modelos-etapa',
    tag: 'Modelo de etapas',
    perfis: GESTAO,
    resumo: 'Listar modelo de etapas',
    sucesso: { status: 200, retorno: 'lista', descricao: 'Modelos (ativos primeiro)' },
  },
  {
    metodo: 'post',
    caminho: '/modelos-etapa',
    tag: 'Modelo de etapas',
    perfis: GESTAO,
    corpo: criarModeloEtapaSchema,
    resumo: 'Criar etapa no modelo (vale para novas OS)',
    exemplo: { codigo: 'POLIMENTO', nome: 'Polimento', ordem: 55, obrigatoria: false },
    sucesso: { status: 201, retorno: 'objeto', descricao: 'Modelo criado' },
    erros: [409, 422],
  },
  {
    metodo: 'patch',
    caminho: '/modelos-etapa/{id}',
    tag: 'Modelo de etapas',
    perfis: GESTAO,
    corpo: atualizarModeloEtapaSchema,
    resumo: 'Atualizar ou desativar etapa do modelo',
    exemplo: { nome: 'Polimento técnico' },
    sucesso: { status: 200, retorno: 'objeto', descricao: 'Modelo atualizado' },
    erros: [409, 422],
  },
  // Portal do cliente
  {
    metodo: 'get',
    caminho: '/cliente/minhas-ordens',
    tag: 'Portal do cliente',
    perfis: ['CLIENTE'],
    query: paginacaoSchema,
    resumo: 'Minhas ordens de serviço',
    sucesso: { status: 200, retorno: 'paginado', descricao: 'OS do cliente autenticado' },
  },
  {
    metodo: 'get',
    caminho: '/cliente/ordens/{id}/acompanhar',
    tag: 'Portal do cliente',
    perfis: ['CLIENTE'],
    resumo: 'Acompanhar uma OS',
    descricao: 'Somente dados autorizados. OS de outro cliente responde 404.',
    sucesso: {
      status: 200,
      retorno: 'objeto',
      descricao: 'Etapas, ocorrências e documentos visíveis, linha do tempo',
    },
  },
  {
    metodo: 'get',
    caminho: '/cliente/documentos/{id}/arquivo',
    tag: 'Portal do cliente',
    perfis: ['CLIENTE'],
    resumo: 'Baixar documento visível',
    sucesso: { status: 200, retorno: 'arquivo', descricao: 'Arquivo como anexo' },
  },
];

// -------------------------------------------------------------
// Montagem do documento
// -------------------------------------------------------------

function paraJsonSchema(schema: ZodType): JsonSchema {
  const json = z.toJSONSchema(schema, {
    target: 'openapi-3.0',
    io: 'input',
    unrepresentable: 'any',
  }) as JsonSchema;
  delete json['$schema'];
  return json;
}

const ref = (nome: string) => ({ $ref: `#/components/schemas/${nome}` });
const erro = (descricao: string) => ({
  description: descricao,
  content: { 'application/json': { schema: ref('Erro') } },
});

function respostaSucesso({ retorno, descricao }: Operacao['sucesso']) {
  switch (retorno) {
    case 'vazio':
      return { description: descricao };
    case 'arquivo':
      return {
        description: descricao,
        content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } },
      };
    case 'paginado':
      return { description: descricao, content: { 'application/json': { schema: ref('RespostaPaginada') } } };
    case 'lista':
      return {
        description: descricao,
        content: {
          'application/json': {
            schema: { type: 'object', properties: { data: { type: 'array', items: { type: 'object' } } } },
          },
        },
      };
    case 'objeto':
      return {
        description: descricao,
        content: {
          'application/json': { schema: { type: 'object', properties: { data: { type: 'object' } } } },
        },
      };
  }
}

function parametrosQuery(schema: ZodType) {
  const json = paraJsonSchema(schema);
  const propriedades = (json['properties'] ?? {}) as Record<string, JsonSchema>;
  const obrigatorios = new Set((json['required'] ?? []) as string[]);
  return Object.entries(propriedades).map(([nome, propriedade]) => ({
    name: nome,
    in: 'query',
    required: obrigatorios.has(nome) && !('default' in propriedade),
    schema: propriedade,
  }));
}

function montarOperacao(op: Operacao) {
  const publica = op.perfis === 'PUBLICO';
  const perfisTexto =
    op.perfis === 'PUBLICO'
      ? 'Público'
      : op.perfis.length === 0
        ? 'Qualquer usuário autenticado'
        : op.perfis.join(', ');

  const parametros = [
    ...(op.caminho.includes('{id}')
      ? [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }]
      : []),
    ...(op.query ? parametrosQuery(op.query) : []),
  ];

  const responses: Record<string, unknown> = { [String(op.sucesso.status)]: respostaSucesso(op.sucesso) };
  if (op.corpo || op.query || op.multipart || op.caminho.includes('{id}'))
    responses['400'] = erro('Entrada inválida');
  if (!publica) {
    responses['401'] = erro('Token ausente, inválido ou expirado');
    responses['403'] = erro('Perfil sem permissão');
  }
  if (op.caminho.includes('{id}')) responses['404'] = erro('Recurso não encontrado');
  const mensagens: Record<number, string> = {
    409: 'Conflito (duplicidade ou alteração concorrente)',
    413: 'Arquivo acima do limite',
    422: 'Regra de negócio violada (o código da regra vem em error.code)',
    429: 'Muitas tentativas',
  };
  for (const status of op.erros ?? []) responses[String(status)] = erro(mensagens[status] ?? 'Erro');

  let requestBody: unknown;
  if (op.corpo) {
    requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: paraJsonSchema(op.corpo),
          ...(op.exemplo !== undefined && { example: op.exemplo }),
        },
      },
    };
  } else if (op.multipart) {
    const campos = paraJsonSchema(op.multipart);
    const propriedades = (campos['properties'] ?? {}) as Record<string, JsonSchema>;
    requestBody = {
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            required: ['arquivo', ...((campos['required'] ?? []) as string[])],
            properties: { arquivo: { type: 'string', format: 'binary' }, ...propriedades },
          },
        },
      },
    };
  }

  return {
    tags: [op.tag],
    summary: op.resumo,
    description: `${op.descricao ? `${op.descricao}\n\n` : ''}**Perfis:** ${perfisTexto}`,
    operationId: `${op.metodo}${op.caminho.replace(/[{}]/g, '').replace(/[/-](\w)/g, (_, c: string) => c.toUpperCase())}`,
    ...(publica ? { security: [] } : {}),
    ...(parametros.length > 0 && { parameters: parametros }),
    ...(requestBody !== undefined && { requestBody }),
    responses,
  };
}

function montarDocumento() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const op of OPERACOES) {
    const caminho = (paths[op.caminho] ??= {});
    caminho[op.metodo] = montarOperacao(op);
  }

  return {
    openapi: '3.0.3',
    info: {
      title: 'BlindTrack API',
      version: '1.0.0',
      description:
        'API de gestão e rastreabilidade de processos de blindagem automotiva.\n\n' +
        'Sistema **administrativo**: não toma decisões técnicas, de certificação ou de conformidade legal. ' +
        'Aprovações (vistoria, documentos) são decisões humanas registradas.\n\n' +
        'Autentique em `POST /auth/login` e use o token em **Authorize** (Bearer).',
    },
    servers: [{ url: '/api/v1', description: 'API v1' }],
    security: [{ bearerAuth: [] }],
    tags: [...new Set(OPERACOES.map((o) => o.tag))].map((name) => ({ name })),
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      schemas: {
        Erro: {
          type: 'object',
          required: ['error'],
          properties: {
            error: {
              type: 'object',
              required: ['code', 'message'],
              properties: {
                code: { type: 'string', example: 'RN09' },
                message: { type: 'string', example: 'Etapas anteriores ainda não foram concluídas' },
                details: { description: 'Detalhes (campos inválidos, pendências...)' },
                requestId: {
                  type: 'string',
                  description: 'Correlaciona com os logs (cabeçalho X-Request-Id)',
                },
              },
            },
          },
        },
        RespostaPaginada: {
          type: 'object',
          properties: {
            data: { type: 'array', items: { type: 'object' } },
            meta: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                pageSize: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
          },
        },
      },
    },
    paths,
  };
}

export const openApiDocument = montarDocumento();
