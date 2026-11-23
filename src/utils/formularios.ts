/**
 * Leva os erros 400 da API (`details: [{ campo, mensagem }]`) de volta para os campos do
 * formulário (React Hook Form). Devolve a mensagem geral para exibir no topo do formulário.
 */
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '@/services/api';

export function aplicarErrosDaApi<T extends FieldValues>(
  erro: unknown,
  setError: UseFormSetError<T>,
  camposDoFormulario: readonly Path<T>[],
): string {
  if (!(erro instanceof ApiError)) return 'Ocorreu um erro inesperado.';
  let algumCampo = false;
  for (const { campo, mensagem } of erro.errosDeCampo) {
    if ((camposDoFormulario as readonly string[]).includes(campo)) {
      setError(campo as Path<T>, { message: mensagem });
      algumCampo = true;
    }
  }
  if (algumCampo) return 'Corrija os campos destacados.';
  // 409 (duplicidade) e 422 (regra de negócio) já chegam com mensagem pronta.
  return erro.message;
}
