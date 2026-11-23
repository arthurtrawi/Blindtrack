/**
 * Campo de formulário acessível: rótulo sempre visível, erro ligado por aria-describedby
 * e anunciado (role="alert"), borda com contraste ≥ 3:1 (slate-500, Fase 1 §2).
 */
import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'children'> {
  rotulo: string;
  erro?: string;
  dica?: string;
  /** Elemento à direita, dentro do campo (ex.: botão de mostrar senha). */
  acessorio?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

export function Input({ rotulo, erro, dica, acessorio, id, className = '', ref, ...props }: InputProps) {
  const idGerado = useId();
  const idCampo = id ?? idGerado;
  const idDica = dica ? `${idCampo}-dica` : undefined;
  const idErro = erro ? `${idCampo}-erro` : undefined;
  const descritores = [idDica, idErro].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={idCampo} className="block text-sm font-medium text-slate-800">
        {rotulo}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={idCampo}
          aria-invalid={erro ? true : undefined}
          aria-describedby={descritores}
          className={`block h-11 w-full rounded-md border bg-white px-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-2 focus:outline-offset-0 focus:outline-blue-600 disabled:bg-slate-100 md:h-10 md:text-sm ${
            erro ? 'border-red-700' : 'border-slate-500'
          } ${acessorio ? 'pr-11' : ''} ${className}`}
          {...props}
        />
        {acessorio && <div className="absolute inset-y-0 right-0 flex items-center pr-1">{acessorio}</div>}
      </div>
      {dica && (
        <p id={idDica} className="text-xs text-slate-600">
          {dica}
        </p>
      )}
      {erro && (
        <p id={idErro} role="alert" className="text-sm text-red-800">
          {erro}
        </p>
      )}
    </div>
  );
}
