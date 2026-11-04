# Design system do UP

Paleta azul e laranja com material glass, integrada aos temas claro/escuro do aplicativo.

- [Diretrizes DESIGN.md](DESIGN.md)
- [Catálogo visual independente](index.html)
- [Componentes e estados](docs/components.md)
- [Fundamentos](docs/foundations.md)
- [Triagem e decisões](audit/migration-report.md)

## Estrutura
`tokens.json` e `build.js`: fonte executável e geração de CSS. `components/`: implementação única, incluindo ícones, alternância de tema e material. `references/`: HTMLs independentes para abrir pelo navegador, com assets locais. `assets/` e `fonts/`: logos, ícones, fontes e licença preservados. `audit/`: inventário de origem e escolhas.

## Comandos
`npm run design:build` regenera os tokens. `npm run lint:design` valida aderência e referências. O lint também faz parte de `npm test`.

`npm run preview` abre um servidor somente de prévia em http://127.0.0.1:3002. O catálogo fica em `/design-system/index.html`; a aplicação com dados fictícios, em `/app/preview.html#/dashboard`. Essa prévia não envia e-mails nem precisa de banco de dados. Os HTMLs usam caminhos relativos locais; a referência `inicio-celular.html` deve ser vista em uma janela de largura de celular (até 767px), enquanto `inicio.html` adapta o layout à janela.

A origem desta migração é uma cópia autorizada do sistema já existente. Não foram encontrados artefatos internos do Claude, DESIGN.md de Stitch ou configurações de lint no material recebido. Nenhum deles é tratado como recuperado.

Seis fontes Inter/Inter Display, ausentes da cópia apesar de declaradas nos tokens, foram recuperadas do arquivo original `software-up-design-system (1).zip`, com a mesma licença. Procedência e hashes em [recovered-fonts.json](audit/recovered-fonts.json).
