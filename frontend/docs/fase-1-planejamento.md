# Front-end BlindTrack — Fase 1: Planejamento visual

> Status: **aprovado em 2026-11-23** com as recomendações (D1 cookie HttpOnly, D2 estender o backend,
> D3 estados reais de etapa, D4 `~/blindada-frontend`).
>
> **Backend atualizado (Fase 4c):** P1 `GET /dashboard/indicadores`, P2 listagem de OS com `etapaAtual`
> (+ responsável), `?cliente=` e `?ordenarPor=&direcao=`, P5 `descricao` da etapa no portal,
> P7 `GET /usuarios/responsaveis`, P8 `POST /auth/logout` e sessão por cookie HttpOnly com
> anti-CSRF (`X-Requested-With: BlindTrack`). P3, P4 e P6 continuam como evolução; P9 não será feito.
> Backend de referência: `~/Blindada-veiculo` (API `/api/v1`, conferida no código em 2026-11-23).

## 0. Resumo das decisões que precisam da sua aprovação

| #   | Decisão                                                                                                        | Recomendação                                                                                                                                                                      |
| --- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Onde guardar o token JWT                                                                                       | **Cookie HttpOnly emitido pelo backend** (exige pequena mudança no backend). Alternativa sem mudar o backend: token em memória + `sessionStorage`, com riscos documentados (§12). |
| D2  | Lacunas da API em relação ao prompt (dashboard, etapa atual na listagem, ordenação, busca por nome, logout...) | **Estender o backend** com os contratos propostos no §11.3, numa "Fase 4c" curta, antes das Fases 4–5 do front. Alternativa: o front esconde o que a API não suporta.             |
| D3  | Estados de etapa do prompt (`AGUARDANDO`, `EM_RETRABALHO`) não existem no backend                              | **Mapear para os estados reais** (§5.3), sem inventar estados. "Em retrabalho" só aparece se o backend expuser essa informação (proposta P6).                                     |
| D4  | Pasta e nome                                                                                                   | Projeto irmão `~/blindada-frontend`, marca visual **BlindTrack** (mesma do backend).                                                                                              |

---

## 1. Identidade visual

**Conceito: "painel de controle blindado".** Visual sóbrio, de instrumento de precisão: muito
espaço em branco, informação organizada em cards, uma única cor institucional forte (azul-marinho)
e cores semânticas só para status. Deve passar **segurança** (marinho, formas firmes),
**transparência** (linha do tempo clara, datas sempre visíveis) e **tecnologia** (tipografia
limpa, ícones de traço fino).

- **Marca:** "BlindTrack" em texto, com um ícone de escudo (`ShieldCheck`, do Lucide). Não há logotipo gráfico: se houver um, ele substitui o ícone sem mudar o layout.
- **Tom das mensagens:** direto e cordial, em português. No portal, sem jargão interno ("Sua blindagem está na etapa de Desmontagem", e não "Etapa EM_ANDAMENTO").
- **Ícones:** Lucide React, traço de 1,75 px, tamanho de 16 px (inline) e 20 px (navegação).

## 2. Paleta de cores

Contrastes **calculados** (fórmula WCAG 2.1). Mínimo exigido: 4,5:1 para texto e 3:1 para ícones
e bordas de componentes.

| Papel                     | Token Tailwind            | Hex                   | Uso                                       | Contraste                            |
| ------------------------- | ------------------------- | --------------------- | ----------------------------------------- | ------------------------------------ |
| Institucional             | `marinho-900` (custom)    | `#0B1F3A`             | Sidebar, cabeçalho do portal, títulos     | 16,5:1 sobre branco                  |
| Ação principal            | `blue-700`                | `#1D4ED8`             | Botões primários, links                   | 6,7:1 (texto branco no botão: 6,7:1) |
| Foco                      | `blue-600`                | `#2563EB`             | Anel de foco (2 px + offset)              | 5,2:1                                |
| Fundo da aplicação        | `slate-50`                | `#F8FAFC`             | Plano de fundo                            | —                                    |
| Superfície                | `white`                   | `#FFFFFF`             | Cards, modais, tabelas                    | —                                    |
| Texto principal           | `slate-900`               | `#0F172A`             | Corpo                                     | 17,1:1 sobre slate-50                |
| Texto secundário          | `slate-600`               | `#475569`             | Legendas, metadados                       | 7,2:1 sobre slate-50                 |
| Borda de input            | `slate-500`               | `#64748B`             | Inputs, selects                           | 4,8:1 (`slate-400` reprovado: 2,6:1) |
| Borda decorativa          | `slate-200`               | `#E2E8F0`             | Cards, divisórias                         | decorativa                           |
| Sucesso / concluído       | `green-800` / `green-50`  | `#166534` / `#F0FDF4` | Badge de etapa concluída                  | 6,8:1                                |
| Informação / em andamento | `blue-800` / `blue-50`    | `#1E40AF` / `#EFF6FF` | Badge de em andamento                     | 8,0:1                                |
| Alerta / pendência        | `amber-800` / `amber-50`  | `#92400E` / `#FFFBEB` | Pausada, ocorrência aberta, prazo próximo | 6,8:1                                |
| Crítico                   | `red-800` / `red-50`      | `#991B1B` / `#FEF2F2` | Atraso, cancelada, prioridade crítica     | 7,6:1                                |
| Neutro                    | `slate-700` / `slate-100` | `#334155` / `#F1F5F9` | Pendente, dispensada                      | 9,5:1                                |
| Ícone de concluído        | `green-600`               | `#16A34A`             | Marcador na timeline                      | 3,3:1 (só ícone, sempre com texto)   |

**Regra:** nenhum status é comunicado só pela cor. Todo badge e marcador tem **texto e ícone** (ex.: ✓ "Concluída").

## 3. Design System

### 3.1 Tipografia

Pilha de fontes do sistema (`ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial`).
Nenhuma fonte externa: zero requisições a terceiros e carregamento instantâneo.

| Estilo          | Classe                                              | Uso                                   |
| --------------- | --------------------------------------------------- | ------------------------------------- |
| Display         | `text-2xl md:text-3xl font-semibold tracking-tight` | Título da página                      |
| Título de seção | `text-lg font-semibold`                             | Cabeçalho de card                     |
| Corpo           | `text-sm md:text-base`                              | Texto geral                           |
| Legenda         | `text-xs text-slate-600`                            | Datas, metadados                      |
| Dados           | `font-mono tabular-nums`                            | Número da OS, placa, datas em tabelas |

### 3.2 Espaçamento, forma e profundidade

- **Espaçamento:** escala de 4 px do Tailwind. Padrões: 16 px entre campos, 24 px entre seções, `p-4 md:p-6` em cards.
- **Raios:** `rounded-lg` (8 px) em cards e modais; `rounded-md` (6 px) em botões e inputs; `rounded-full` em badges.
- **Sombras:** `shadow-sm` nos cards; `shadow-lg` só em modais e menus suspensos.
- **Largura máxima do conteúdo:** `max-w-6xl` no portal; tela cheia no painel.
- **Movimento:** só transições de 150 ms em hover/foco, respeitando `prefers-reduced-motion`.

### 3.3 Componentes base (`components/ui`)

| Componente                    | Variantes e estados                                                                               | Acessibilidade                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `Button`                      | `primary`, `secondary`, `ghost`, `danger`; tamanhos `sm`/`md`; `loading` (spinner + desabilitado) | `aria-busy` no loading; alvo ≥ 44×44 px no mobile                 |
| `Input`, `Select`, `Textarea` | normal, foco, erro, desabilitado                                                                  | `<label>` sempre visível; erro ligado por `aria-describedby`      |
| `Card`                        | com ou sem cabeçalho/ações                                                                        | `<section>` com título                                            |
| `Badge`                       | `success`, `info`, `warning`, `danger`, `neutral`                                                 | texto sempre presente; ícone `aria-hidden`                        |
| `Modal` / `ConfirmDialog`     | título, corpo, ações; `danger` para ações irreversíveis                                           | `role="dialog"`, foco preso, Esc fecha, foco devolvido ao gatilho |
| `Table` / `ResponsiveTable`   | cabeçalho ordenável, linhas clicáveis, vira cards abaixo de `md`                                  | `<th scope>`, `aria-sort`                                         |
| `Toast`                       | sucesso, erro, aviso; some em 5 s (erros ficam até fechar)                                        | região `aria-live="polite"` (erros: `assertive`)                  |
| `Skeleton`, `Spinner`         | blocos de carregamento                                                                            | `aria-busy` no contêiner                                          |
| `EmptyState`, `ErrorState`    | ícone, texto, ação ("Tentar novamente")                                                           | texto descritivo                                                  |
| `ProgressBar`                 | percentual + rótulo                                                                               | `role="progressbar"` com `aria-valuenow`                          |
| `Pagination`                  | anterior/próxima, "página X de Y"                                                                 | `nav aria-label="Paginação"`                                      |

## 4. Mapa de status (fonte: enums reais do backend)

### 4.1 Ordem de serviço (`StatusOrdemServico`)

| Valor da API          | Rótulo              | Badge   | Ícone          |
| --------------------- | ------------------- | ------- | -------------- |
| `ABERTA`              | Aberta              | neutral | `CircleDot`    |
| `EM_ANDAMENTO`        | Em andamento        | info    | `Loader`       |
| `SUSPENSA`            | Suspensa            | warning | `PauseCircle`  |
| `PRONTA_PARA_ENTREGA` | Pronta para entrega | success | `PackageCheck` |
| `ENTREGUE`            | Entregue            | success | `CheckCircle2` |
| `CANCELADA`           | Cancelada           | danger  | `XCircle`      |

Mais um indicador independente: **Atrasada** (danger, `AlarmClock`), quando `prazo.atrasada` (painel) ou `atrasada` (portal) for `true`.

### 4.2 Etapa (`StatusEtapa`)

| Valor da API   | Rótulo no painel | Rótulo no portal | Visual na timeline                                                      |
| -------------- | ---------------- | ---------------- | ----------------------------------------------------------------------- |
| `PENDENTE`     | Pendente         | Aguardando       | marcador vazio, cinza (etapa futura)                                    |
| `EM_ANDAMENTO` | Em andamento     | Em andamento     | marcador azul preenchido, destacado (etapa atual)                       |
| `PAUSADA`      | Pausada          | Pausada          | marcador âmbar com ícone de pausa (etapa interrompida)                  |
| `CONCLUIDA`    | Concluída        | Concluída        | marcador verde com ✓, linha conectora sólida                            |
| `DISPENSADA`   | Dispensada       | Não se aplica    | marcador tracejado, texto riscado leve; **sai do cálculo do progresso** |

### 4.3 Divergência com o prompt (decisão D3)

O prompt lista `AGUARDANDO` e `EM_RETRABALHO`, que **não existem** no backend. Proposta sem inventar contrato:

- "Aguardando" = `PENDENTE` (o portal já recebe `statusDescricao: "Aguardando"`) e "interrompida" = `PAUSADA`.
- "Em retrabalho" não é um estado: no backend, retrabalho é uma **reabertura** (`REABRIR`, que volta a etapa para `EM_ANDAMENTO`) ou uma **ocorrência do tipo `RETRABALHO`**. O portal não expõe nenhum dos dois por etapa. Para mostrar "Em retrabalho" na timeline, é preciso a proposta **P6** (§11.3). Sem ela, a etapa aparece só como "Em andamento".

### 4.4 Ocorrência e documento

- **Ocorrência:** portal (`"Em análise"`, `"Em tratamento"`, `"Resolvida"`, `"Encerrada"`, textos já vindos da API); painel (`ABERTA`, `EM_TRATAMENTO`, `RESOLVIDA`, `CANCELADA`), com a prioridade (`BAIXA` neutral, `MEDIA` info, `ALTA` warning, `CRITICA` danger).
- **Documento (painel):** `PENDENTE` warning, `APROVADO` success, `REJEITADO` danger.

## 5. Wireframes — Portal do Cliente

### 5.1 Login (compartilhado com o painel; o redirecionamento depende do perfil)

```
┌──────────────────────────────────────────────┐
│              🛡  BlindTrack                   │
│      Acompanhamento da sua blindagem          │
│ ┌──────────────────────────────────────────┐ │
│ │ E-mail                                    │ │
│ │ [ voce@exemplo.com                     ]  │ │
│ │ Senha                                     │ │
│ │ [ ••••••••••                      👁 ]    │ │
│ │ ⚠ E-mail ou senha inválidos (erro da API) │ │
│ │ [        Entrar  (⟳ ao enviar)       ]    │ │
│ └──────────────────────────────────────────┘ │
│  "Esqueci minha senha": oculto (sem endpoint) │
└──────────────────────────────────────────────┘
```

Estados: carregando (botão desabilitado + spinner), erro 401 (mensagem da API), erro 429 ("Muitas tentativas..."), erro de rede ("Não foi possível conectar ao servidor").

### 5.2 Dashboard do cliente (desktop)

```
┌ 🛡 BlindTrack ─────────────────────────────── Maria Exemplo ▾ (Sair) ┐
│ Olá, Maria! Acompanhe a blindagem dos seus veículos.                 │
│                                                                      │
│ ┌ Seus veículos (1 por OS; seleção se houver mais de uma) ─────────┐ │
│ │ ● Toyota Corolla Cross · BRA•E19 · OS-2026-000001  [Em andamento] │ │
│ │ ○ Toyota Hilux · ABC•234 · OS-2026-000007          [Entregue]     │ │
│ └───────────────────────────────────────────────────────────────────┘ │
│ ┌ Progresso ─────────────────────────────────────────────────────────┐ │
│ │ Etapa atual: Desmontagem              Previsão: 23/12/2026         │ │
│ │ ████████░░░░░░░░░░░░░░░░  1 de 8 etapas (13%)                      │ │
│ │ Última atualização: 21/11/2026 02:01            [⚠ Atrasada?]       │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ ┌ Linha do tempo da blindagem (§5.3) ─────────────────────────────────┐ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ ┌ Ocorrências ───────────────┐ ┌ Documentos ────────────────────────┐ │
│ │ ⚠ Aguardando material...   │ │ 📄 Contrato assinado · CONTRATO    │ │
│ │   Em análise · 21/11/2026  │ │    20/11/2026        [⬇ Baixar]    │ │
│ └────────────────────────────┘ └────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

- **Progresso** = etapas `CONCLUIDA` ÷ etapas aplicáveis (todas menos `DISPENSADA`), calculado das etapas reais. Nunca é um valor fixo.
- **Placa com exposição controlada:** o terceiro e o quarto caracteres são mascarados por padrão (`BRA•E19`), com o botão "mostrar" (👁).
- **Última atualização** = data do último item de `linhaDoTempo`.
- **"Seus veículos":** vem de `/cliente/minhas-ordens` (cada OS traz o veículo). Um veículo com várias OS aparece uma vez por OS, com o número.

### 5.3 Timeline (componente principal)

**Desktop (≥ `lg`): horizontal, 8 marcadores conectados.**

```
  ✓──────────●──────────○──────────○──────────○──────────○──────────○──────────○
Recepção  Desmontagem  Manta   Vidros  Remontagem Vistoria  Inspeção  Entrega
Concluída Em andamento Aguard.  Aguard.  Aguard.   Aguard.   Aguard.   Aguard.
18/11–19/11 desde 20/11
            prev. 22/11 ⚠
```

**Mobile e tablet (< `lg`): vertical, com detalhes expandidos.**

```
 ✓  Recepção ................................ Concluída
 │  Início 18/11 · Conclusão 19/11
 ●  Desmontagem ............................. Em andamento
 │  Início 20/11 · Previsão 22/11  ⚠ previsão vencida
 ○  Instalação da manta ..................... Aguardando
 ┆  Troca de vidros ......................... Não se aplica (se dispensada)
 ...
```

- Diferenciação visual: concluída (verde + ✓ + linha sólida), atual (azul, maior, `aria-current="step"`), futura (cinza vazio), interrompida/`PAUSADA` (âmbar + pausa), dispensada (tracejada).
- Datas exibidas só quando existem (`dataInicio`, `dataConclusao`, `previsaoConclusao`).
- **Descrição da etapa:** o portal **não** devolve `descricao` hoje (ver P5). Até lá, o front usa um texto explicativo fixo por código de etapa, que é conteúdo institucional e não dado operacional.
- **Responsável técnico:** **nunca exibido no portal**. O backend não envia esse dado ao cliente (RN31 / LGPD).
- Estrutura semântica: `<ol>` com um `<li>` por etapa, status em texto.

## 6. Wireframes — Painel administrativo

### 6.1 Layout

```
┌───────────────┬──────────────────────────────────────────────────────┐
│ 🛡 BlindTrack  │ ☰  Ordens de serviço            🔔  Ana (GESTOR) ▾   │
│               ├──────────────────────────────────────────────────────┤
│ ▸ Dashboard   │                                                      │
│ ▸ Ordens de   │              área de conteúdo                        │
│   serviço     │                                                      │
│ ▸ Clientes    │                                                      │
│ ▸ Veículos    │                                                      │
│ ▸ Usuários*   │                                                      │
│ ▸ Modelo de   │                                                      │
│   etapas*     │                                                      │
│ ──────────    │                                                      │
│ ⎋ Sair        │                                                      │
└───────────────┴──────────────────────────────────────────────────────┘
```

- Abaixo de `lg`, a sidebar vira **gaveta** aberta pelo ☰, com foco preso e Esc para fechar.
- O menu é filtrado por perfil (§8). Itens com `*` só aparecem para quem tem permissão.
- **"Ocorrências", "Documentos" e "Relatórios" globais** não aparecem no menu enquanto não houver endpoints de listagem global (P3, P4). Ocorrências e documentos ficam acessíveis **dentro do detalhe de cada OS**, que é onde a API os oferece.
- **"Configurações"** = Modelo de etapas (`/modelos-etapa`, ADMIN/GESTOR).

### 6.2 Dashboard

```
┌ Em andamento ┐┌ Atrasadas ┐┌ Prontas p/ entrega ┐┌ Abertas ┐┌ Suspensas ┐
│     12       ││  ⚠ 3      ││        2           ││   4     ││    1      │
└──────────────┘└───────────┘└────────────────────┘└─────────┘└───────────┘
┌ Ordens atrasadas (top 5, link "ver todas") ───────────────────────────┐
│ OS-2026-000002 · Transportes Exemplo · ABC1234 · 2 dias de atraso     │
└────────────────────────────────────────────────────────────────────────┘
┌ Entregas previstas nos próximos 7 dias ───────────────────────────────┐
```

- **Com a API atual:** cada indicador vem de `GET /ordens-servico?status=X&pageSize=1` (usando `meta.total`) e `?atrasada=true`. São cerca de 6 requisições leves, em paralelo.
- **Ocorrências ativas e etapas pendentes:** não há endpoint (P1). Esses cards só aparecem com a proposta P1.
- **Gráficos:** só com dados reais (ex.: OS por status, com os mesmos totais). Sem dados, o card mostra estado vazio, nunca valores de exemplo.

### 6.3 Lista de ordens de serviço

```
Filtros: [Placa ____] [Cliente ▾ (busca)] [Status ▾] [Entrada de __ até __] [☐ Só atrasadas] [Limpar]
┌──────────────┬────────────────┬─────────────────┬─────────┬──────────────┬──────────────┬──────────┬────────┐
│ Nº OS ▾      │ Cliente        │ Veículo         │ Placa   │ Etapa atual* │ Status       │ Previsão │ Ações  │
├──────────────┼────────────────┼─────────────────┼─────────┼──────────────┼──────────────┼──────────┼────────┤
│ OS-…-000002  │ Transportes Ex.│ Toyota Hilux    │ ABC1234 │ Recepção*    │ Aberta ⚠2d   │ 21/11    │ Abrir →│
└──────────────┴────────────────┴─────────────────┴─────────┴──────────────┴──────────────┴──────────┴────────┘
‹ Anterior   Página 1 de 3   Próxima ›                         20 por página ▾
```

- **Com a API atual:** filtros por placa (prefixo), status, período de entrada, atrasadas e `clienteId`. A busca por cliente vira um seletor que consulta `GET /clientes?nome=`. Paginação pelo `meta` da resposta.
- **Colunas `*` "Etapa atual" e "Responsável":** a listagem não traz as etapas. Buscar o detalhe de cada OS geraria N+1 requisições, por isso **depende da P2**. Sem ela, as colunas ficam ocultas.
- **Ordenação:** o backend ordena fixo por entrada (mais recentes primeiro). Ordenar por coluna depende da P2. Ordenar só a página no front daria resultado enganoso entre páginas e não será feito.
- **Mobile:** cada linha vira um card (nº OS + status no topo; cliente, veículo e previsão abaixo).
- Os filtros ficam na URL (`?status=…&page=…`): recarregar ou compartilhar o link mantém a busca.

### 6.4 Detalhe da OS

```
← Ordens   OS-2026-000001  [Em andamento] [⚠ Atrasada]      [Suspender] [Cancelar] [Replanejar entrega]
┌ Cliente ─────────────┐┌ Veículo ───────────────┐┌ Prazo ─────────────────────────────┐
│ Maria Exemplo        ││ Corolla Cross · Preto  ││ Entrada 18/11 · Previsão 23/12     │
│ [ver cadastro]       ││ BRA2E19 · 9BWZZZ...    ││ Desvio: — · 1 ocorrência aberta    │
└──────────────────────┘└────────────────────────┘└────────────────────────────────────┘
[ Etapas | Ocorrências (1) | Documentos (0) | Histórico ]   ← abas
Etapas:
 ✓ Recepção     Concluída   Resp.: Técnico 1   18/11→19/11
 ● Desmontagem  Em andamento Resp.: Técnico 1  prev. 22/11 ⚠   [Pausar] [Concluir] [⋯ Responsável | Prazo]
 ○ Manta        Pendente    Resp.: —                          [Definir responsável] [Iniciar ⛔ RN09]
```

- As ações aparecem conforme o perfil e o status (ex.: TECNICO só vê ações nas etapas em que é responsável). A **validação final é sempre do backend**: um 422 com `code` (ex.: `RN09`) vira um toast com a mensagem da API.
- **Ações que exigem justificativa** (pausar, dispensar, reabrir, suspender, cancelar, replanejar) abrem um `ConfirmDialog` com campo obrigatório. Cancelar usa a variante `danger`.
- Concluir a ENTREGA com pendências: o 422 RN17 traz `details.pendencias`, mostradas em lista no modal.
- Depois de cada sucesso, os dados da OS são recarregados (status derivado, histórico).
- **Ocorrências:** lista + "Registrar ocorrência" (formulário com tipo, prioridade, responsável, impeditiva, visível ao cliente → texto para o cliente).
- **Documentos:** upload (`multipart`), lista, download, aprovar/rejeitar (ADMIN/GESTOR).
- **Histórico:** `GET /ordens-servico/:id/linha-do-tempo` (inclui replanejamentos).

### 6.5 Cadastros (clientes, veículos, usuários)

```
Clientes                                         [+ Novo cliente]
[Buscar por nome ____] [CPF/CNPJ ____] [Tipo ▾]
Tabela: Nome · Documento · E-mail · Telefone · Ações (Editar)
```

- **Formulário em modal** (criação e edição), com React Hook Form + Zod espelhando as regras do backend: CPF/CNPJ (inclusive alfanumérico), placa, chassi, anos coerentes, senha forte. Os erros 400 da API (`details[].campo`) são mapeados de volta para cada campo.
- **Veículo:** o vínculo com o cliente é feito por um seletor de cliente. A transferência de proprietário mostra o aviso do RF12 se a API recusar.
- **Usuários (ADMIN):** perfil CLIENTE exige escolher o cliente vinculado.
- **Inativar cliente:** `ConfirmDialog danger`.

## 7. Fluxo de navegação

```mermaid
flowchart TD
    A[/login/] -->|login ok| B{perfil?}
    B -->|CLIENTE| C[/portal/]
    B -->|ADMIN, GESTOR, TECNICO, ATENDIMENTO| D[/painel/]
    C --> C1[/portal/ordens/:id/] --> C2[download de documento]
    D --> D1[/painel/ordens/] --> D2[/painel/ordens/:id/]
    D --> D3[/painel/clientes/]
    D --> D4[/painel/veiculos/]
    D --> D5[/painel/usuarios/ - ADMIN]
    D --> D6[/painel/modelos-etapa/ - ADMIN, GESTOR]
    C -. sair .-> A
    D -. sair .-> A
    X[qualquer rota protegida] -->|sem sessão ou 401| A
    Y[rota de outro perfil] -->|RoleRoute| Z[/403 - acesso negado/]
```

| Rota                                   | Perfis                        | Observação                                                |
| -------------------------------------- | ----------------------------- | --------------------------------------------------------- |
| `/login`                               | público                       | Com sessão ativa, redireciona conforme o perfil           |
| `/portal`                              | CLIENTE                       | Dashboard com a OS selecionada                            |
| `/portal/ordens/:id`                   | CLIENTE                       | Deep link de uma OS (404 da API → "Ordem não encontrada") |
| `/painel`                              | internos                      | Dashboard                                                 |
| `/painel/ordens`, `/painel/ordens/:id` | internos                      | Lista e detalhe                                           |
| `/painel/clientes`, `/painel/veiculos` | internos (TECNICO só leitura) |                                                           |
| `/painel/usuarios`                     | ADMIN                         |                                                           |
| `/painel/modelos-etapa`                | ADMIN, GESTOR                 | "Configurações"                                           |
| `/acesso-negado`, `*` (404)            | —                             | Páginas de erro                                           |

## 8. Permissões refletidas na interface

Espelham a matriz testada do backend (`arquitetura.md` §7). A interface **esconde** o que o
perfil não pode fazer, mas a segurança real é do backend: se a interface errar, a API responde 403.

| Recurso                                     |  ADMIN  | GESTOR  |       TECNICO        |     ATENDIMENTO     |
| ------------------------------------------- | :-----: | :-----: | :------------------: | :-----------------: |
| Dashboard, OS (consulta), histórico         |   ✅    |   ✅    |          ✅          |         ✅          |
| Abrir OS, editar observações                |   ✅    |   ✅    |          —           |         ✅          |
| Suspender, cancelar, replanejar OS          |   ✅    |   ✅    |          —           |          —          |
| Status de etapa                             |   ✅    |   ✅    |    só as próprias    |          —          |
| Dispensar/reabrir etapa, responsável, prazo |   ✅    |   ✅    |          —           |          —          |
| Ocorrências: abrir / alterar                | ✅ / ✅ | ✅ / ✅ | ✅ / se responsável  | ✅ / se responsável |
| Documentos: enviar, baixar / avaliar        | ✅ / ✅ | ✅ / ✅ |        ✅ / —        |       ✅ / —        |
| Clientes e veículos: editar                 |   ✅    |   ✅    | — (leitura reduzida) |         ✅          |
| Usuários                                    |   ✅    |    —    |          —           |          —          |
| Modelo de etapas                            |   ✅    |   ✅    |          —           |          —          |

## 9. Estrutura de pastas

Segue a estrutura do prompt. Os acréscimos estão marcados com `+`.

```
blindada-frontend/
├── docs/                         + planejamento e decisões (este arquivo)
├── public/
│   ├── images/
│   └── favicon.svg
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── ui/                   Button, Input, Select, Card, Badge, Modal, ConfirmDialog,
│   │   │                         ResponsiveTable, Pagination, Toast, Skeleton, EmptyState,
│   │   │                         ErrorState, ProgressBar, Spinner
│   │   ├── layout/               PortalLayout, AdminLayout, Sidebar, Topbar, PageHeader
│   │   ├── timeline/             BlindagemTimeline, TimelineStep, HistoricoList
│   │   ├── dashboard/            IndicadorCard, ProgressoCard, VeiculoSelector
│   │   ├── forms/                ClienteForm, VeiculoForm, UsuarioForm, OcorrenciaForm,
│   │   │                         JustificativaDialog, DocumentoUpload
│   │   └── status/               + StatusOsBadge, StatusEtapaBadge, AtrasoBadge (mapa do §4)
│   ├── pages/
│   │   ├── auth/                 LoginPage
│   │   ├── cliente/              PortalDashboardPage
│   │   ├── admin/                DashboardPage, OrdensPage, OrdemDetalhePage, ClientesPage,
│   │   │                         VeiculosPage, UsuariosPage, ModelosEtapaPage
│   │   └── erros/                + AcessoNegadoPage, NaoEncontradoPage
│   ├── hooks/                    useApi, usePaginacao, useFiltrosNaUrl, useToast, usePermissao
│   ├── services/
│   │   ├── api.ts                cliente HTTP central (fetch, timeout, erros, sessão)
│   │   ├── auth.service.ts
│   │   ├── portal.service.ts     + (o prompt cita cliente.service para o portal; separei
│   │   ├── cliente.service.ts      portal [/cliente/*] de cadastro de clientes [/clientes])
│   │   ├── veiculo.service.ts    +
│   │   ├── usuario.service.ts    +
│   │   ├── ordemServico.service.ts
│   │   ├── etapa.service.ts      +
│   │   ├── ocorrencia.service.ts
│   │   └── documento.service.ts  +
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── ToastContext.tsx      +
│   ├── types/                    api.ts (+ envelopes data/meta/error), cliente.ts, veiculo.ts,
│   │                             ordemServico.ts, usuario.ts, portal.ts (+)
│   ├── utils/                    formatarData, mascararPlaca, calcularProgresso, permissoes
│   ├── routes/                   AppRoutes.tsx, ProtectedRoute.tsx, RoleRoute.tsx
│   ├── styles/globals.css
│   ├── App.tsx                   só providers + rotas
│   └── main.tsx
├── tests/                        + setup do Vitest/RTL e testes de integração de telas
├── .env / .env.example           VITE_API_URL=http://localhost:3000/api/v1
├── .gitignore, index.html, package.json, tsconfig.json, vite.config.ts, README.md
```

**Tipos:** escritos à mão a partir do `docs/api/openapi.json` do backend e conferidos contra as respostas reais. Não serão importados do Prisma, porque o front é um projeto independente.

## 10. Componentes reutilizáveis

| Componente                                         | Responsabilidade                                                                       | Usado em              |
| -------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------- |
| `BlindagemTimeline` / `TimelineStep`               | Linha do tempo horizontal/vertical com os 5 estados visuais                            | Portal, detalhe da OS |
| `ProgressoCard`                                    | Percentual (etapas concluídas ÷ aplicáveis), etapa atual, previsão, última atualização | Portal, detalhe da OS |
| `StatusOsBadge`, `StatusEtapaBadge`, `AtrasoBadge` | Mapa único status → rótulo, cor e ícone                                                | Todas as telas        |
| `ResponsiveTable`                                  | Tabela no desktop, cards no mobile, ordenação e linhas clicáveis                       | Listas                |
| `FiltrosBar` + `useFiltrosNaUrl`                   | Filtros sincronizados com a URL                                                        | Listas                |
| `JustificativaDialog`                              | Confirmação com justificativa obrigatória (5–1000 caracteres, como no backend)         | Ações de OS e etapa   |
| `IndicadorCard`                                    | Número + rótulo + link para a lista filtrada                                           | Dashboard             |
| `DocumentoLink`                                    | Download autenticado (fetch → blob → arquivo), sem expor caminho                       | Portal, detalhe       |
| `useApi`                                           | Carregamento, erro, dados, `recarregar()`, cancelamento ao desmontar                   | Todas as páginas      |
| `usePermissao`                                     | `pode('etapa.alterarStatus', etapa)` a partir do perfil                                | Ações condicionais    |

## 11. Contratos de API

### 11.1 Envelopes (reais)

- **Sucesso:** `{ "data": T }`.
- **Listagem:** `{ "data": T[], "meta": { page, pageSize, total, totalPages } }`.
- **Erro:** `{ "error": { code, message, details?, requestId } }`.
  - 400 `VALIDATION_ERROR`: `details: [{ campo, mensagem }]`.
  - 401: sessão encerrada → logout + `/login?expirada=1`.
  - 403: perfil sem permissão.
  - 404: não encontrado.
  - 409: conflito, como duplicidade ou alteração concorrente ("Recarregue e tente novamente").
  - 413: arquivo grande demais.
  - 422: regra de negócio, com `code` = `RN09` etc.
  - 429: excesso de tentativas de login.
- O cabeçalho `X-Request-Id` aparece na mensagem de erro inesperado, para correlacionar com os logs.

### 11.2 Endpoints existentes que o front vai usar (conferidos no código)

| Tela          | Endpoint                                                                                                  | Observação                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Login         | `POST /auth/login` → `{ token, tipo, expiraEm, usuario: { id, nome, email, perfil, clienteId } }`         |                                                                                                 |
| Sessão        | `GET /auth/me`                                                                                            | Recupera a sessão ao recarregar a página                                                        |
| Trocar senha  | `PATCH /auth/senha`                                                                                       | Opção no menu do usuário                                                                        |
| Portal        | `GET /cliente/minhas-ordens`, `GET /cliente/ordens/:id/acompanhar`, `GET /cliente/documentos/:id/arquivo` | Download exige `Authorization` → fetch + blob                                                   |
| Dashboard     | `GET /ordens-servico?status=…&pageSize=1`, `?atrasada=true`                                               | Totais pelo `meta.total`                                                                        |
| OS            | `GET/POST /ordens-servico`, `GET/PATCH /ordens-servico/:id`, `PATCH …/status`, `PATCH …/previsao`         |                                                                                                 |
| Etapas        | `GET /ordens-servico/:id/etapas`, `PATCH /etapas/:id/status`, `…/responsavel`, `…/prazo`                  |                                                                                                 |
| Histórico     | `GET /ordens-servico/:id/historico`, `…/linha-do-tempo`                                                   |                                                                                                 |
| Ocorrências   | `GET/POST /ordens-servico/:id/ocorrencias`, `PATCH /ocorrencias/:id`                                      |                                                                                                 |
| Documentos    | `GET/POST /ordens-servico/:id/documentos`, `GET /documentos/:id/arquivo`, `PATCH /documentos/:id/status`  |                                                                                                 |
| Cadastros     | `/clientes`, `/veiculos`, `/usuarios` (GET, POST, PATCH; `DELETE /clientes/:id`)                          |                                                                                                 |
| Configurações | `GET/POST /modelos-etapa`, `PATCH /modelos-etapa/:id`                                                     |                                                                                                 |
| Responsáveis  | `GET /usuarios?perfil=TECNICO&ativo=true`                                                                 | ⚠ Só ADMIN acessa `/usuarios`, e um GESTOR que atribui responsável precisa dessa lista → **P7** |

### 11.3 Lacunas: contratos **propostos** (dependem de mudança no backend)

O prompt pede para não inventar contratos. Os itens abaixo **não existem** e só serão usados se
aprovados e implementados no backend (decisão D2).

| ID     | Necessidade (prompt)                                                        | Contrato proposto                                                                                                                                                                                                | Sem ele, o front...                                                      |
| ------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **P1** | Dashboard: ocorrências ativas, etapas pendentes, entregas previstas         | `GET /dashboard/indicadores` → `{ data: { porStatus: {ABERTA: n, …}, atrasadas, ocorrenciasAtivas, etapasEmAndamento, etapasAtrasadas, entregasProximos7Dias } }` (ADMIN, GESTOR, TECNICO, ATENDIMENTO)          | mostra só os indicadores obtidos pela listagem de OS                     |
| **P2** | Lista de OS: etapa atual, responsável, ordenação, busca por nome de cliente | Na listagem `GET /ordens-servico`, incluir `etapaAtual: { nome, status, responsavel: { id, nome } \| null }` e aceitar `?ordenarPor=numero\|dataEntrada\|previsaoEntrega&direcao=asc\|desc` e `?cliente=<texto>` | oculta as colunas e a ordenação, e busca cliente por seletor             |
| **P3** | Menu "Ocorrências" global                                                   | `GET /ocorrencias?status&tipo&prioridade&responsavelId&page` (paginado, internos)                                                                                                                                | ocorrências só dentro da OS                                              |
| **P4** | Menu "Documentos" global e "Relatórios"                                     | `GET /documentos?status=PENDENTE&page` (fila de aprovação); relatórios fora de escopo                                                                                                                            | documentos só dentro da OS; sem "Relatórios"                             |
| **P5** | Descrição da etapa no portal                                                | Incluir `descricao` em `etapas` de `/cliente/ordens/:id/acompanhar`                                                                                                                                              | usa texto institucional fixo por código de etapa                         |
| **P6** | "Em retrabalho" na timeline                                                 | Incluir `emRetrabalho: boolean` por etapa no portal (etapa reaberta ou com ocorrência `RETRABALHO` aberta e visível)                                                                                             | não exibe "Em retrabalho"                                                |
| **P7** | GESTOR atribuir responsável sem acessar `/usuarios`                         | `GET /usuarios/responsaveis` → `[{ id, nome, perfil }]` dos TECNICO/GESTOR ativos (ADMIN, GESTOR)                                                                                                                | GESTOR precisa digitar ou colar o id (inaceitável) → **P7 é necessária** |
| **P8** | Logout no servidor (prompt cita `POST /auth/logout`)                        | Só faz sentido com cookie (D1): `POST /auth/logout` limpa o cookie                                                                                                                                               | com token em memória, o logout é só no cliente                           |
| **P9** | Ocorrência no portal: título e previsão de resolução                        | Não recomendado: o título é interno (RN31) e não existe previsão de resolução no modelo                                                                                                                          | mostra o texto para o cliente, a situação e as datas                     |
| —      | Recuperação de senha                                                        | Fora do escopo (exige envio de e-mail)                                                                                                                                                                           | opção oculta no login                                                    |

**Recomendação:** implementar **P1, P2, P5 e P7** (pequenas e de alto valor) e **P8** se D1 = cookie.
P3, P4 e P6 ficam como evolução. P9 não é recomendado.

## 12. Estratégia de autenticação

**Situação real:** o backend devolve o JWT no corpo do login e o espera no cabeçalho
`Authorization: Bearer`. Não há cookies.

| Opção                                     | Como                                                                                                                                                                                                                                 | Segurança                                                                                                                                          | Custo                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **A (recomendada)** Cookie HttpOnly       | O login define o cookie `bt_sessao` (HttpOnly, SameSite=Strict, Secure em produção, `Path=/api`); `authenticate` aceita cookie **ou** Bearer; `POST /auth/logout` limpa o cookie; CORS com `credentials` só para as origens listadas | O token **nunca** fica acessível ao JavaScript, então um XSS não o rouba. SameSite=Strict mais o CORS restrito mitigam CSRF.                       | Mudança pequena no backend (+ testes); fetch com `credentials: 'include'` |
| **B** Token em memória + `sessionStorage` | Token no AuthContext; cópia no `sessionStorage` só para sobreviver ao F5; apagado ao fechar a aba                                                                                                                                    | Um XSS consegue ler o `sessionStorage`. Mitigado por CSP estrita, nenhum `dangerouslySetInnerHTML`, validade de 8 h e revogação na troca de senha. | Nenhuma mudança no backend                                                |
| ~~C~~ `localStorage`                      | —                                                                                                                                                                                                                                    | Persiste entre sessões e fica exposto a XSS indefinidamente                                                                                        | **Descartada** (o prompt também desaconselha)                             |

Comum às duas opções:

- recuperação da sessão com `GET /auth/me` no carregamento;
- qualquer 401 → limpa a sessão e redireciona para `/login?expirada=1`, com a mensagem "Sua sessão expirou";
- a senha só existe no estado do formulário e é descartada após o envio, **nunca** gravada;
- `RoleRoute` redireciona por perfil, mas **a autorização real é do backend**.

## 13. Responsividade (mobile-first)

| Breakpoint | Largura   | Comportamento                                                                                                                |
| ---------- | --------- | ---------------------------------------------------------------------------------------------------------------------------- |
| base       | < 640 px  | Uma coluna; timeline vertical; tabelas como cards; sidebar em gaveta; botões de largura total nos formulários; alvos ≥ 44 px |
| `sm`       | ≥ 640 px  | Filtros em 2 colunas                                                                                                         |
| `md`       | ≥ 768 px  | Indicadores em 2–3 colunas; ocorrências e documentos lado a lado no portal; tabelas a partir daqui                           |
| `lg`       | ≥ 1024 px | Sidebar fixa; **timeline horizontal**; detalhe da OS em 3 cards                                                              |
| `xl`       | ≥ 1280 px | Indicadores em 5 colunas                                                                                                     |

Dispositivos de referência para a validação na Fase 6: 360×800 (smartphone), 768×1024 (tablet), 1366×768 (notebook) e 1920×1080 (desktop).

## 14. Acessibilidade (meta: WCAG 2.1 AA)

- Contraste verificado (§2). Status sempre com texto, não só com cor.
- Todos os campos com `<label>`; erros ligados por `aria-describedby` e anunciados.
- Navegação completa por teclado; foco visível (`ring-2 ring-blue-600 ring-offset-2`); link "Pular para o conteúdo".
- Modais com foco preso, Esc fecha e o foco volta ao gatilho.
- Timeline como lista ordenada, com `aria-current="step"` na etapa atual.
- Toasts em região `aria-live`. Carregamento com `aria-busy`.
- `prefers-reduced-motion` respeitado.

## 15. Critérios de aceite

### Gerais

- [ ] Nenhuma URL da API fora do `services/api.ts`; base vinda de `VITE_API_URL`.
- [ ] Toda tela que consome a API tem estados de carregamento, erro (com "Tentar novamente"), vazio e sucesso; nenhuma tela em branco em falha de rede.
- [ ] Ações de gravação desabilitam o botão durante o envio (sem envio duplicado) e mostram toast de resultado.
- [ ] Nenhum dado mockado, valor de progresso fixo ou contrato inventado.
- [ ] `tsc` e lint limpos; `any` proibido.

### Portal do cliente

- [ ] O cliente vê só as próprias OS; uma OS de outro cliente (via URL) mostra "Ordem não encontrada".
- [ ] A timeline mostra as etapas reais da OS, na ordem, com os 5 estados visuais distinguíveis também sem cor.
- [ ] O progresso é igual a concluídas ÷ (total − dispensadas), confere com a API e é arredondado para inteiro.
- [ ] O download de documento funciona sem expor caminho nem token na URL.
- [ ] Não existe nenhum controle de edição no portal.

### Painel

- [ ] O menu e as ações correspondem à matriz do §8, para cada perfil.
- [ ] A lista de OS filtra por placa, cliente, status, período e atraso; pagina; os filtros persistem na URL.
- [ ] As ações de etapa respeitam as regras do backend; um 422 mostra a mensagem e a regra (ex.: RN09); o RN17 lista as pendências.
- [ ] Ações com justificativa exigem o texto antes de enviar; cancelamento pede confirmação.
- [ ] Os formulários validam no cliente (as mesmas regras do backend) e mostram os erros 400 da API no campo certo.

### Autenticação

- [ ] Login, logout e recuperação da sessão ao recarregar a página.
- [ ] Sessão expirada (401) leva ao login com aviso.
- [ ] O token nunca vai para o `localStorage`; a senha nunca é persistida.

### Qualidade (Fase 6)

- [ ] Testes (Vitest + RTL) para login, logout, rotas protegidas, timeline (concluídas/pendentes), carregamento, falha de API, filtros, formulários, atualização de status e permissões.
- [ ] Validado nos 4 tamanhos de tela de referência e navegável só por teclado.

## 16. Próximos passos

1. Você decide **D1–D4** (§0).
2. Se D2 = estender o backend: uma fase curta no backend (P1, P2, P5, P7 e, com D1 = cookie, a autenticação por cookie com P8), com testes, mantendo os 206 testes atuais passando.
3. **Fase 2 do front:** projeto Vite + React + TypeScript + Tailwind + React Router, `api.ts` e serviços tipados.
