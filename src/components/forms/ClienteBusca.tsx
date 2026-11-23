/**
 * Seleção de cliente por busca de nome (GET /clientes?nome=). Usada na abertura de OS, no
 * cadastro de veículo e no usuário de portal. Só clientes ativos aparecem (padrão da API).
 */
import { Search } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/CamposFormulario';
import { Input } from '@/components/ui/Input';
import { useApi } from '@/hooks/useApi';
import { listar } from '@/services/cliente.service';

interface ClienteBuscaProps {
  valor: string;
  aoMudar: (clienteId: string) => void;
  erro?: string;
  rotulo?: string;
  /** Cliente já vinculado (edição): aparece como opção sem precisar buscar. */
  atual?: { id: string; nome: string };
}

export function ClienteBusca({ valor, aoMudar, erro, rotulo = 'Cliente', atual }: ClienteBuscaProps) {
  const [texto, setTexto] = useState('');
  const [termo, setTermo] = useState('');
  const { estado } = useApi(
    (signal) => (termo.length >= 2 ? listar({ nome: termo, pageSize: 20 }, signal) : Promise.resolve(null)),
    [termo],
  );
  const encontrados = estado.dados?.data ?? [];
  const opcoes = atual && !encontrados.some((c) => c.id === atual.id) ? [atual, ...encontrados] : encontrados;

  function buscar() {
    setTermo(texto.trim());
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            rotulo={`Buscar ${rotulo.toLowerCase()} pelo nome`}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                buscar();
              }
            }}
          />
        </div>
        <Button variante="secondary" onClick={buscar} aria-label={`Buscar ${rotulo.toLowerCase()}`}>
          <Search className="size-4" aria-hidden="true" />
        </Button>
      </div>
      <Select
        rotulo={rotulo}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        erro={erro}
        disabled={opcoes.length === 0}
      >
        <option value="">
          {estado.status === 'carregando' && termo
            ? 'Buscando...'
            : termo.length >= 2
              ? `${estado.dados?.meta.total ?? 0} encontrado(s)`
              : 'Busque pelo nome (mínimo de 2 letras)'}
        </option>
        {opcoes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </Select>
    </div>
  );
}
