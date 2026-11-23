/**
 * Regras de navegação e de ações por perfil (planejamento §7–§8), espelhando a matriz
 * TESTADA do backend (arquitetura.md §7). Servem para a interface não oferecer o que o
 * perfil não pode fazer; a autorização real continua no backend (403 se a UI errar).
 */
import { PERFIS_INTERNOS, type PerfilUsuario, type UsuarioAutenticado } from '@/types/usuario';

export const ROTA_PORTAL = '/portal';
export const ROTA_PAINEL = '/painel';

export function ehPerfilInterno(perfil: PerfilUsuario): boolean {
  return PERFIS_INTERNOS.includes(perfil);
}

/** Destino padrão após o login. */
export function rotaInicial(perfil: PerfilUsuario): string {
  return perfil === 'CLIENTE' ? ROTA_PORTAL : ROTA_PAINEL;
}

/** O perfil pode ser levado de volta a este caminho depois do login? */
export function caminhoPermitido(perfil: PerfilUsuario, caminho: string): boolean {
  const area = perfil === 'CLIENTE' ? ROTA_PORTAL : ROTA_PAINEL;
  return caminho === area || caminho.startsWith(`${area}/`);
}

export const ROTULO_PERFIL: Record<PerfilUsuario, string> = {
  ADMIN: 'Administrador',
  GESTOR: 'Gestor',
  TECNICO: 'Técnico',
  ATENDIMENTO: 'Atendimento',
  CLIENTE: 'Cliente',
};

// ----------------------------------------------------------------------------------------
// Ações do painel
// ----------------------------------------------------------------------------------------

export type Acao =
  | 'os.abrir'
  | 'os.editarObservacoes'
  | 'os.alterarStatus'
  | 'os.replanejar'
  | 'etapa.alterarStatus'
  | 'etapa.dispensarOuReabrir'
  | 'etapa.atribuirResponsavel'
  | 'etapa.alterarPrazo'
  | 'ocorrencia.abrir'
  | 'ocorrencia.alterar'
  | 'ocorrencia.replanejarEntrega'
  | 'documento.enviar'
  | 'documento.avaliar'
  | 'cliente.editar'
  | 'cliente.corrigirDocumento'
  | 'cliente.inativar'
  | 'veiculo.editar'
  | 'usuario.gerir'
  | 'modeloEtapa.gerir';

const ADMIN_GESTOR: readonly PerfilUsuario[] = ['ADMIN', 'GESTOR'];
const CADASTRO: readonly PerfilUsuario[] = ['ADMIN', 'GESTOR', 'ATENDIMENTO'];
const INTERNOS: readonly PerfilUsuario[] = PERFIS_INTERNOS;

const PERFIS_POR_ACAO: Record<Acao, readonly PerfilUsuario[]> = {
  'os.abrir': CADASTRO,
  'os.editarObservacoes': CADASTRO,
  'os.alterarStatus': ADMIN_GESTOR,
  'os.replanejar': ADMIN_GESTOR,
  'etapa.alterarStatus': ['ADMIN', 'GESTOR', 'TECNICO'],
  'etapa.dispensarOuReabrir': ADMIN_GESTOR,
  'etapa.atribuirResponsavel': ADMIN_GESTOR,
  'etapa.alterarPrazo': ADMIN_GESTOR,
  'ocorrencia.abrir': INTERNOS,
  'ocorrencia.alterar': INTERNOS,
  'ocorrencia.replanejarEntrega': ADMIN_GESTOR,
  'documento.enviar': INTERNOS,
  'documento.avaliar': ADMIN_GESTOR,
  'cliente.editar': CADASTRO,
  'cliente.corrigirDocumento': ADMIN_GESTOR,
  'cliente.inativar': ADMIN_GESTOR,
  'veiculo.editar': CADASTRO,
  'usuario.gerir': ['ADMIN'],
  'modeloEtapa.gerir': ADMIN_GESTOR,
};

/** Contexto opcional para regras que dependem do recurso (ex.: "só o responsável"). */
export interface ContextoPermissao {
  responsavelId?: string | null;
}

/**
 * TECNICO altera só as etapas em que é responsável (RN16); TECNICO e ATENDIMENTO alteram só
 * ocorrências em que são responsáveis (RF31).
 */
export function pode(
  usuario: UsuarioAutenticado | null,
  acao: Acao,
  contexto: ContextoPermissao = {},
): boolean {
  if (!usuario || !PERFIS_POR_ACAO[acao].includes(usuario.perfil)) return false;
  const restritoAoResponsavel =
    (acao === 'etapa.alterarStatus' && usuario.perfil === 'TECNICO') ||
    (acao === 'ocorrencia.alterar' && (usuario.perfil === 'TECNICO' || usuario.perfil === 'ATENDIMENTO'));
  return restritoAoResponsavel ? contexto.responsavelId === usuario.id : true;
}

/** Perfis que veem cada item do menu do painel. */
export const PERFIS_MENU = {
  dashboard: INTERNOS,
  ordens: INTERNOS,
  clientes: INTERNOS,
  veiculos: INTERNOS,
  usuarios: ['ADMIN'],
  modelosEtapa: ADMIN_GESTOR,
} as const satisfies Record<string, readonly PerfilUsuario[]>;
