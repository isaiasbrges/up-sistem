# Fundamentos do UP

Fontes locais, licença OFL e escalas originais preservadas. Cores e materiais seguem DESIGN.md.

## Títulos

| Estilo | Tamanho / altura | Peso | Uso |
|---|---|---|---|
| display | 52px / 56px | 400 | Saudação do Início no desktop, em dois tons: "Olá," em text-muted e o nome em text-primary. Uma por tela. No celular, use title-1. |
| title-1 | 32px / 38px | 500 | Título de página no desktop e saudação no celular. |
| title-2 | 24px / 30px | 500 | Título de página no celular; título de seção no desktop. |
| title-3 | 20px / 26px | 600 | Título de seção no celular, de modal e de drawer. |
| title-4 | 16px / 22px | 600 | Título de card. |

## Números

| Estilo | Tamanho / altura | Peso | Uso |
|---|---|---|---|
| figure-xl | 48px / 52px | 500 | Número do card de destaque (up-hero). Um por tela. |
| figure-lg | 32px / 36px | 500 | Indicadores em linha (up-metrics) e o principal de uma seção. |
| figure-md | 24px / 30px | 500 | Valor de indicador em card e médias da Roda e do Radar. |
| figure-sm | 17px / 24px | 500 | Valores em linhas de lista e tabela quando precisam de peso. |

## Texto

| Estilo | Tamanho / altura | Peso | Uso |
|---|---|---|---|
| body-lg | 18px / 28px | 400 | Leitura longa: textos da IA, introdução de etapa do Diagnóstico. |
| body | 16px / 24px | 400 | Texto padrão de interface e valor digitado em campos (16px evita zoom no iOS). |
| body-sm | 14px / 20px | 400 | Descrições de card, células de tabela no desktop. |
| label | 14px / 20px | 500 | Rótulo de campo, texto de botão md, item de navegação. |
| label-sm | 13px / 18px | 500 | Selos, botão sm, rótulos da barra de navegação do celular. |
| label-xs | 12px / 16px | 500 | Rótulo da barra de navegação inferior do celular e selo sm. |
| caption | 13px / 18px | 400 | Ajuda de campo, rodapés fixos, datas. |
| overline | 12px / 16px | 600 | Sobretítulo de seção, sempre em maiúsculas (aplicar text-transform no CSS). Pouco e só no desktop. |

## spacing

| Token | Valor | Uso |
|---|---|---|
| space-1 | 4px | Ícone ↔ texto em selos; ajustes finos. |
| space-2 | 8px | Ícone ↔ texto em botões; entre rótulo e campo; entre selos. |
| space-3 | 12px | Entre itens de lista compacta; padding de selo md e alerta interno. |
| space-4 | 16px | Margem lateral do celular; padding de card no celular; gutter do grid no celular. |
| space-5 | 20px | Padding de card no tablet; entre campos de um formulário. |
| space-6 | 24px | Padding de card no desktop; gutter do grid a partir do tablet; margem lateral do tablet. |
| space-8 | 32px | Entre seções no celular; margem lateral do desktop. |
| space-10 | 40px | Entre seções no desktop. |
| space-12 | 48px | Topo de página no desktop; respiro de empty state. |
| space-16 | 64px | Respiro de telas de entrada (login, código). |

## radius

| Token | Valor | Uso |
|---|---|---|
| radius-xs | 6px | Checkbox, foco interno, barras de gráfico (ponta arredondada). |
| radius-sm | 8px | Itens de controle segmentado pequeno, unidade R$/%, tooltips. |
| radius-md | 12px | Campos, células do código, itens de navegação, opções em cartão, alertas internos. |
| radius-lg | 20px | Cards, alertas, painéis. |
| radius-xl | 28px | Card de destaque (up-hero), modais, drawers e a folha inferior do celular. |
| radius-full | 9999px | Botões (pílula), selos, avatar, radio, ícones em círculo, pontos de nota. |

## size

| Token | Valor | Uso |
|---|---|---|
| control-sm | 32px | Botões e campos densos do admin e filtros de tabela. Nunca como ação principal no celular. |
| control-md | 40px | Altura padrão de botões e campos no desktop. |
| control-lg | 48px | Altura padrão de botões e campos no celular e ação principal de formulário. |
| touch-min | 44px | Área mínima de toque de qualquer alvo no celular. |
| icon-sm | 16px | Ícone em selos, botão sm e ajuda de campo. |
| icon-md | 20px | Ícone em botões md/lg, navegação e alertas. |
| icon-lg | 24px | Ícone de ferramenta em card e barra do celular. |
| sidebar-width | 248px | Largura da sidebar a partir de 1024px. |
| header-height | 64px | Altura do header no desktop. |
| header-height-mobile | 56px | Altura do header no celular e tablet. |
| mobile-nav-height | 64px | Altura da barra de navegação inferior (mais a área segura do aparelho). |
| content-max | 1200px | Largura máxima do conteúdo ao lado da sidebar. |
| form-max | 560px | Largura máxima de formulários e telas de uma coisa só (login, etapas do Diagnóstico). |
| reading-max | 680px | Largura máxima de texto corrido (leituras da IA). |

## borderWidth

| Token | Valor | Uso |
|---|---|---|
| border-1 | 1px | Toda borda de card, campo e divisória. |
| border-2 | 2px | Anel de foco, aba ativa, opção selecionada. |

## breakpoint

| Token | Valor | Uso |
|---|---|---|
| bp-sm | 480px | Celulares grandes: botões de ação deixam de ocupar a largura toda quando há dois lado a lado. |
| bp-md | 768px | Tablet: grid de 8 colunas, margens space-6, cards em duas colunas. |
| bp-lg | 1024px | Desktop: sidebar fixa substitui a barra inferior; grid de 12 colunas. |
| bp-xl | 1280px | Desktop largo: conteúdo trava em content-max e centraliza. |

## zIndex

| Token | Valor | Uso |
|---|---|---|
| z-sticky | 10 | Header fixo e cabeçalho de tabela. |
| z-nav | 20 | Sidebar e barra inferior do celular. |
| z-dropdown | 30 | Menus e popovers. |
| z-overlay | 40 | Véu de modal e drawer. |
| z-modal | 50 | Modais e drawers. |
| z-toast | 60 | Toasts. |

## duration

| Token | Valor | Uso |
|---|---|---|
| duration-fast | 120ms | Hover, pressionado, troca de cor. |
| duration-base | 200ms | Menus, alertas e toasts entrando. |
| duration-slow | 280ms | Drawer e folha inferior. |

## easing

| Token | Valor | Uso |
|---|---|---|
| ease-standard | cubic-bezier(0.2, 0, 0, 1) | Entradas e mudanças de estado. |
| ease-exit | cubic-bezier(0.4, 0, 1, 1) | Saídas (fechar modal, drawer, toast). |
