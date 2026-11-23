/**
 * Select, Textarea e Checkbox com o mesmo padrão acessível do Input
 * (rótulo visível, erro ligado por aria-describedby e anunciado).
 */
import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

const BASE =
  'block w-full rounded-md border bg-white px-3 text-base text-slate-900 focus:outline-2 focus:outline-offset-0 focus:outline-blue-600 disabled:bg-slate-100 md:text-sm';

function useDescritores(id: string | undefined, erro?: string, dica?: string) {
  const gerado = useId();
  const idCampo = id ?? gerado;
  const idDica = dica ? `${idCampo}-dica` : undefined;
  const idErro = erro ? `${idCampo}-erro` : undefined;
  return { idCampo, idDica, idErro, descritores: [idDica, idErro].filter(Boolean).join(' ') || undefined };
}

function Rodape({
  idDica,
  dica,
  idErro,
  erro,
}: {
  idDica?: string;
  dica?: string;
  idErro?: string;
  erro?: string;
}) {
  return (
    <>
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
    </>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  rotulo: string;
  erro?: string;
  dica?: string;
  children: ReactNode;
  ref?: Ref<HTMLSelectElement>;
}

export function Select({ rotulo, erro, dica, id, className = '', children, ref, ...props }: SelectProps) {
  const { idCampo, idDica, idErro, descritores } = useDescritores(id, erro, dica);
  return (
    <div className="space-y-1.5">
      <label htmlFor={idCampo} className="block text-sm font-medium text-slate-800">
        {rotulo}
      </label>
      <select
        ref={ref}
        id={idCampo}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritores}
        className={`${BASE} h-11 md:h-10 ${erro ? 'border-red-700' : 'border-slate-500'} ${className}`}
        {...props}
      >
        {children}
      </select>
      <Rodape idDica={idDica} dica={dica} idErro={idErro} erro={erro} />
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  rotulo: string;
  erro?: string;
  dica?: string;
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({ rotulo, erro, dica, id, className = '', rows = 3, ref, ...props }: TextareaProps) {
  const { idCampo, idDica, idErro, descritores } = useDescritores(id, erro, dica);
  return (
    <div className="space-y-1.5">
      <label htmlFor={idCampo} className="block text-sm font-medium text-slate-800">
        {rotulo}
      </label>
      <textarea
        ref={ref}
        id={idCampo}
        rows={rows}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritores}
        className={`${BASE} py-2 ${erro ? 'border-red-700' : 'border-slate-500'} ${className}`}
        {...props}
      />
      <Rodape idDica={idDica} dica={dica} idErro={idErro} erro={erro} />
    </div>
  );
}

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  rotulo: string;
  dica?: string;
  ref?: Ref<HTMLInputElement>;
}

export function Checkbox({ rotulo, dica, id, ref, ...props }: CheckboxProps) {
  const { idCampo, idDica } = useDescritores(id, undefined, dica);
  return (
    <div className="flex items-start gap-2">
      <input
        ref={ref}
        id={idCampo}
        type="checkbox"
        aria-describedby={idDica}
        className="mt-0.5 size-4 rounded border-slate-500 accent-blue-700"
        {...props}
      />
      <div>
        <label htmlFor={idCampo} className="text-sm font-medium text-slate-800">
          {rotulo}
        </label>
        {dica && (
          <p id={idDica} className="text-xs text-slate-600">
            {dica}
          </p>
        )}
      </div>
    </div>
  );
}
