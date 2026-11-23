/** A matriz de permissões da interface espelha a matriz testada do backend (arquitetura.md §7). */
import { describe, expect, it } from 'vitest';
import type { PerfilUsuario } from '@/types/usuario';
import { pode, type Acao } from '@/utils/permissoes';
import { usuarioDe } from '../helpers/api-falsa';

const PERFIS: PerfilUsuario[] = ['ADMIN', 'GESTOR', 'TECNICO', 'ATENDIMENTO', 'CLIENTE'];

function quemPode(acao: Acao, responsavelId?: string): PerfilUsuario[] {
  return PERFIS.filter((perfil) =>
    pode(usuarioDe(perfil), acao, { responsavelId: responsavelId ?? usuarioDe(perfil).id }),
  );
}

describe('pode()', () => {
  it.each<[Acao, PerfilUsuario[]]>([
    ['os.abrir', ['ADMIN', 'GESTOR', 'ATENDIMENTO']],
    ['os.alterarStatus', ['ADMIN', 'GESTOR']],
    ['etapa.dispensarOuReabrir', ['ADMIN', 'GESTOR']],
    ['etapa.atribuirResponsavel', ['ADMIN', 'GESTOR']],
    ['documento.avaliar', ['ADMIN', 'GESTOR']],
    ['documento.enviar', ['ADMIN', 'GESTOR', 'TECNICO', 'ATENDIMENTO']],
    ['cliente.inativar', ['ADMIN', 'GESTOR']],
    ['usuario.gerir', ['ADMIN']],
    ['modeloEtapa.gerir', ['ADMIN', 'GESTOR']],
  ])('%s → %j', (acao, esperado) => {
    expect(quemPode(acao)).toEqual(esperado);
  });

  it('CLIENTE não tem nenhuma ação do painel', () => {
    const acoes: Acao[] = [
      'os.abrir',
      'etapa.alterarStatus',
      'ocorrencia.abrir',
      'documento.enviar',
      'cliente.editar',
    ];
    expect(acoes.some((a) => pode(usuarioDe('CLIENTE'), a))).toBe(false);
  });

  it('TECNICO altera só as etapas em que é responsável (RN16)', () => {
    const tecnico = usuarioDe('TECNICO');
    expect(pode(tecnico, 'etapa.alterarStatus', { responsavelId: tecnico.id })).toBe(true);
    expect(pode(tecnico, 'etapa.alterarStatus', { responsavelId: 'outro' })).toBe(false);
    expect(pode(usuarioDe('GESTOR'), 'etapa.alterarStatus', { responsavelId: 'outro' })).toBe(true);
  });

  it('TECNICO e ATENDIMENTO alteram só as ocorrências em que são responsáveis (RF31)', () => {
    expect(pode(usuarioDe('ATENDIMENTO'), 'ocorrencia.alterar', { responsavelId: 'outro' })).toBe(false);
    expect(pode(usuarioDe('GESTOR'), 'ocorrencia.alterar', { responsavelId: 'outro' })).toBe(true);
  });

  it('sem usuário, nada é permitido', () => {
    expect(pode(null, 'os.abrir')).toBe(false);
  });
});
