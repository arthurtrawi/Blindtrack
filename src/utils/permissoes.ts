/**
 * Regras de navegação por perfil (planejamento §7–§8).
 * Organizam a INTERFACE; a autorização real é sempre do backend (403 se a UI errar).
 */
import { PERFIS_INTERNOS, type PerfilUsuario } from '@/types/usuario';

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
