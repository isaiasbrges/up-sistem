# Guia canônico de componentes

Paleta e materiais atuais: [DESIGN.md](../DESIGN.md). Exemplos: [catálogo](../index.html). Os nomes de classes legados são preservados. Rótulos opcionais de IA nas referências não ativam IA no aplicativo.

# Software UP — Guia de componentes

**Escopo da primeira versão (28/10/2026):** sem IA. Componentes e rótulos de IA citados neste catálogo são referências do escopo original e não são usados no produto atual.

Cada componente tem um exemplo em `design-system/references/components/<Componente>.html`. As classes vêm de `design-system/components/up.css`; ícones e formatadores, de `up.js`.

# Fundamentos

## Logo

Exemplo: `design-system/references/components/Logo.html`

A logo UP original, em duas formas: a assinatura completa (símbolo + "Universo do Propósito") e o símbolo sozinho.

- **Assinatura:** login, e-mails e materiais institucionais, com pelo menos 120px de largura.
- **Símbolo:** sidebar (28px de altura), header do celular (24px) e onde houver pouco espaço, com no mínimo 20px.
- **Cores:** só os arquivos fornecidos, branco sobre `surface-inverse` e preto sobre `bg-canvas` ou `surface`.
- **Área de proteção:** a altura da seta ↗ do símbolo, livre em todos os lados.

**Não faça:** recolorir de azul de ação ou laranja; aplicar sombra, contorno ou efeito; distorcer; colocar sobre foto; recriar a logo em texto.

## Icons

Exemplo: `design-system/references/components/Icons.html`

Conjunto de ícones UP: 44 ícones de traço numa grade de 24px, com traço de 1,75 e pontas arredondadas.

**Uso:** `<span class="up-icon" data-icon="chart-bar"></span>` com `components/bundle.js` (`UP.hydrate()`), ou `UP.icon('chart-bar', 20)` para gerar o SVG. O ícone herda `currentColor`. Os arquivos do grupo **Icons** são SVGs com traço `brand-black`, para uso em `<img>`.

**Tamanhos:** `icon-sm` 16, `icon-md` 20 e `icon-lg` 24. Não redimensione para valores intermediários.

**Ícones com significado fixo:** `home` Início · `clipboard-check` Diagnóstico · `chart-bar` Raio-X · `crown` Kit UP · `book-open` Kit Essencial · `trending-up`/`trending-down` faturamento e saídas · `wallet` finanças · `history` Histórico · `lock` bloqueado · `circle-check` verde/concluído · `triangle-alert` amarelo/atenção · `octagon-alert` vermelho/erro · `pen-line` texto com IA · `arrow-up-right` link externo (compra do Kit).

**Faltou um ícone?** Use o equivalente do Lucide (mesmos nomes e mesma grade) com `stroke-width="1.75"` e acrescente-o a este conjunto.

## Grid

Exemplo: `design-system/references/components/Grid.html`

Colunas, margens e gutters de cada breakpoint. É o esqueleto que alinha todas as telas.

- **Celular** (base): 4 colunas, margem de `space-4` e gutter de `space-4`.
- **Tablet** (`bp-md`, 768): 8 colunas, margem de `space-6` e gutter de `space-5`.
- **Desktop** (`bp-lg`, 1024): `sidebar-width` + 12 colunas, margem de `space-8`, gutter de `space-5` e conteúdo até `content-max`.

Use `up-page`, `up-grid` e `up-col-lg-4/5/6/7/8` e `up-col-md-4`. No Início desktop, as linhas são 4 + 8 (destaque e indicadores), 8 + 4 (gráfico e Radar) e 7 + 5 (ações e Roda). Formulários usam `form-max` e leitura longa usa `reading-max`. O grid nunca aparece na interface.

## States

Exemplo: `design-system/references/components/States.html`

Matriz dos estados de interação, com os mesmos tokens em todos os componentes.

- **Hover:** um passo mais escuro (`primary-hover`) ou a camada `state-hover`. Sobre preto, `state-hover-inverse`.
- **Pressionado:** `primary-active` ou `state-pressed`.
- **Foco:** anel sólido de 2px (`border-2`) em `focus-ring`, afastado 2px, só com `:focus-visible`. Sobre `surface-inverse`, `focus-ring-inverse`. Nunca remova o foco sem pôr outro no lugar.
- **Selecionado:** `primary` com `primary-subtle`.
- **Erro:** `danger` no contorno e mensagem em `danger-text`.
- **Desativado:** `surface-muted` e `text-disabled`, sem hover.
- **Bloqueado por acesso:** continua clicável e leva à oferta (veja LockedState).

As classes `is-hover`, `is-active` e `is-focus` existem só para mostrar os estados nesta documentação. No produto, quem dispara os estados são as pseudo-classes.

# Ações

## Button

Exemplo: `design-system/references/components/Button.html`

O botão dispara uma ação. Todo botão é uma pílula (`radius-full`), e cada tela tem no máximo um primário.

**Variantes**
- `up-btn--primary` (azul de ação): a ação para a qual a tela existe. Uma por tela.
- `up-btn--dark` (preto): ação forte de apoio ao lado do primário ou dentro do card de destaque ("Novo mês"), e o botão do Kit na sidebar.
- `up-btn--white` (branco com sombra leve): só sobre fundos coloridos, como o card de destaque azul de ação ("Ver Raio-X").
- `up-btn--secondary`: ações de mesmo nível sobre fundo claro ("Ver resultado", "Exportar CSV").
- `up-btn--ghost`: ações de apoio ("Cancelar", "Refazer", "Voltar").
- `up-btn--accent` (laranja): só para a compra do Kit, no banner do plano (Início) e na página do Kit.
- `up-btn--danger`: só no admin, para ações destrutivas, sempre com confirmação.
- `up-btn--link`: ação em linha com o texto ("Reenviar código").

**Tamanhos:** sem modificador, o botão tem 48px no celular e 40px a partir de `bp-lg`. Para fixar, use `up-btn--lg` (48), `up-btn--md` (40) ou `up-btn--sm` (32, em rodapé de card, sidebar e admin). `up-btn--block` ocupa a largura toda e é o padrão da ação principal no celular.

**Ícones:** a seta ↗ (`arrow-up-right`), que é a mesma da logo, indica que o botão abre outra tela ou link. `plus` indica criar. O ícone fica à direita do texto quando indica destino e à esquerda quando representa a ação (copiar, baixar). Nunca mais de um ícone.

**Estados:** hover, pressionado, foco (anel `focus-ring`), desativado e carregando (`is-loading` + `up-spinner` + `aria-busy="true"`, com o rótulo no gerúndio: "Enviando").

```html
<button class="up-btn up-btn--primary up-btn--block">Enviar código</button>
<a class="up-btn up-btn--white" href="/raio-x">Ver Raio-X <span class="up-icon" data-icon="arrow-up-right"></span></a>
<a class="up-btn up-btn--dark" href="/raio-x/novo">Novo mês <span class="up-icon" data-icon="plus"></span></a>
```

**Não faça:** dois primários lado a lado; botão branco sobre fundo claro; botão laranja fora da compra do Kit; botão retangular.

## IconButton

Exemplo: `design-system/references/components/IconButton.html`

Botão só com ícone, em círculo, para ações óbvias e repetidas em pouco espaço: voltar, fechar, mais opções, adicionar, sair.

**Variantes:** fantasma (padrão); `--secondary` (círculo com o gradiente suave e brilho, o mais usado em cards); `--primary` (azul de ação, adicionar item); `--dark` (preto); `--white` (sobre o card de destaque); `--inverse` (sobre fundo preto, na sidebar do admin).

**Tamanhos:** 48px no celular e 40px no desktop. Também há `--sm` (32), `--md` e `--lg`. A área de toque nunca fica abaixo de 44px no celular.

**Acessibilidade:** `aria-label` é obrigatório e descreve a ação ("Voltar", "Copiar mensagem", "Sair"), não o ícone.

```html
<button class="up-icon-btn up-icon-btn--secondary" aria-label="Copiar mensagem"><span class="up-icon" data-icon="copy"></span></button>
```

# Campos

## TextField

Exemplo: `design-system/references/components/TextField.html`

Campo de texto com rótulo visível, ajuda e erro, usado no login, no Raio-X e em todo formulário.

**Anatomia:** `up-field` > `up-label` + `up-control` (contorno) > `up-input` + `up-hint` ou `up-hint--error`. Opcionais dentro do controle: `up-affix` (R$), `up-affix--end` (%, mês) e `up-unit` (alternar R$ / % do faturamento).

**Tipos usados no produto**
- E-mail do login: `type="email" inputmode="email" autocomplete="email"`, com a ajuda "Use o mesmo e-mail da sua compra na Kiwify".
- Valor em reais: prefixo `R$`, `inputmode="decimal"`, `up-input--num`. Mostre com centavos (`48.000,00`).
- R$ ou %: `up-unit` com dois botões `aria-pressed`. Quando o valor for em %, a ajuda mostra o equivalente em reais ("Equivale a R$ 2.880,00 por mês").
- Todo campo do Raio-X tem, logo abaixo, a opção "Estimativa, conferir depois" (`up-check--sm`). Valores marcados assim aparecem com o selo "Estimativa" no resultado.
- Calculado: `is-readonly` com uma ajuda que diz de onde vem o número.

**Tamanhos:** 48px no celular e 40px a partir de `bp-lg`. O texto digitado fica sempre em 16px.

**Estados:** hover (`border-control-hover`), foco (contorno `primary` de 2px), erro (`is-invalid` + `aria-invalid="true"` + mensagem com ícone ligada por `aria-describedby`), desativado (`is-disabled`) e somente leitura (`is-readonly`).

**Validação:** valide ao sair do campo e ao enviar, nunca a cada tecla. A mensagem diz como corrigir.

```html
<div class="up-field">
  <label class="up-label" for="a1">Faturamento médio por mês</label>
  <div class="up-control"><span class="up-affix">R$</span><input class="up-input up-input--num" id="a1" inputmode="decimal"></div>
  <label class="up-check up-check--sm"><input class="up-checkbox" type="checkbox">Estimativa, conferir depois</label>
</div>
```

**Não faça:** usar o placeholder como rótulo; deixar o rótulo dentro do campo; marcar campo obrigatório com asterisco (marque o opcional com "(opcional)").

## Select

Exemplo: `design-system/references/components/Select.html`

Lista nativa para escolher uma opção entre muitas fixas, como o tipo de negócio, a categoria de um lançamento ou se a dívida é da empresa ou pessoal.

**Quando usar:** com 5 ou mais opções, ou quando o espaço é curto. Com até 4 opções visíveis e importantes, prefira `Radio` (cartões de opção ou segmentado), que mostra tudo de uma vez.

**Markup:** o `select` nativo dentro de `up-control`, com `up-control__chevron`. O nativo garante teclado, leitor de tela e a roda de seleção do celular.

```html
<div class="up-field">
  <label class="up-label" for="tipo">Tipo de negócio</label>
  <div class="up-control">
    <select class="up-select" id="tipo"><option>Serviço</option><option>Comércio</option><option>Autônomo</option><option>Profissional liberal</option><option>Outro</option></select>
    <span class="up-control__chevron"><span class="up-icon" data-icon="chevron-down"></span></span>
  </div>
</div>
```

**Estados:** os mesmos de `TextField` (hover, foco, erro, desativado).

**Opções:** use só as listas da especificação. Faixas que ainda não foram definidas (faturamento mensal, tempo de negócio, tamanho da equipe) não ganham valores inventados.

## Textarea

Exemplo: `design-system/references/components/Textarea.html`

Campo de texto livre de várias linhas, usado nas evidências da Roda e do Radar e no campo aberto de "maior dificuldade".

**Regras:** rótulo e pergunta de apoio ficam acima do campo (a pergunta vai em `up-hint`, ligada por `aria-describedby`). A altura inicial é de 112px e cresce na vertical. Marque "(opcional)" quando o campo não for obrigatório. Não mostre contador sem um limite definido.

```html
<div class="up-field">
  <label class="up-label" for="ev">Evidência</label>
  <p class="up-hint" id="ev-h">O que aconteceu nos últimos 90 dias que justifica essa nota?</p>
  <div class="up-control up-control--area"><textarea class="up-textarea" id="ev" aria-describedby="ev-h"></textarea></div>
</div>
```

## CodeInput

Exemplo: `design-system/references/components/CodeInput.html`

Seis campos numéricos para o código de acesso enviado por e-mail. É a única forma de entrar, porque não existe senha.

**Comportamento**
- Cada caixa aceita um dígito e avança sozinha. Apagar volta para a caixa anterior.
- Colar ou preencher automaticamente o código inteiro distribui os dígitos pelas caixas. Use `inputmode="numeric"` e `autocomplete="one-time-code"` na primeira caixa.
- Ao completar os 6 dígitos, valide sem esperar o clique.
- "Reenviar código" começa desativado com a contagem ("Reenviar código em 0:42") e é liberado depois de 60 segundos.
- Código errado: contorno `danger` em todas as caixas e mensagem com `role="alert"`. Depois de 5 erros, o código é invalidado: explique e ofereça reenviar.
- A ajuda informa o e-mail mascarado e a validade de 10 minutos.

**Tamanho:** caixas de 56px de altura e até 56px de largura, que encolhem para caber em 320px.

```html
<div class="up-field" role="group" aria-labelledby="code-l">
  <span class="up-label" id="code-l">Código de acesso</span>
  <div class="up-code">
    <input class="up-code__cell" inputmode="numeric" autocomplete="one-time-code" maxlength="1" aria-label="Dígito 1 de 6">
    <!-- … 6 caixas -->
  </div>
</div>
```

## Checkbox

Exemplo: `design-system/references/components/Checkbox.html`

Marca um item independente: a opção "estimativa, conferir depois", "está em atraso?" ou o aceite dos termos no primeiro acesso.

**Tamanhos:** o padrão tem caixa de 20px e texto de 16px, com área de toque de 44px pelo padding. `up-check--sm` tem caixa de 18px e texto de 14px, para opções secundárias abaixo de um campo.

**Estados:** desmarcado, marcado (`primary`), indeterminado (selecionar todos), foco, hover e desativado.

**Regras:** o rótulo inteiro é clicável (o `input` fica dentro do `label`). A descrição vai em `up-check__desc`. O aceite dos termos nunca vem pré-marcado.

```html
<label class="up-check"><input class="up-checkbox" type="checkbox">Está em atraso?</label>
```

## Radio

Exemplo: `design-system/references/components/Radio.html`

Uma escolha entre opções que se excluem, em quatro formas.

- **Opção em cartão (`up-option`)**: perguntas do Diagnóstico com respostas em frase ("Qual é hoje a sua maior dificuldade?"). Mostre todas as opções, uma por linha. A opção escolhida ganha contorno `primary` e fundo `primary-subtle`.
- **Segmentado (`up-segmented`, `role="radiogroup"`)**: de 2 a 4 respostas curtas lado a lado ("Sim / Às vezes / Não", "Entrada / Saída"). Use `up-segmented--block` no celular.
- **Escala de 0 a 10 (`up-scale`)**: notas da Roda da Plenitude e do Radar da Estrutura. São 11 botões `role="radio"` que cabem em 320px. Não acrescente rótulos de âncora ("ruim", "ótimo") que não estejam na especificação.
- **Radio simples (`up-radio`)**: listas curtas em formulários densos e no admin.

**Teclado:** num grupo, Tab entra na opção escolhida e as setas trocam a escolha (*roving tabindex*).

```html
<div class="up-segmented up-segmented--block" role="radiogroup" aria-labelledby="d3">
  <button class="up-segmented__item" role="radio" aria-checked="true">Sim</button>
  <button class="up-segmented__item" role="radio" aria-checked="false">Às vezes</button>
  <button class="up-segmented__item" role="radio" aria-checked="false">Não</button>
</div>
```

# Conteúdo

## Card

Exemplo: `design-system/references/components/Card.html`

O card agrupa um assunto numa superfície branca, com cantos de `radius-lg` (20px) e borda fina. Use para separar assuntos, não para enfeitar.

**Variantes**
- `up-card`: base, com `up-card__head` (título `up-card__title` e uma ação ou link à direita) e `up-card__foot` (data à esquerda e ação à direita, separados por uma linha).
- `up-card--glow`: gradiente vertical suave (`surface-glow-start` → `surface-glow-end`) com brilho interno (`shadow-glow`). Use no máximo um ou dois por tela, para o conteúdo de apoio que merece destaque neutro, como o Radar no Início.
- `up-card up-tool`: card de ferramenta. Ícone em círculo e selo no topo, título e descrição, um resumo e o rodapé com a ação.
- `up-card--interactive`: o card inteiro é um link. Mostra borda mais forte e `shadow-sm` no hover.
- `up-card--compact`: padding de `space-4`, para indicadores em grade.

**Ícone em ladrilho (`up-tile`):** quadrado macio de 44px (`radius-md`), com o gradiente suave por padrão. Variantes de cor: `--primary` (ferramentas), `--accent` (Kit e destaques), `--solid` e `--solid-accent` (preenchidos), `--success`, `--warning` e `--danger` (status), `--muted` (bloqueado), `--inverse` e `--hero`. Também há `--round` (círculo, no banner do plano) e os tamanhos `--sm` (32) e `--lg` (52).

**Padding:** `space-5` no celular e no tablet e `space-6` no desktop, igual em todos os lados.

**Regras:** não coloque card dentro de card (use `up-card--subtle`, `up-actionlist` ou um divisor). Cards da mesma linha têm a mesma altura. Use no máximo duas ações no rodapé. Use "Ver todos ↗" (`up-link-arrow`) no cabeçalho para levar ao detalhe.

```html
<section class="up-card">
  <div class="up-card__head"><h2 class="up-card__title">Indicadores de outubro</h2><a class="up-link-arrow" href="/raio-x">Ver todos <span class="up-icon" data-icon="arrow-up-right"></span></a></div>
  …
</section>
```

## PlanBanner

Exemplo: `design-system/references/components/PlanBanner.html`

Banner que diz ao aluno o que ele tem liberado e qual é o próximo produto. Use um por tela, só no Início, ao lado da saudação.

**Estados, que vêm do acesso real (tabela de acessos):**
- **Só o produto principal:** "Diagnóstico e Raio-X liberados", com coroa em `up-tile--accent` e botão `up-btn--accent` "Conhecer o Kit", que leva ao link de compra configurado no admin.
- **Kit Essencial:** "Kit Essencial ativo", com o que falta (itens 3 a 5) e o mesmo botão laranja.
- **Kit UP de Implementação:** "Você está no Kit UP de Implementação", com coroa em `up-tile--solid-accent` e botão secundário "Abrir o Kit". Sem venda.
- **Acesso encerrado** (reembolso, chargeback ou revogação): ícone `lock` neutro, "os dados continuam guardados" e "Falar com o suporte".

**Anatomia:** `up-plan` (gradiente suave) > `up-tile` redondo de 56px + `up-plan__title` + `up-plan__text` + um botão. No celular, o botão ocupa a largura toda embaixo.

**Regras:** o botão laranja deste banner é o único botão de destaque permitido fora da página do Kit. Nunca mostre preço que não venha do admin.

## HeroCard

Exemplo: `design-system/references/components/HeroCard.html`

Card de destaque em azul de ação (`surface-hero`) com o número mais importante da tela e as duas ações que levam adiante. Use um por tela.

**Anatomia:** rótulo (`up-hero__label`), valor em `figure-xl`, contexto e selo do semáforo, e até duas ações (`up-btn--white` e `up-btn--dark`). Ao fundo ficam as formas da marca, tom sobre tom (`hero-shape`, `hero-shape-strong`): um bloco chanfrado a 45° e a seta ↗ do símbolo UP.

**Variantes:**
- **Horizontal:** ações lado a lado, para colunas de 4 ou mais.
- **Empilhada (`up-hero--stack`):** para colunas de 3. As ações ficam uma sobre a outra, e a mini evolução dos últimos 6 meses (`up-hero__spark`) aparece com barras brancas para os meses positivos e laranja para os negativos.

**Onde usar:** no Início e no resultado do Raio-X, com a sobra após dívidas; no resultado do Diagnóstico, com o gargalo. Sem Raio-X salvo, vira o convite "Faça seu primeiro Raio-X".

**Regras:** texto só em `text-on-hero` ou `text-on-hero-muted`, e nunca texto de apoio sobre `hero-shape-strong`. Nada de foto, ilustração ou gradiente colorido.

## Indicator

Exemplo: `design-system/references/components/Indicator.html`

Mostra um número calculado pelo código: rótulo, valor, contexto e, quando houver, o semáforo.

**Formas**
- `up-metrics`: de 2 a 4 indicadores em linha, separados por divisórias verticais dentro de um card ("Indicadores de outubro"). Cada item tem ícone em círculo, rótulo, valor em `figure-lg` e o selo do semáforo com o contexto. No celular, os itens se empilham com divisórias horizontais. Defina o número de colunas com `style="--cols:3"`.
- `up-stat` em `up-card--compact`, com `up-stats`: um indicador por card, em grade.
- `up-ministats`: até três indicadores dentro de um card de ferramenta.
- `up-signals`: a lista do semáforo, com nome, valor e selo.
- `up-meter`: a contagem do semáforo, sempre com texto ao lado ("1 verde, 3 amarelos, 2 vermelhos").

**Regras**
- Mostre só os indicadores da especificação: custos de cada venda, margem de contribuição, custos fixos, resultado da operação, sobra mensal, sobra após dívidas, ticket médio, ponto de equilíbrio, folga, meses de reserva, peso das parcelas e se a retirada cobre a casa. As médias da Roda e do Radar têm uma casa decimal.
- O número mais importante da tela não vai aqui: vai no `HeroCard`.
- Se a margem de contribuição for zero ou negativa, não mostre o ponto de equilíbrio. Mostre o alerta "cada venda custa mais do que rende".
- Valores marcados como estimativa levam o selo "Estimativa". Os limites do semáforo vêm do admin.

## ActionList

Exemplo: `design-system/references/components/ActionList.html`

Lista numerada de ações ou passos em ordem de prioridade. Mostra as "três primeiras ações" do Raio-X e os "3 primeiros passos" da leitura do Diagnóstico.

**Forma:** cada item é uma caixa `surface-subtle` com borda fina, com o número em círculo preto ("01", "02") e o texto em 15px. `up-actionlist__meta` diz qual dado gerou a ação.

**Regras:** no máximo três itens, na ordem das regras. No Início e na leitura do Raio-X, use os textos definidos pelas regras, sem geração externa ou rótulo de IA. Se nenhuma regra se aplicar, troque a lista pelo alerta de sucesso com o texto fixo ("Seus números estão saudáveis…").

## NextSteps

Exemplo: `design-system/references/components/NextSteps.html`

Os próximos passos do aluno, em ordem, cada um levando à tela onde ele age. No Início, é a versão compacta das ações do Raio-X mais a recomendação do gargalo.

**Item (`up-steps__item`):** número em quadrado macio, título curto no imperativo, uma linha de contexto com o dado que gerou o passo e uma seta. O primeiro passo (`is-next`) tem o número em azul de ação.

**Fonte dos passos:** as ações do Raio-X na ordem de prioridade da especificação (no máximo duas) e a recomendação fixa do gargalo ("Finanças: Módulo 2, aula 2.2"). As aulas ficam na Kiwify: o passo da aula é só texto e não abre conteúdo dentro do Software UP.

## ResultList

Exemplo: `design-system/references/components/ResultList.html`

Lista dos últimos resultados salvos (diagnósticos e Raio-X), com tipo, data e uma ação.

**Item (`up-result`):** ícone da ferramenta, nome, selo do tipo ("Refeito", "Inicial", mês do Raio-X), data e um botão `sm`. O mais recente usa o botão primário "Abrir". Os outros usam o secundário ("Abrir", "Comparar").

**Regras:** no máximo três itens no Início, com "Ver histórico" no cabeçalho para a lista completa. Um diagnóstico inicial com um refeito depois oferece "Comparar", que abre a comparação inicial × atual.

## Badge

Exemplo: `design-system/references/components/Badge.html`

Selo curto de status, em pílula e sempre com palavra. Ícone e cor reforçam a palavra, nunca a substituem.

**Famílias**
- **Semáforo:** `--success` "Verde" (`circle-check`), `--warning` "Amarelo" (`triangle-alert`) e `--danger` "Vermelho" (`octagon-alert`).
- **Andamento:** "Concluído", "Em andamento" (`--info`), "Não iniciado", "Inicial" e "Refeito" (`--outline`) e "Estimativa" (`--warning`).
- **Acesso:** "Ativo", "Bloqueado" (com `lock`), "Reembolsado", "Chargeback" e "Revogado". "Kit UP" usa `--accent`.
- **Destaque de nota:** "Gargalo" e "Cuidado" em `--accent --sm`, ao lado da menor nota.
- **Sobre o azul de ação:** `--on-hero`, para datas e períodos dentro do card de destaque.
- **Rótulo de IA (`up-ai-label`)** e **ponto (`up-dot`)**, só em legendas.

**Tamanhos:** 26px (padrão) e `--sm` com 22px, dentro de indicadores e listas.

# Gráficos

## RingChart

Exemplo: `design-system/references/components/RingChart.html`

Anel com uma média de 0 a 10 e, ao lado, as notas que formam essa média. No Início, mostra a média do Radar da Estrutura e as quatro áreas.

**Anatomia:** `up-ringrow` > `up-ring` (SVG: trilho em `chart-track` e arco em `chart-primary`, com 14px de espessura e ponta arredondada) + `up-arealist`, com ícone, nome e nota "/10" de cada área. A área de menor nota recebe ícone laranja e o selo "Gargalo". O rodapé traz a média da Roda e a dimensão de cuidado.

**Regras:** o anel mostra sempre uma média real com uma casa decimal, nunca porcentagem de progresso ou de conclusão (não há gamificação no Software UP). O anel tem `role="img"` e `aria-label` ("Média do Radar: 5,5 de 10"). Em telas abaixo de 480px, o anel fica acima da lista. O tamanho é definido por `--ring` (152px no Início).

Ícones das áreas: Vendas `trending-up`, Pessoas `users`, Processos `sliders-horizontal`, Finanças `wallet`.

## LineChart

Exemplo: `design-system/references/components/LineChart.html`

Duas séries mês a mês, faturamento e saídas, com chips de resumo em cima. É a "Visão financeira" do Início, feita com os Raio-X salvos.

**Chips (`up-chips` > `up-chip`):** ícone em círculo (`chart-primary`, `chart-highlight` ou preto), nome, valor do mês e variação contra o mês anterior. A variação usa `success-text` quando é boa e `danger-text` quando é ruim (saídas subindo). O terceiro chip mostra o ponto de equilíbrio e a folga.

**Gráfico:** linhas de 2,5px em `chart-primary` (faturamento) e `chart-highlight` (saídas), com pontos de 4,5px de raio e anel branco de 2px. Embaixo do faturamento há um véu de 8%. A grade é de 1px em `chart-grid`. Uma linha vertical marca o mês atual, com um balão que mostra os dois valores. A legenda fica acima do gráfico.

**Dados:** as saídas são os custos de cada venda, mais os custos fixos, a retirada e as parcelas das dívidas da empresa, e a diferença para o faturamento é a sobra após dívidas. Só aparece com dois ou mais meses salvos.

**Acessibilidade:** o SVG tem `aria-label` descrevendo a tendência, e uma tabela `up-sr-only` traz todos os valores. No celular, gere o SVG com largura de 340 para o texto continuar legível.

## BarChart

Exemplo: `design-system/references/components/BarChart.html`

Gráfico de barras com eixo zero, para a evolução mês a mês do Raio-X (um Raio-X salvo por mês).

**Forma:** uma barra por mês, saindo de uma linha de base. Positivo sobe em `chart-primary` (azul de ação, "Sobrou") e negativo desce em `chart-highlight` (laranja, "Faltou"). As barras têm até 24px de largura, com ponta arredondada (`radius-xs`) só do lado do valor. A grade é de 1px em `chart-grid`, e o zero fica mais forte (`border-control`). Os rótulos do eixo são compactos ("1 mil", "−2 mil").

**Rótulos:** a legenda fica no cabeçalho do card. O mês atual fica em negrito no eixo e ganha um balão (`up-chart__tip`) com o valor. Os outros valores aparecem no hover (`title` em cada coluna) e numa tabela para leitores de tela (`up-sr-only`). Nunca coloque número em todas as barras.

**Outros usos:** as barras da Roda (8 dimensões) e do Radar (4 áreas), com a menor destacada, podem usar a mesma estrutura na vertical ou o `ScoreDots`.

**Regras:** um eixo só; nunca dois eixos Y. Com menos de dois meses salvos, não mostre o gráfico: mostre o texto "A evolução aparece a partir do segundo mês salvo". Cor nunca sozinha: legenda sempre presente e `aria-label` descrevendo a tendência.

## ScoreDots

Exemplo: `design-system/references/components/ScoreDots.html`

Notas de 0 a 10 da Roda da Plenitude e do Radar da Estrutura, em 10 pontos, com a menor nota destacada e a diferença para o diagnóstico inicial.

**Anatomia (`up-score`):** nome da dimensão ou área; nota em `figure-sm`; diferença (`up-score__delta`: verde quando sobe, `text-muted` quando fica igual, vermelho quando cai); e a linha de pontos (`up-dots`). Os pontos cheios usam `chart-primary` e os vazios usam `chart-track`.

**Menor nota:** pontos em `chart-highlight` (`up-dots--low`) e selo ao lado do nome. No Radar, o selo é "Gargalo" (a área confirmada no passo 3). Na Roda, o selo é "Cuidado" (a dimensão de cuidado). Em empate na Roda, todas as empatadas recebem o selo.

**Regras:** a média fica no cabeçalho do card, com uma casa decimal. A diferença só aparece se houver diagnóstico inicial e refeito. Os pontos têm `role="img"` e `aria-label="Nota 7 de 10"`.

```html
<li class="up-score"><span class="up-score__name">Finanças <span class="up-badge up-badge--sm up-badge--accent">Gargalo</span></span>
  <span class="up-score__nums"><span class="up-score__value">4</span><span class="up-score__delta">+2</span></span>
  <span class="up-dots up-dots--low" role="img" aria-label="Nota 4 de 10"><i class="on"></i>…<i></i></span></li>
```

# Navegação

## Tabs

Exemplo: `design-system/references/components/Tabs.html`

Alterna entre seções da mesma ferramenta sem sair da tela.

- **Abas sublinhadas (`up-tabs` + `up-tab`):** seções de uma área, como "Resumo do mês / Lançamentos / Contas a pagar / Plano das dívidas" no Raio-X automático. A aba ativa tem texto `text-primary` e sublinhado `primary` de 2px. Contadores opcionais vão em `up-tab__count`. No celular, a lista rola na horizontal sem barra visível.
- **Segmentado (`up-segmented` com `role="tablist"`):** de 2 a 3 vistas do mesmo conteúdo, como "Diagnóstico / Raio-X" no Histórico ou "Inicial / Atual / Comparar".

**Acessibilidade:** `role="tablist"`, `role="tab"` com `aria-selected` e `aria-controls`; as setas movem entre as abas. Se cada aba for uma página própria, use `aria-current="page"` em links.

**Não faça:** usar abas para etapas de formulário (isso é Stepper); usar mais de 5 abas; esconder em abas informação que o aluno precisa ver junta.

## Sidebar

Exemplo: `design-system/references/components/Sidebar.html`

Navegação fixa do desktop (a partir de `bp-lg`), escura (`up-sidebar--inverse`), com a logo completa da UP no topo.

**Aluno:** assinatura branca (132px) no topo; Início, Diagnóstico UP, Raio-X financeiro, Kit UP (com `crown` e cadeado quando não houver acesso) e Histórico; no rodapé, separados por uma linha, Minha conta, Ajuda e suporte e Sair.

**Admin:** símbolo branco, cartão do usuário e o grupo "Administração", com Alunos, Eventos da Kiwify, Produtos, IA, Conteúdo, Configurações e Relatórios. O perfil suporte vê só Alunos.

**Estados do item:** padrão (`text-inverse-secondary`); hover (`state-hover-inverse`); atual (`aria-current="page"`, numa pílula `primary` com texto branco); bloqueado (`is-locked`, ainda clicável); e foco (`focus-ring-inverse`).

**Regras:** largura de `sidebar-width`; rótulos curtos que nunca quebram linha. O banner do plano, no Início, faz a oferta do Kit, então a sidebar do aluno não repete o cartão. A versão clara (`up-sidebar` sem modificador) fica disponível para painéis internos.

## Header

Exemplo: `design-system/references/components/Header.html`

Barra superior e cabeçalhos de página.

- **Barra do painel no desktop (`up-topbar`):** trilha à esquerda ("Painel do aluno · Início") e, à direita, o perfil (`up-profile`: avatar, nome, papel "Aluno" e seta), que abre Minha conta e Sair.
- **Celular (`up-header`, 56px):** no Início, símbolo preto à esquerda e avatar à direita. Nas telas internas, botão "Voltar", título e mais opções.
- **Desktop interno (`up-header--desktop`):** trilha e até duas ações de página.
- **Saudação do Início (`up-greet`):** sobretítulo "Bem-vindo ao seu painel", título "Olá, João" com o nome em `primary` (`<em>`), sem exclamação, e uma frase de apoio.
- **Cabeçalho de página (`up-pagehead`):** título e descrição de até duas linhas.

**Não faça:** colocar busca global ou sino de notificações. A especificação não prevê busca nem notificações dentro do app (os avisos vão por e-mail).

## MobileNav

Exemplo: `design-system/references/components/MobileNav.html`

Barra de navegação inferior do celular e do tablet (abaixo de `bp-lg`), com as cinco áreas do aluno.

**Itens:** Início, Diagnóstico, Raio-X, Kit UP (`crown`) e Histórico, com ícone de 22px e rótulo `label-xs`. O item atual ganha uma pílula `primary-subtle` atrás do ícone, ícone `primary` e rótulo em negrito. Sem acesso ao Kit, o ícone ganha um pequeno cadeado e o leitor de tela ouve ", bloqueado".

**Regras:** fica fixa no rodapé (`z-nav`), com a área segura do aparelho somada à altura. Os rótulos não são cortados. "Minha conta" fica no avatar do Header.

## ProductCard

Exemplo: `design-system/references/components/ProductCard.html`

Atalho para uma área do aluno, com ícone, nome, uma linha de descrição e o estado. Fica numa fileira de quatro no Início (`up-products`).

**Itens do Início:** Diagnóstico UP (`clipboard-check`, azul de ação), Raio-X financeiro (`chart-bar`, laranja), Histórico (`history`, azul de ação) e Kit UP de Implementação (`crown`, laranja).

**Estados:**
- **Liberado:** selo com o estado real ("Refeito", "6 meses salvos", "3 registros").
- **Bloqueado (`is-locked`):** fundo `surface-subtle`, título em `text-secondary` e selo "Bloqueado" com cadeado. Continua clicável e leva à página do Kit, onde aparece a oferta.

**Comportamento:** o card inteiro é um link. No hover, ganha `shadow-md` e a seta no canto vira um círculo azul de ação (laranja, se estiver bloqueado).

**Responsivo:** quatro por linha a partir de 1280px, dois no tablet, e dois compactos no celular (só ícone, nome e selo, sem descrição).

```html
<a class="up-product" href="/diagnostico">
  <span class="up-tile up-tile--primary"><span class="up-icon" data-icon="clipboard-check"></span></span>
  <span class="up-product__body"><span class="up-product__title">Diagnóstico UP</span><span class="up-product__desc">O momento da sua vida e o gargalo da empresa.</span><span class="up-product__meta"><span class="up-badge up-badge--sm up-badge--success">Refeito</span></span></span>
  <span class="up-product__go"><span class="up-icon" data-icon="chevron-right"></span></span>
</a>
```

## Journey

Exemplo: `design-system/references/components/Journey.html`

As quatro etapas do método UP com o estado real do aluno: diagnosticar, entender os números, acompanhar a evolução e aplicar com o Kit.

**Estados de cada etapa:** `is-done` (círculo azul de ação com check, linha azul de ação até a próxima); `is-current` (anel azul de ação, a etapa em que o aluno está); pendente (anel cinza); e `is-locked` (cadeado, quando a etapa depende do Kit).

**Regras para calcular as etapas:**
- **Diagnosticar:** feita quando existe um diagnóstico.
- **Entender os números:** feita quando existe um Raio-X salvo.
- **Acompanhar a evolução:** atual quando há dois ou mais registros da mesma ferramenta.
- **Aplicar com o Kit:** bloqueada sem acesso ao Kit e liberada com ele.

O texto de cada etapa diz o fato ("Refeito em 12/10/2026", "6 meses de Raio-X salvos"). Este componente de referência é uma linha do tempo. A experiência gamificada do aplicativo é implementada em app/journey.js e inclui pontos, níveis e conquistas.

**Formas:** vertical (`up-journey`), para colunas estreitas e o celular, e em linha (`up-journey--row`), como faixa de largura total a partir de 768px.

# Feedback

## Alert

Exemplo: `design-system/references/components/Alert.html`

Mensagem na página sobre o que acabou de acontecer ou sobre algo que muda a leitura da tela.

**Variantes:** `--info` (código enviado), `--success` (salvo, acesso liberado), `--warning` (contas vencendo em 7 dias, regra que impede um cálculo), `--danger` (falha ao salvar) e `--neutral` (acesso encerrado). Cada uma tem seu ícone; o título resume e o texto diz o que fazer. Até duas ações em `up-alert__actions`.

**Também aqui:**
- `up-footnote`: os rodapés fixos do Diagnóstico e do Raio-X, com o texto exato da especificação, sempre no fim do resultado.
- `up-ai-label`: rótulo dos textos gerados por IA.

**Acessibilidade:** use `role="status"` para confirmações e `role="alert"` para erros que pedem ação. Não feche sozinho alertas que pedem ação.

**Não faça:** empilhar mais de um alerta; usar alerta para conteúdo permanente (isso é texto da página); escrever mensagens técnicas ("Erro 500").

## LockedState

Exemplo: `design-system/references/components/LockedState.html`

O que o aluno vê quando não tem acesso a um produto. O item continua visível, com cadeado e um caminho para a compra.

**Formas**
- **Painel (`up-lockpanel`):** a área do Kit para quem comprou só o produto principal. Mostra os cinco itens com cadeado, o botão "Conhecer o Kit" e o texto "Disponível no Kit UP de Implementação". Na página do Kit, o botão usa `up-btn--accent`. No Início e em outras telas, usa `up-btn--secondary`, para não competir.
- **Item (`up-locked`):** um item bloqueado no meio de itens liberados, como "Ofertas modelo" para quem tem o Kit Essencial. Borda tracejada, ladrilho `up-tile--muted` com `lock` e o botão `sm` secundário.
- **Lista mista:** itens liberados com `circle-check` e link, itens bloqueados com `lock` e ", bloqueado" para leitor de tela.
- **Acesso encerrado:** reembolso, chargeback ou revogação. Use `up-alert--neutral` e diga que os dados continuam guardados.

**Cartão do Kit (`up-promo`):** na sidebar do desktop e no fim do Início no celular, para quem não tem o Kit. Mostra o ícone, o nome, uma linha com os itens e o botão escuro "Conhecer o Kit ↗".

**Regras de acesso:** o produto principal libera o Diagnóstico e o Raio-X. O Kit Essencial libera os itens 1 e 2 do Kit. O Kit UP de Implementação libera os cinco itens. O link do botão vem do admin ("link de compra do Kit"). A interface só reflete o acesso: quem decide é o servidor.

**Não faça:** esconder o item bloqueado; usar o estado desativado (cinza, sem clique); mostrar preço que não venha do admin.

# Templates

## DashboardDesktop

Exemplo: `design-system/references/layouts/inicio-desktop.html`

Template do Início do aluno no desktop, em 1440px. Junta a estrutura do painel de referência com a linguagem macia do sistema, usando só componentes da biblioteca.

**Estado mostrado:** o aluno tem só o produto principal, salvou Raio-X de maio a outubro e refez o Diagnóstico (inicial em 05/05/2026, refeito em 12/10/2026).

**Estrutura, de cima para baixo:**
- `Sidebar` escura com a logo completa e a barra do painel (`Header` › `up-topbar`) com o perfil.
- Saudação (`up-greet`, 6 colunas) e `PlanBanner` (6 colunas).
- `ProductCard` × 4: Diagnóstico, Raio-X, Histórico e Kit (bloqueado).
- "Meu diagnóstico" com `RingChart` (5 colunas) e "Visão financeira" com `LineChart` (7 colunas).
- `HeroCard` empilhado com a sobra (3 colunas), `NextSteps` (5 colunas) e `ResultList` (4 colunas).
- `Journey` em linha, na largura total.

**Outros estados:**
- **Sem Diagnóstico:** o anel dá lugar a "Comece pelo Diagnóstico UP", com ação primária.
- **Sem Raio-X:** a visão financeira e o destaque viram o convite "Faça seu primeiro Raio-X".
- **Um Raio-X só:** sem gráfico de linhas; ficam só os chips.
- **Com Kit:** o banner mostra "Você está no Kit UP" e o card do Kit fica liberado.
- **Acesso encerrado:** o banner muda para o estado de acesso encerrado.

**Dados de exemplo:** coerentes com as fórmulas da especificação.

| Mês | Faturamento | Saídas | Sobra após dívidas |
|---|---|---|---|
| Mai | R$ 41.000 | R$ 42.850 | −R$ 1.850 |
| Jun | R$ 43.500 | R$ 44.420 | −R$ 920 |
| Jul | R$ 44.800 | R$ 45.110 | −R$ 310 |
| Ago | R$ 46.900 | R$ 46.660 | R$ 240 |
| Set | R$ 46.000 | R$ 46.150 | −R$ 150 |
| Out | R$ 48.000 | R$ 47.620 | R$ 380 |

Saídas de outubro: custos de cada venda R$ 18.720, custos fixos R$ 21.500, retirada R$ 6.000 e parcelas da empresa R$ 1.400. Ponto de equilíbrio: R$ 45.082 (folga de 6,1%). Radar: Vendas 7, Pessoas 6, Processos 5, Finanças 4 (gargalo), com média de 5,5 (+1,0 desde o inicial). Roda: média de 6,1, com cuidado em Saúde e energia.

## DashboardMobile

Exemplo: `design-system/references/layouts/inicio-celular.html`

Template do Início do aluno no celular, em 390px. Tem o mesmo conteúdo do desktop, numa coluna só e na ordem de importância.

**Ordem:** Header (símbolo e avatar), saudação, banner do plano, produtos (2 × 2 compactos), destaque da sobra com a mini evolução, visão financeira (chips empilhados e gráfico de linhas em 340px), meu diagnóstico (anel acima da lista), próximos passos, resultados recentes, jornada vertical e `MobileNav`.

**Regras:** margens de `space-4`, cards em largura total e botões do destaque empilhados. Nada exige rolagem horizontal.

