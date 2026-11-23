import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { StatusConexaoPage } from '@/pages/sistema/StatusConexaoPage';

function renderizar() {
  return render(
    <MemoryRouter>
      <StatusConexaoPage />
    </MemoryRouter>,
  );
}

const saudavel = { status: 'ok', database: 'up', uptimeSeconds: 42, timestamp: '2026-11-23T10:00:00Z' };

describe('StatusConexaoPage', () => {
  it('mostra carregamento e depois o status real da API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(saudavel), { status: 200 })),
    );
    renderizar();

    expect(screen.getByRole('status')).toHaveTextContent('Consultando a API...');
    expect(await screen.findByText('Disponível')).toBeInTheDocument();
    expect(screen.getByText('Conectado')).toBeInTheDocument();
    expect(screen.getByText('42 s')).toBeInTheDocument();
  });

  it('banco fora do ar (503) aparece como estado, não como falha', async () => {
    const degradado = { ...saudavel, status: 'degraded', database: 'down' };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(degradado), { status: 503 })),
    );
    renderizar();

    expect(await screen.findByText('Indisponível')).toBeInTheDocument();
    expect(screen.getByText('Degradada')).toBeInTheDocument();
  });

  it('falha de rede mostra mensagem e permite tentar novamente', async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(JSON.stringify(saudavel), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    renderizar();

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar ao servidor');
    await userEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));

    expect(await screen.findByText('Disponível')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
