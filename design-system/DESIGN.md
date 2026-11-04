# UP Software — Azul UP com material glass

## 1. Visão geral
Interface profissional de gestão empresarial: clareza, dados legíveis e progresso útil. O layout, os formulários, a gamificação, a navegação e as animações existentes são preservados. Esta diretriz foi criada a partir do sistema existente; não foi recuperada de um export do Stitch.

## 2. Identidade e cor
Acento principal: azul `#0031E8`. Destaque: laranja `#FF8D00`. Neutros frios, branco e grafite sustentam a interface; o menu continua azul-marinho escuro. Não usar bege ou creme como fundo de página. Verde, vermelho e amarelo semântico continuam indicando sucesso, erro e atenção, sempre acompanhados de texto/ícone.

| Papel | Claro | Escuro |
|---|---|---|
| Botão principal / seleção | #0031E8 | #0031E8 |
| Texto no botão azul | #FFFFFF | #FFFFFF |
| Link / ícone primário | #0031E8 | #8CA4FF |
| Destaque (compra do Kit, item ativo) | #FF8D00 com texto #0D0D0D | #FF8D00 com texto #0D0D0D |
| Canvas | #F5F7FA | #0B1220 |
| Superfície sólida de fallback | #FFFFFF | #152134 |
| Texto principal | #0D0D0D | #F0F4FC |
| Série principal de gráfico | #0031E8 | #6F8DFF |
| Série de destaque (menor nota, mês negativo) | #D46A00 | #FFA640 |

O laranja vivo é preenchimento de botão de destaque, sempre com texto escuro; nunca texto branco sobre laranja. Como texto ou ícone sobre branco, use `accent-text` (#A35400). Texto comum exige contraste mínimo 4,5:1; contornos essenciais e marcas de gráficos exigem 3:1. As legendas e tabelas de dados continuam disponíveis. Não associar pontos de gamificação a valores financeiros ou a notas maiores no diagnóstico.

## 3. Tipografia e espaçamento
Inter e Inter Display locais, pesos 400/500/600, com `font-display: swap`. Escala de espaçamento de 4 px; preservar os tamanhos de controle e os breakpoints documentados em docs/foundations.md. Navegação compacta não remove nomes acessíveis.

## 4. Material glass
Painéis usam preenchimento branco translúcido a 82% no tema claro e grafite a 82% no escuro, desfoque de 16 px (8 px no celular), borda de luz e sombra discreta. Campos e textos têm base suficientemente opaca. Evitar empilhar várias camadas com blur. Sem suporte a backdrop-filter, usar superfície sólida. Respeitar movimento reduzido, transparência reduzida e impressão.

## 5. Componentes e estados
Implementação CSS/JS: components/. Exemplos visuais: references/components/. Os três layouts são referências independentes (responsivo, desktop e celular), não versões concorrentes do aplicativo. Preservar estados default, hover, pressed, foco, disabled, loading, erro, sucesso, vazio e bloqueado. Os HTMLs são demonstrações com dados fictícios.

## 6. Fontes da verdade e manutenção
Esta diretriz define as decisões de uso. `tokens.json` é a representação executável dessas decisões; `tokens.css` é gerado por `npm run design:build`. Alterar os dois de forma coerente. `npm run lint:design` verifica geração, contrastes, assets e referências. Não criar uma segunda paleta em folhas do aplicativo.

`brand-blue` e `brand-orange` voltaram a ser os tokens canônicos da marca em 04/11/2026; a paleta amarela de 30/10 foi retirada e o lint bloqueia os valores dela. `brand-cream`, `blue-*` e `orange-*` seguem como escalas de apoio. Código novo deve usar tokens semânticos. As classes existentes não são renomeadas para preservar os fluxos.
