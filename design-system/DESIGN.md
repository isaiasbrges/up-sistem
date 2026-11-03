# UP Software — Yellow Glass

## 1. Visão geral
Interface profissional de gestão empresarial: clareza, dados legíveis e progresso útil. O layout, os formulários, a gamificação, a navegação e as animações existentes são preservados. Esta diretriz foi criada a partir do sistema existente; não foi recuperada de um export do Stitch.

## 2. Identidade e cor
Acento principal: amarelo `#F5C400`. Dourado secundário: `#E5B82E`. Neutros frios, branco e grafite sustentam a interface. Não usar bege ou creme como fundo de página. Verde, vermelho e amarelo semântico continuam indicando sucesso, erro e atenção, sempre acompanhados de texto/ícone.

| Papel | Claro | Escuro |
|---|---|---|
| Botão principal / seleção | #F5C400 | #F5C400 |
| Texto no botão amarelo | #181B22 | #181B22 |
| Link / ícone primário | #785900 | #F6D76E |
| Canvas | #F5F7FA | #0B1220 |
| Superfície sólida de fallback | #FFFFFF | #152134 |
| Texto principal | #0D0D0D | #F0F4FC |
| Série principal de gráfico | #A47B00 | #F5C400 |
| Série comparativa | #64748B | #A7B6CC |

Amarelo vivo é preenchimento de controles, não texto sobre branco. Texto comum exige contraste mínimo 4,5:1; contornos essenciais e marcas de gráficos exigem 3:1. As legendas e tabelas de dados continuam disponíveis. Não associar pontos de gamificação a valores financeiros ou a notas maiores no diagnóstico.

## 3. Tipografia e espaçamento
Inter e Inter Display locais, pesos 400/500/600, com `font-display: swap`. Escala de espaçamento de 4 px; preservar os tamanhos de controle e os breakpoints documentados em docs/foundations.md. Navegação compacta não remove nomes acessíveis.

## 4. Material glass
Painéis usam preenchimento branco translúcido a 82% no tema claro e grafite a 82% no escuro, desfoque de 16 px (8 px no celular), borda de luz e sombra discreta. Campos e textos têm base suficientemente opaca. Evitar empilhar várias camadas com blur. Sem suporte a backdrop-filter, usar superfície sólida. Respeitar movimento reduzido, transparência reduzida e impressão.

## 5. Componentes e estados
Implementação CSS/JS: components/. Exemplos visuais: references/components/. Os três layouts são referências independentes (responsivo, desktop e celular), não versões concorrentes do aplicativo. Preservar estados default, hover, pressed, foco, disabled, loading, erro, sucesso, vazio e bloqueado. Os HTMLs são demonstrações com dados fictícios.

## 6. Fontes da verdade e manutenção
Esta diretriz define as decisões de uso. `tokens.json` é a representação executável dessas decisões; `tokens.css` é gerado por `npm run design:build`. Alterar os dois de forma coerente. `npm run lint:design` verifica geração, contrastes, assets e referências. Não criar uma segunda paleta em folhas do aplicativo.

Os aliases `brand-blue`, `brand-orange`, `brand-cream`, `blue-*` e `orange-*` são mantidos apenas para compatibilidade e agora resolvem para a nova paleta. Código novo deve usar tokens semânticos. As classes existentes não são renomeadas para preservar os fluxos.
