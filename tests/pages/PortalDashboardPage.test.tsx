/**
 * Portal do cliente de ponta a ponta (com a API falsa no formato real do backend).
 */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { chamadas, erroApi, instalarApiFalsa, json, renderizarApp, usuarioDe } from '../helpers/api-falsa';
import { detalhe, etapas, paginado, resumo } from '../helpers/dados-portal';

const sessaoCliente = () => json({ data: usuarioDe('CLIENTE', 'Maria Exemplo da Silva') });

describe('Portal do cliente', () => {
  it('mostra saudação, veículo, progresso real, timeline, ocorrências, documentos e atualizações', async () => {
    instalarApiFalsa({
      'GET /auth/me': sessaoCliente,
      'GET /cliente/minhas-ordens': () => json(paginado([resumo()])),
      'GET /cliente/ordens/os-1/acompanhar': () => json({ data: detalhe() }),
    });
    renderizarApp('/portal');

    expect(await screen.findByRole('heading', { name: 'Olá, Maria!' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /Toyota Corolla Cross/ })).toBeInTheDocument();

    // Progresso: 1 concluída de 7 aplicáveis (uma dispensada) = 14%.
    const barra = screen.getByRole('progressbar', { name: 'Progresso da blindagem' });
    expect(barra).toHaveAttribute('aria-valuenow', '14');
    expect(screen.getByText('1 de 7 etapas concluídas')).toBeInTheDocument();
    expect(screen.getByText('Etapa atual: Desmontagem')).toBeInTheDocument();
    expect(screen.getByText('23/12/2026')).toBeInTheDocument();

    expect(
      within(screen.getByRole('list', { name: 'Etapas da blindagem' })).getAllByRole('listitem'),
    ).toHaveLength(8);
    expect(screen.getByText('Aguardando material de um fornecedor.')).toBeInTheDocument();
    expect(screen.getByText('Contrato assinado')).toBeInTheDocument();
    expect(screen.getByText('Desmontagem: Em andamento')).toBeInTheDocument();
  });

  it('portal é somente leitura: nenhum campo de edição nem ação operacional', async () => {
    instalarApiFalsa({
      'GET /auth/me': sessaoCliente,
      'GET /cliente/minhas-ordens': () => json(paginado([resumo()])),
      'GET /cliente/ordens/os-1/acompanhar': () => json({ data: detalhe() }),
    });
    renderizarApp('/portal');
    await screen.findByRole('heading', { name: /Toyota Corolla Cross/ });

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    const botoes = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent);
    // Só: sair, mostrar placa e baixar documento.
    expect(botoes.every((rotulo) => /sair|placa|baixar/i.test(rotulo ?? ''))).toBe(true);
  });

  it('placa mascarada por padrão, com opção de mostrar', async () => {
    instalarApiFalsa({
      'GET /auth/me': sessaoCliente,
      'GET /cliente/minhas-ordens': () => json(paginado([resumo()])),
      'GET /cliente/ordens/os-1/acompanhar': () => json({ data: detalhe() }),
    });
    renderizarApp('/portal');
    const usuario = userEvent.setup();

    const titulo = await screen.findByRole('heading', { name: /Toyota Corolla Cross/ });
    const cabecalho = titulo.parentElement;
    if (!cabecalho) throw new Error('Cabeçalho da OS não encontrado');
    expect(cabecalho).toHaveTextContent('BRA••19');
    expect(cabecalho).not.toHaveTextContent('BRA2E19');

    await usuario.click(screen.getByRole('button', { name: 'Mostrar placa' }));
    expect(cabecalho).toHaveTextContent('BRA2E19');
  });

  it('com vários veículos, permite escolher qual acompanhar', async () => {
    const fetch = instalarApiFalsa({
      'GET /auth/me': sessaoCliente,
      'GET /cliente/minhas-ordens': () =>
        json(
          paginado([
            resumo(),
            resumo({
              id: 'os-2',
              numero: 'OS-2026-000007',
              status: 'ENTREGUE',
              veiculo: { placa: 'ABC1234', marca: 'Toyota', modelo: 'Hilux', cor: 'Prata' },
            }),
          ]),
        ),
      'GET /cliente/ordens/os-1/acompanhar': () => json({ data: detalhe() }),
      'GET /cliente/ordens/os-2/acompanhar': () =>
        json({
          data: detalhe({
            id: 'os-2',
            numero: 'OS-2026-000007',
            status: 'ENTREGUE',
            dataEntrega: '2026-11-10T12:00:00.000Z',
            veiculo: { placa: 'ABC1234', marca: 'Toyota', modelo: 'Hilux', cor: 'Prata', anoModelo: 2025 },
            etapas: etapas('CONCLUIDA', 'CONCLUIDA', 'CONCLUIDA', 'CONCLUIDA'),
          }),
        }),
    });
    renderizarApp('/portal');
    const usuario = userEvent.setup();

    expect(await screen.findByRole('heading', { name: 'Seus veículos' })).toBeInTheDocument();
    await screen.findByRole('heading', { name: /Corolla Cross/ });

    await usuario.click(screen.getByRole('link', { name: /Toyota Hilux/ }));

    expect(await screen.findByRole('heading', { name: /Toyota Hilux/ })).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText('Blindagem concluída')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Toyota Hilux/ })).toHaveAttribute('aria-current', 'page');
    expect(chamadas(fetch, 'GET /cliente/ordens/os-2/acompanhar')).toBe(1);
  });

  it('sem ordens, mostra estado vazio', async () => {
    instalarApiFalsa({
      'GET /auth/me': sessaoCliente,
      'GET /cliente/minhas-ordens': () => json(paginado([])),
    });
    renderizarApp('/portal');

    expect(await screen.findByText('Nenhuma ordem de serviço encontrada')).toBeInTheDocument();
  });

  it('falha ao carregar mostra erro e permite tentar novamente', async () => {
    let tentativas = 0;
    instalarApiFalsa({
      'GET /auth/me': sessaoCliente,
      'GET /cliente/minhas-ordens': () => {
        tentativas += 1;
        if (tentativas === 1) throw new TypeError('Failed to fetch');
        return json(paginado([]));
      },
    });
    renderizarApp('/portal');
    const usuario = userEvent.setup();

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar ao servidor');
    await usuario.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(await screen.findByText('Nenhuma ordem de serviço encontrada')).toBeInTheDocument();
  });

  it('OS de outro cliente na URL: o backend responde 404 e o portal diz "não encontrada"', async () => {
    instalarApiFalsa({
      'GET /auth/me': sessaoCliente,
      'GET /cliente/minhas-ordens': () => json(paginado([resumo()])),
      'GET /cliente/ordens/os-de-outro/acompanhar': () =>
        erroApi(404, 'NOT_FOUND', 'Ordem de serviço não encontrado(a)'),
    });
    renderizarApp('/portal/ordens/os-de-outro');

    expect(await screen.findByText('Ordem de serviço não encontrada')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar aos meus veículos' })).toBeInTheDocument();
  });

  it('baixa documento pelo endpoint autorizado do portal; erro de download é informado', async () => {
    const criarUrl = vi.fn(() => 'blob:teste');
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: criarUrl, revokeObjectURL: vi.fn() }));
    let falhar = false;
    const fetch = instalarApiFalsa({
      'GET /auth/me': sessaoCliente,
      'GET /cliente/minhas-ordens': () => json(paginado([resumo()])),
      'GET /cliente/ordens/os-1/acompanhar': () => json({ data: detalhe() }),
      'GET /cliente/documentos/doc-1/arquivo': () =>
        falhar
          ? erroApi(404, 'NOT_FOUND', 'Documento não encontrado(a)')
          : new Response('%PDF-1.4', {
              headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="contrato.pdf"',
              },
            }),
    });
    renderizarApp('/portal');
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByRole('button', { name: 'Baixar Contrato assinado' }));
    await waitFor(() => expect(criarUrl).toHaveBeenCalledTimes(1));
    expect(chamadas(fetch, 'GET /cliente/documentos/doc-1/arquivo')).toBe(1);

    falhar = true;
    await usuario.click(screen.getByRole('button', { name: 'Baixar Contrato assinado' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível baixar "Contrato assinado"');
  });

  it('avisa quando a entrega está atrasada', async () => {
    instalarApiFalsa({
      'GET /auth/me': sessaoCliente,
      'GET /cliente/minhas-ordens': () => json(paginado([resumo({ atrasada: true })])),
      'GET /cliente/ordens/os-1/acompanhar': () => json({ data: detalhe({ atrasada: true }) }),
    });
    renderizarApp('/portal');

    expect(await screen.findByText(/A previsão de entrega foi\s+ultrapassada/)).toBeInTheDocument();
    expect(screen.getAllByText('Atrasada').length).toBeGreaterThan(0);
  });
});
