# Software UP

Aplicação de Diagnóstico, Raio-X financeiro e ferramentas dos Kits, com paleta azul e laranja, neutros frios, menu escuro e superfícies glass, conforme a atualização de design. A primeira versão usa cálculos decimais, regras e modelos editáveis, conforme decisão de funcionar sem IA.

**Em preparação para publicação.** A nova API PostgreSQL funciona no ambiente local e tem testes de integração. O comando `npm start` usa a nova API PostgreSQL, com configurações privadas e encerramento gracioso. A publicação real e as integrações externas ainda dependem de validação. O [acompanhamento](docs/implementation-progress.md) registra o que falta e as evidências atuais.

## Testar a nova aplicação

Recomendado Node.js 24; mínimo do projeto: 22.16.

```sh
npm ci
npm run dev:postgres
```

Abra `http://127.0.0.1:3001/`.

- Aluno fictício: `demo@up.local`.
- Administração fictícia: `admin@up.local`.
- Códigos recebidos somente na caixa local: `http://127.0.0.1:3001/__dev/mail`.
- Banco, chaves e e-mails de desenvolvimento ficam em `data/`, excluído do Git.

Esse comando inicia um PostgreSQL portátil de desenvolvimento. Não envia e-mails pela internet nem usa dados comerciais reais. Os documentos `development-1` são exemplos locais sem efeito contratual; não substituem os textos aprovados para lançamento.

## Base implementada

- Dados por aluno, com ID estável, tabelas por recurso, RLS e credenciais distintas para recursos e operações internas.
- Login por código de seis dígitos, hash protegido, dez minutos, cinco erros, limites persistentes, reenvio após 60 segundos e sessão de 30 dias.
- Cálculos financeiros com aritmética decimal, valores indisponíveis explícitos e no máximo três ações priorizadas.
- Criação idempotente, edições com controle de versão, diagnósticos imutáveis e revisões mensais do Raio-X.
- Recebimento Kiwify assinado, payload cifrado, deduplicação, tarefas persistentes e concessões por pedido/origem. Reembolso não revoga uma compra independente.
- Prazo definido pelo usuário: **12 meses de calendário para Front, Kit Essencial e Kit Completo**. Reprocessar o mesmo pedido preserva o vencimento original.
- Administração de alunos/acessos, mapa de produtos, configurações, eventos e reprocessamento. Suporte sem dados financeiros individuais.
- Documentos de acesso imutáveis, publicação de par aprovado e recibos de aceite versionados. Novas versões exigem nova confirmação.
- Exportação completa dos registros salvos, inclusive de produtos vencidos; solicitação de exclusão, cancelamento e início de atendimento.
- Links de compra e canais de suporte configurados pelo administrador chegam às telas do aluno e à entrada.

O envio transacional usará **SMTP da Hostinger**. A [configuração privada](docs/hostinger-smtp.md) inclui TLS e o comando `npm run mail:verify`, que verifica conexão/autenticação sem enviar mensagem. O recebimento real ainda precisa ser comprovado.

## Documentos e privacidade

Em 29/10/2026, o usuário informou que os Termos de Uso e a Política de Privacidade **ainda serão preparados**. O administrador poderá cadastrar as versões e publicar o par após revisão e aprovação. A nova API em produção não libera as ferramentas do aluno sem essa publicação e o aceite correspondente.

A exportação usa uma função de leitura limitada ao titular. Não inclui códigos, sessões, senhas SMTP ou payloads de pagamento. O [fluxo de privacidade](docs/privacy-and-legal.md) explica os recibos, as solicitações e o procedimento de atendimento. A execução da exclusão definitiva e a política de retenção/backups continuam pendentes.

## Validação

```sh
npm test
```

A última execução completa passou com **45 testes de unidade/fluxos e 70 de integração: 115 testes**, além das verificações de cálculo e renderização das 17 rotas. Os testes de integração usam PostgreSQL real e papéis sem superusuário/bypass. Incluem isolamento entre alunos, concorrência, valores decimais, webhook simulado, aceite, exportação integral e formulários atravessando HTTP até o banco.

Também foram conferidos no navegador login por código, gravação e persistência, administração, os três prazos de 12 meses, documentos fictícios, download do JSON e solicitação/cancelamento de exclusão. Os testes locais não comprovam SMTP, compra/reembolso ou infraestrutura reais.

## Próximas etapas de publicação

Consulte a lista atualizada no [acompanhamento](docs/implementation-progress.md). Permanecem:

- Completar paginação, resumos e avisos, dívidas do Kit, estimativas por campo e exportações das ferramentas.
- Publicação editorial dos modelos, parâmetros financeiros, relatórios agregados e lembretes semanais.
- Concluir a infraestrutura de publicação, CI e importação verificável dos dados legados; a entrada principal e a separação de configurações já estão preparadas.
- Definir e testar hospedagem, HTTPS, entrega real de e-mails, payload/IDs reais da Kiwify e compra/reembolso em homologação.
- Aprovar conteúdo, documentos, canal de suporte, retenção e exclusão; comprovar backups/restauração e capacidade no ambiente escolhido.

A tentativa de implantação na VPS informada foi cancelada e desfeita em 29/10, pois o servidor era incorreto. O código permanece preservado; o destino correto ainda precisa ser confirmado. O [registro da publicação](docs/vps-publication.md) documenta a remoção exclusiva do UP e a preservação dos outros sistemas.

## Executar em produção

Prepare os arquivos privados a partir de `.env.example` e `.env.migration.example`. `npm start` usa `server/run.js`; `npm run start:legacy` mantém a entrada anterior apenas para manutenção. O comando `npm run admin:init -- --email EMAIL_AUTORIZADO` cria explicitamente o administrador, sem enviar e-mail nem promover uma conta de aluno existente. Consulte o [roteiro da VPS](docs/vps-publication.md).

Validação adicional desta preparação: 45 testes de unidade/fluxos e dois testes de inicialização com PostgreSQL real passaram. A imagem e o banco foram testados na VPS e depois removidos por solicitação do responsável, pois o servidor informado estava incorreto. Não existe instalação ativa confirmada; não houve envio SMTP real.

## Interface e prévia

A prévia estática está em `/app/preview.html`, disponível somente em desenvolvimento na nova API. Usa registros e rascunhos próprios no navegador; preencha apenas dados fictícios. O acesso conectado fica em `/`.

O layout está em `app/redesign.css`; o menu recolhe no desktop e abre no celular. Os gráficos SVG de `app/charts.js` têm animações, legendas acessíveis e respeito à preferência de movimento reduzido. `app/forms.js` fornece validação por campo, rótulos e retorno de estado.

A área “Minha jornada” e o resumo do dashboard reconhecem atividades salvas com missões, pontos, cinco níveis e conquistas. As missões respeitam os produtos liberados e contam uma vez por objetivo. O progresso reflete os registros carregados na conta; um histórico permanente e agregação de todo o banco ainda dependem da próxima etapa de resumos. Modos claro/escuro e movimento reduzido são preservados. A última validação de unidade passou com 43 testes Node e renderização de 18 rotas.

Os modelos atuais de Plano de 90 Dias, roteiros e ofertas são bases editáveis para revisão. Os textos oficiais da Bring e do Pr. Rafael ainda dependem de fornecimento/aprovação.

## Arquitetura e repositório

- [Arquitetura e decisões](docs/architecture.md).
- [Matriz do PDF](docs/pdf-requirements.md).
- [Contratos da nova API e registro do legado](docs/backend-integration.md).
- [E-mails Hostinger](docs/hostinger-smtp.md).
- [Documentos e privacidade](docs/privacy-and-legal.md).

Repositório público: [isaiasbrges/up-sistem](https://github.com/isaiasbrges/up-sistem), branch `main`. Dependências estão fixadas no lockfile. Dados locais, credenciais e arquivos `.env` privados não devem ir para o GitHub. A importação do SQLite/MySQL original ainda está em preparação; os dados existentes foram preservados.

## Design system canônico

[Diretrizes e estrutura](design-system/README.md) · [Catálogo visual](design-system/index.html) · [Relatório de integração](design-system/audit/migration-report.md). O lint de aderência está em `npm run lint:design` e integra `npm test`.

Para conferir o visual sem banco de dados: `npm run preview`. Abra [o dashboard de demonstração](http://127.0.0.1:3002/app/preview.html#/dashboard) ou [o catálogo de componentes](http://127.0.0.1:3002/design-system/index.html). A prévia usa dados fictícios e não envia e-mails.
