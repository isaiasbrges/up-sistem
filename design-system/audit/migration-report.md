# Relatório de triagem e integração — 30/10/2026

## Procedência real
A pasta design-system-export foi criada e preenchida a pedido do usuário com uma cópia do design-system existente. A inspeção anterior não encontrou o dump bruto citado. Não foi presumida a procedência Claude de materiais ausentes. Todos os 88 arquivos (478.477 bytes) foram lidos integralmente antes da migração; eram idênticos, byte a byte, aos arquivos atuais.

## Classificação por arquivo
O inventário completo está em [source-inventory.json](source-inventory.json), com SHA-256, tamanho, decisão, destino e variantes de cada HTML. Resultado: 88 canônicos preservados; zero duplicatas byte a byte; zero bundles/manifests/thumbnails internos. Não havia DESIGN.md ou configuração de lint no conteúdo recebido. Os arquivos são 44 SVGs, quatro PNGs, 35 HTMLs, dois CSSs, um JavaScript, uma licença TXT e um JSON. Os assets e a licença originais permanecem byte a byte; os HTMLs, estilos e tokens receberam os ajustes documentados.

## Conflitos e decisões conservadoras
- Pasta design-system já existente: integração no mesmo destino, preservando APIs CSS/JS, assets e comportamentos; não substituição cega por uma nova cópia.
- Mesmo caminho no export e no projeto: comparação integral encontrou 88 correspondências idênticas; mantida uma única implementação.
- Três telas de início: a responsiva tem o conjunto mais amplo de componentes; desktop e celular têm estruturas específicas de viewport. As três são referências canônicas de finalidades distintas, preservadas em references/layouts/.
- Exemplos e componentes: os HTMLs demonstram estados; a implementação única permanece em components/up.css e up.js. HTMLs foram movidos para references/components/, com caminhos ajustados e alternância de tema compartilhada.
- Azul/laranja anteriores versus pedido atual: aplicada paleta amarela/dourada com neutros frios. Aliases legados mantidos, sem preservar os valores antigos como segunda paleta. Cores de sucesso/erro e o menu escuro permanecem.
- DESIGN.md ausente: criada diretriz nova do projeto, identificada como tal. Não é apresentada como documento recuperado de Stitch. Configuração de lint ausente: criado lint de aderência sem dependências, integrado aos comandos do repositório.
- Regras antigas de jornada: o exemplo de linha do tempo continua preservado; a documentação agora distingue esse componente da gamificação funcional do aplicativo.
- Backup anterior à migração mantido apenas em data/design-system-migration/, fora do versionamento. Nenhum acesso à VPS cancelada ou publicação externa foi realizado.
- Fontes declaradas, mas ausentes da origem: recuperadas seis WOFFs Inter/Inter Display do arquivo original software-up-design-system (1).zip. A licença do arquivo foi comparada integralmente e coincide com a preservada. Assinaturas WOFF e hashes são verificados pelo lint; procedência em [recovered-fonts.json](recovered-fonts.json).
- Contrastes: textos amarelos sobre superfícies claras usam uma tonalidade escura própria. Botões amarelos/dourados usam texto escuro, inclusive pressionados; o botão destrutivo tem texto específico por tema. Logos pretos no cabeçalho móvel ficam brancos no tema escuro sem alterar o asset.

## Comparação dos layouts

| Fonte | Bytes | Variantes identificadas | Destino |
|---|---:|---:|---|
| layouts/inicio-celular.html | 17321 | 109 | references/layouts/inicio-celular.html |
| layouts/inicio-desktop.html | 18181 | 124 | references/layouts/inicio-desktop.html |
| layouts/inicio.html | 22353 | 133 | references/layouts/inicio.html |

## Validação e remoção da origem

- `npm run design:build`: tokens CSS regenerados a partir do JSON; lint compara o resultado integralmente.
- `npm run lint:design`: 88 destinos preservados, 308 caminhos locais existentes e 34 pares de contraste aprovados nos temas claro/escuro. Todas as classes de variantes originais continuam nos HTMLs correspondentes. Hashes dos assets originais e das seis fontes recuperadas conferidos.
- `npm run test:unit`: 45 testes aprovados, zero falhas; também aprovadas verificações de cálculo e 18 rotas. A mudança não altera as regras financeiras, os dados ou a API. A suíte de integração PostgreSQL não foi repetida para esta migração visual.
- Navegador: dashboard claro/escuro, alternância de tema, catálogo, estados de botões e layouts de referência desktop/celular. A referência de celular foi conferida a 390px; usa o breakpoint de 767px do sistema existente. Erros e avisos de console não apareceram nas páginas conferidas.
- `file://` não pôde ser conferido diretamente porque o navegador de verificação bloqueia esse protocolo. As referências não dependem da pasta de exportação nem de servidor/API: usam CSS, scripts, fontes e imagens relativos, sem imports de rede. Os caminhos foram verificados integralmente e a renderização foi conferida pelo servidor de prévia restrito aos assets públicos, na interface local 127.0.0.1:3002.
- Capturas da aplicação: `up-yellow-glass-light.jpg` e `up-yellow-glass-dark.jpg`, na pasta de visualizações deste trabalho.

A pasta `design-system-export` foi removida em 30/10/2026, somente após a validação. Antes da remoção, o caminho absoluto foi confirmado como filho direto deste projeto, sem links de sistema de arquivos, e os 88 nomes e hashes foram comparados novamente com o inventário. Nenhum arquivo novo ou modificado foi encontrado na origem. O lint foi executado novamente sem a pasta original e passou. O backup local anterior está preservado em `data/design-system-migration/before-yellow.zip` (ignorado pelo Git).

## Retorno ao azul — 04/11/2026

A pedido do usuário, a paleta voltou ao azul `#0031E8` e ao laranja `#FF8D00` usados até 30/10. O material glass, o menu escuro, os temas claro/escuro, os nomes de tokens e as classes foram mantidos; mudaram só os valores.

- `tokens.json`: `brand-blue` e `brand-orange` voltam a ser canônicos; as escalas `blue-*` e `orange-*` retomam os valores anteriores à troca. `brand-yellow` e `brand-gold` foram removidos.
- Ajustes para passar no lint: `accent-active` #D97000 (texto escuro 5,8:1), `chart-highlight` #D46A00 (3,6:1 sobre branco) e, no modo escuro, `primary-text`/`focus-ring` #8CA4FF, `chart-primary` #6F8DFF, `chart-highlight` #FFA640 e `on-danger` escuro.
- `.design-system-lint.json`: o lint passa a bloquear os valores da paleta amarela (#F5C400, #E5B82E, #785900, #A47B00, #F6D76E). O amarelo semântico do semáforo continua permitido.
- Valores fixos fora dos tokens: forma decorativa do menu/foco em `material.css`, texto de impressão do card de destaque e série de gráfico do modo de impressão em `color-mode.css`.
- Validação: `npm run lint:design` com os 34 pares de contraste aprovados nos dois temas; telas conferidas no navegador em claro, escuro e celular.
