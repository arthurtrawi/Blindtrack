import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BlindagemTimeline } from '@/components/timeline/BlindagemTimeline';
import { etapas } from '../helpers/dados-portal';

function passos() {
  return within(screen.getByRole('list', { name: 'Etapas da blindagem' })).getAllByRole('listitem');
}

describe('BlindagemTimeline', () => {
  it('lista as 8 etapas reais, na ordem, com o status em texto', () => {
    render(
      <BlindagemTimeline
        etapas={etapas(
          'CONCLUIDA',
          'EM_ANDAMENTO',
          'PENDENTE',
          'DISPENSADA',
          'PENDENTE',
          'PENDENTE',
          'PENDENTE',
          'PENDENTE',
        )}
      />,
    );

    const itens = passos();
    expect(itens).toHaveLength(8);
    expect(itens[0]).toHaveTextContent('Recepção');
    expect(itens[0]).toHaveTextContent('Concluída');
    expect(itens[1]).toHaveTextContent('Desmontagem');
    expect(itens[3]).toHaveTextContent('Não se aplica');
    expect(itens[7]).toHaveTextContent('Entrega');
    expect(itens[7]).toHaveTextContent('Aguardando');
  });

  it('marca só a etapa em andamento como atual (aria-current) e anuncia isso', () => {
    render(<BlindagemTimeline etapas={etapas('CONCLUIDA', 'EM_ANDAMENTO', 'PENDENTE')} />);

    const itens = passos();
    expect(itens[1]).toHaveAttribute('aria-current', 'step');
    expect(itens[1]).toHaveTextContent('etapa atual');
    expect(itens[0]).not.toHaveAttribute('aria-current');
    expect(itens[2]).not.toHaveAttribute('aria-current');
  });

  it('etapa pausada é a atual e aparece como interrompida', () => {
    render(<BlindagemTimeline etapas={etapas('CONCLUIDA', 'PAUSADA', 'PENDENTE')} />);

    expect(passos()[1]).toHaveAttribute('aria-current', 'step');
    expect(passos()[1]).toHaveTextContent('Pausada');
  });

  it('sem etapa em curso, a primeira pendente é a próxima (atual)', () => {
    render(<BlindagemTimeline etapas={etapas('CONCLUIDA', 'DISPENSADA', 'PENDENTE', 'PENDENTE')} />);
    expect(passos()[2]).toHaveAttribute('aria-current', 'step');
  });

  it('mostra datas de início e conclusão quando existem, e a previsão das não finalizadas', () => {
    render(<BlindagemTimeline etapas={etapas('CONCLUIDA', 'EM_ANDAMENTO')} />);

    expect(passos()[0]).toHaveTextContent('Início:');
    expect(passos()[0]).toHaveTextContent('Conclusão:');
    expect(passos()[0]).not.toHaveTextContent('Previsão:'); // concluída: previsão não interessa mais
    expect(passos()[1]).toHaveTextContent('Previsão:');
  });

  it('avisa previsão vencida de etapa não concluída', () => {
    const lista = etapas('EM_ANDAMENTO').map((etapa) => ({
      ...etapa,
      previsaoConclusao: '2020-01-01T12:00:00.000Z',
    }));
    render(<BlindagemTimeline etapas={lista} />);

    expect(passos()[0]).toHaveTextContent('vencida');
  });

  it('ordena pelas posições da API, mesmo que cheguem fora de ordem', () => {
    const lista = etapas('CONCLUIDA', 'EM_ANDAMENTO', 'PENDENTE').reverse();
    render(<BlindagemTimeline etapas={lista} />);
    expect(passos().map((p) => p.querySelector('p')?.textContent)).toEqual([
      'Recepção',
      'Desmontagem',
      'Instalação da manta',
    ]);
  });
});
