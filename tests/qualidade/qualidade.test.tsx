/**
 * Qualidade (Fase 6): acessibilidade automática (axe-core, regras WCAG 2.1 A/AA), título da
 * aba por tela, foco ao navegar, carregamento sob demanda e recuperação de erros de renderização.
 *
 * Contraste de cores não é verificável no jsdom (não calcula estilos); ele é conferido no
 * navegador real, nos 4 tamanhos de tela de referência (ver README, "Qualidade").
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { LimiteDeErro } from '@/components/erros/LimiteDeErro';
import type { PerfilUsuario } from '@/types/usuario';
import { instalarApiFalsa, json, renderizarApp, semSessao, usuarioDe } from '../helpers/api-falsa';
import { ordemDetalhe, ordemResumo } from '../helpers/dados-painel';
import { detalhe, paginado, resumo } from '../helpers/dados-portal';

const sessao = (perfil: PerfilUsuario) => () => json({ data: usuarioDe(perfil) });

const indicadores = {
  porStatus: { ABERTA: 2, EM_ANDAMENTO: 5, SUSPENSA: 0, PRONTA_PARA_ENTREGA: 1, ENTREGUE: 9, CANCELADA: 1 },
  ordensAtivas: 8,
  ordensAtrasadas: 3,
  entregasProximos7Dias: 2,
  ocorrenciasAtivas: 4,
  etapasEmCurso: 5,
  etapasAtrasadas: 1,
  geradoEm: '2026-11-23T12:00:00.000Z',
};

function apiDoPainel(perfil: PerfilUsuario = 'GESTOR') {
  return instalarApiFalsa({
    'GET /auth/me': sessao(perfil),
    'GET /dashboard/indicadores': () => json({ data: indicadores }),
    'GET /ordens-servico': () => json(paginado([ordemResumo()])),
    'GET /ordens-servico/os-1': () => json({ data: ordemDetalhe() }),
    'GET /usuarios/responsaveis': () =>
      json({ data: [{ id: 'id-tecnico', nome: 'Técnico Um', perfil: 'TECNICO' }] }),
    'GET /ordens-servico/os-1/ocorrencias': () => json({ data: [] }),
    'GET /ordens-servico/os-1/documentos': () => json({ data: [] }),
    'GET /ordens-servico/os-1/linha-do-tempo': () => json({ data: [] }),
    'GET /clientes': () => json(paginado([])),
  });
}

const linkDoMenu = (nome: string) =>
  within(screen.getByRole('navigation', { name: 'Menu principal' })).getByRole('link', { name: nome });

/** Roda o axe na página inteira (inclui modais renderizados em portal) e lista as violações. */
async function violacoesWcag(): Promise<string[]> {
  const resultado = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    rules: { 'color-contrast': { enabled: false } },
  });
  return resultado.violations.map(
    (v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
}

describe('Acessibilidade automática (axe-core, WCAG 2.1 AA)', () => {
  it('login sem violações', async () => {
    instalarApiFalsa({ 'GET /auth/me': semSessao });
    renderizarApp('/login');
    await screen.findByRole('button', { name: /Entrar/ });
    expect(await violacoesWcag()).toEqual([]);
  });

  it('portal do cliente sem violações', async () => {
    instalarApiFalsa({
      'GET /auth/me': sessao('CLIENTE'),
      'GET /cliente/minhas-ordens': () => json(paginado([resumo()])),
      'GET /cliente/ordens/os-1/acompanhar': () => json({ data: detalhe() }),
    });
    renderizarApp('/portal');
    await screen.findByRole('list', { name: 'Etapas da blindagem' });
    expect(await violacoesWcag()).toEqual([]);
  });

  it('dashboard e lista de ordens sem violações', async () => {
    apiDoPainel();
    renderizarApp('/painel');
    await screen.findByText('Ordens por status');
    expect(await violacoesWcag()).toEqual([]);

    await userEvent.setup().click(linkDoMenu('Ordens de serviço'));
    await screen.findByRole('heading', { name: 'Ordens de serviço' });
    await screen.findAllByText(ordemResumo().numero);
    expect(await violacoesWcag()).toEqual([]);
  });

  it('detalhe da OS (com abas) sem violações', async () => {
    apiDoPainel();
    renderizarApp('/painel/ordens/os-1');
    await screen.findByRole('tablist');
    expect(await violacoesWcag()).toEqual([]);
  });

  it('formulário em modal sem violações', async () => {
    apiDoPainel('ATENDIMENTO');
    renderizarApp('/painel/clientes');
    await userEvent.setup().click(await screen.findByRole('button', { name: /Novo cliente/ }));
    await screen.findByRole('dialog');
    expect(await violacoesWcag()).toEqual([]);
  });

  it('página não encontrada sem violações', async () => {
    instalarApiFalsa({ 'GET /auth/me': semSessao });
    renderizarApp('/nao-existe');
    await screen.findByRole('heading', { name: 'Página não encontrada' });
    expect(await violacoesWcag()).toEqual([]);
  });
});

describe('Navegação acessível', () => {
  it('cada tela define o título da aba', async () => {
    instalarApiFalsa({ 'GET /auth/me': semSessao });
    const { unmount } = renderizarApp('/login');
    await waitFor(() => expect(document.title).toBe('Entrar · BlindTrack'));
    unmount();

    apiDoPainel();
    renderizarApp('/painel');
    await waitFor(() => expect(document.title).toBe('Dashboard · BlindTrack'));
    await userEvent.setup().click(linkDoMenu('Ordens de serviço'));
    await waitFor(() => expect(document.title).toBe('Ordens de serviço · BlindTrack'));
  });

  it('ao trocar de tela pelo menu, o foco vai para o conteúdo principal', async () => {
    apiDoPainel();
    renderizarApp('/painel');
    await screen.findByText('Ordens por status');
    const usuario = userEvent.setup();

    await usuario.click(linkDoMenu('Ordens de serviço'));
    await screen.findByRole('heading', { name: 'Ordens de serviço' });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('main')));
  });

  it('mudar um filtro (mesma tela) não rouba o foco do campo', async () => {
    apiDoPainel();
    renderizarApp('/painel/ordens');
    const status = await screen.findByRole('combobox', { name: 'Status' });
    await userEvent.setup().selectOptions(status, 'ABERTA');
    expect(document.activeElement).toBe(status);
  });
});

describe('Responsividade da lista de ordens', () => {
  it('no modo cartões (abaixo de 1280 px) a ordenação vem de um seletor e vai para a API', async () => {
    const fetch = apiDoPainel();
    renderizarApp('/painel/ordens');
    const seletor = await screen.findByRole('combobox', { name: 'Ordenar por' });
    expect(seletor).toHaveValue('dataEntrada:desc');

    await userEvent.setup().selectOptions(seletor, 'previsaoEntrega:asc');
    await waitFor(() => {
      const ultima = new URL(String(fetch.mock.calls.at(-1)?.[0]));
      expect(ultima.searchParams.get('ordenarPor')).toBe('previsaoEntrega');
      expect(ultima.searchParams.get('direcao')).toBe('asc');
    });
  });
});

describe('Recuperação de erros de renderização', () => {
  function Quebra({ mensagem }: { mensagem: string }): never {
    throw new Error(mensagem);
  }

  it('erro inesperado mostra tela de recuperação, não uma tela em branco', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <LimiteDeErro>
        <Quebra mensagem="x is undefined" />
      </LimiteDeErro>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Algo deu errado nesta tela');
    expect(screen.getByRole('button', { name: 'Recarregar a página' })).toBeInTheDocument();
  });

  it('falha ao baixar o código da tela (nova versão publicada) sugere recarregar', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <LimiteDeErro>
        <Quebra mensagem="Failed to fetch dynamically imported module: /assets/OrdensPage-abc.js" />
      </LimiteDeErro>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar esta tela');
  });

  it('navegar para outra tela limpa o erro', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    function Navegador() {
      const [tela, setTela] = useState('quebrada');
      return (
        <>
          <button type="button" onClick={() => setTela('ok')}>
            Ir
          </button>
          <LimiteDeErro chaveReinicio={tela}>
            {tela === 'quebrada' ? <Quebra mensagem="falhou" /> : <p>Tela nova</p>}
          </LimiteDeErro>
        </>
      );
    }
    render(<Navegador />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ir' }));
    expect(screen.getByText('Tela nova')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
