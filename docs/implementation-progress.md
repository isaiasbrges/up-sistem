# Preparação para publicação — acompanhamento

Objetivo ativo: deixar o Software UP pronto para publicar, seguindo o PDF e a decisão de primeira versão sem IA. Esta página registra evidências por etapa; não é uma declaração de prontidão de produção.

## Implementado nesta etapa

- Design system consolidado em 30/10: paleta amarela/dourada e material glass compartilhados pelo aplicativo e pelas referências, com temas claro/escuro. Os 88 arquivos da cópia autorizada foram lidos e inventariados; 35 HTMLs permanecem em `design-system/references/`. Seis fontes locais ausentes foram recuperadas do arquivo original com licença e hashes verificados. Tokens gerados, lint integrado e catálogo documentado. Testes de unidade/fluxos: 45 aprovados, além das verificações de lógica e 18 rotas. Detalhes e decisões em [relatório de migração](../design-system/audit/migration-report.md). A prévia visual local usa a porta 3002, sem banco de dados ou envio de e-mail.
- 04/11/2026: paleta de volta ao azul `#0031E8` e laranja `#FF8D00`, mantendo material glass e temas claro/escuro. Detalhes em design-system/audit/migration-report.md.

- Migrações PostgreSQL em `server/db/migrations/`: usuários, acessos, autenticação persistente, tabelas por recurso, RLS, eventos, tarefas e auditoria.
- Papéis distintos para consultas do aluno e operações internas. A conexão recusa superusuário, proprietário das tabelas e credenciais com papéis misturados.
- Login persistente em `server/modules/identity/`: código com hash protegido, dez minutos, cinco erros, reenvio em 60 segundos, três pedidos em 15 minutos, limite por IP e sessão de 30 dias.
- Motor financeiro decimal e validação por recurso, incluindo datas reais, dinheiro, percentuais e campos não permitidos.
- Repositórios por recurso, idempotência na criação, controle de versão e revisões do Raio-X.
- API v1 separada em `server/http/app.js`, sem endpoint de substituição do estado inteiro.
- Webhook Kiwify sobre corpo bruto assinado, deduplicação, payload cifrado, concessão por origem, reembolso/chargeback, revisão de configurações incompletas e reprocessamento.
- Processador de tarefas persistente com posse temporária, repetição de falhas e limite de tentativas.
- Cliente `app/api-v1.js` e adaptação inicial dos formulários para operações específicas. Salvamento automático limitado aos rascunhos.
- SMTP Hostinger escolhido pelo usuário: preset com TLS 465, alternativa STARTTLS obrigatório 587, verificação de certificado, e-mail de acesso/recuperação sem senha e comando `npm run mail:verify` sem envio. Configuração em `docs/hostinger-smtp.md`; credenciais e recebimento real ainda pendentes.
- Administração conectada à API v1: visão operacional, busca paginada de alunos, concessão/revogação por origem, correção de e-mail com invalidação de sessões, mapa de produtos, configurações e reprocessamento Kiwify. Operações exigem motivo e geram auditoria; concessão manual agenda aviso persistente. Suporte não recebe respostas, valores financeiros, payload bruto ou segredos.
- Prazo comercial respondido pelo usuário: 12 meses para Front, Essencial e Kit. Migração `004_access_twelve_months.sql` configura as próximas concessões; cálculo por calendário com ajuste de fim de mês/ano bissexto, sem renovar a vigência ao reprocessar o mesmo pedido.
- Links de compra e canais de suporte do administrador integrados às telas do aluno e à entrada, com lista explícita de campos públicos e validação de URLs.
- Documentos imutáveis, publicação de par aprovado e aceite versionado com hashes, data, IP e navegador. A nova API de produção permanece indisponível às ferramentas do aluno até publicação e aceite. O usuário confirmou em 29/10 que os textos definitivos ainda serão preparados.
- Exportação integral dos registros salvos, incluindo histórico de produtos vencidos e valores decimais. Função no PostgreSQL com papel próprio sem login/bypass e políticas de leitura do titular. Solicitação de exclusão, cancelamento e início de atendimento auditados; execução definitiva segue pendente de política/procedimento.

## Evidências já obtidas

- `tests/foundation.test.js`: 10 verificações passaram em PostgreSQL portátil real, incluindo isolamento sem filtro na consulta, escrita indevida, referência entre alunos, sessão, código concorrente e revogação.
- `tests/finance-decimal.test.js`: 8 verificações passaram, com seis cenários financeiros e simulação/validação.
- `tests/resources.test.js`: 8 verificações passaram, incluindo concorrência, idempotência, histórico e preservação de campos não alterados.
- `tests/api-v1.test.js`: 7 verificações passaram por HTTP com PostgreSQL, cookies seguros, permissões e totais independentes da paginação.
- `tests/billing.test.js`: 11 verificações passaram, com eventos Kiwify simulados assinados, vigência de 12 meses e concorrência de tarefas. Não houve compra nem e-mail externo.
- `tests/client-v1.test.js`: 10 verificações passaram com os manipuladores reais dos formulários, HTTP e PostgreSQL. Incluem ferramentas, rascunhos, Raio-X, links públicos, download integral e aceite/solicitação de privacidade.
- `tests/code-inputs.test.js`: 3 verificações passaram para colar código completo ou a partir de um campo intermediário sem apagar os dígitos anteriores.
- `tests/mail.test.js`: 8 verificações passaram para o preset Hostinger, TLS/STARTTLS, destinatário único, mensagem MIME real e recuperação sem senha; nenhum e-mail externo foi enviado.
- `tests/admin.test.js`: 8 verificações passaram por HTTP/PostgreSQL, incluindo limites entre aluno, suporte e admin, idempotência, preservação de outras compras, correção de e-mail, configuração e reprocessamento. `tests/admin-ui.test.js`: duas regressões para carregamento concorrente e respostas atrasadas ao trocar aba/conta.
- `tests/access-duration.test.js`: três verificações para 12 meses, ano bissexto, ajuste de fim de mês e validação de prazo.
- `tests/privacy.test.js`: oito verificações passaram sobre publicação, produção sem documentos, hashes, versões, exportação integral, acesso vencido, isolamento e solicitações. `tests/account-ui.test.js`: duas verificações sobre versões e texto seguro.
- `npm test` completo passou após documentos e privacidade: 31 testes de unidade/fluxos e 68 de integração, totalizando **99 testes**, além dos scripts de cálculo e verificação das 17 telas. O encerramento do PostgreSQL de teste usa o controlador nativo; respostas HTTP dos testes são consumidas. A suíte tem limite por teste para evitar espera indefinida.

Conferência no navegador: login pela caixa local, criação de `Venda de teste conectada` no valor de R$ 150,10 e persistência após recarregar a página. Evidência visual salva fora do repositório em `up-api-postgresql-conectado.png`, na pasta de visualizações desta conversa. Esse é um registro fictício do ambiente local, não uma venda real.

A configuração de 12 meses dos três produtos foi aplicada ao PostgreSQL local, conferida nos campos da tela e registrada em `up-acessos-12-meses.png`, na mesma pasta de visualizações. A migração não altera a vigência dos registros históricos de teste.

Em 29/10, a migração `005_legal_privacy.sql` foi aplicada ao ambiente local. Conferidos no navegador: duas confirmações obrigatórias, aceite dos textos fictícios `development-1`, download efetivo de `software-up-meus-dados.json` e registro/cancelamento de solicitação. O arquivo corresponde à conta fictícia, preserva valores como texto e não contém campos de código, sessão ou payload comercial. Evidência: `up-privacidade-dados.png`. Nenhum documento real foi publicado e nenhum dado foi apagado.

Os testes novos usam PostgreSQL real. No Windows deste ambiente, executar seus binários exige a permissão de execução local concedida às chamadas de teste. O pacote portátil fica apenas nas dependências de desenvolvimento; não é a configuração de banco da publicação.

## Trabalho em andamento

**Publicação cancelada em 29/10:** o responsável informou que a VPS usada era incorreta. A implantação exclusiva do UP foi removida, o banco estava sem usuários, e a chave desta implantação foi revogada. Os outros contêineres e arquivos do Nginx foram preservados e conferidos. O código local continua intacto. Nova publicação depende da confirmação do servidor correto. Os relatos anteriores de preparação nessa VPS são históricos.

Gamificação visual adicionada à interface: resumo no dashboard e rota `journey` com até dez missões conforme os acessos, cinco níveis, pontos por missão única, conquistas e atalhos para as ferramentas. O progresso é derivado dos registros disponíveis na conta, sem tabela de recompensas ou benefícios comerciais. Repetir/editar a mesma atividade não multiplica pontos. A revisão recorrente considera três semanas ISO distintas, sem exigir sequência. Uma nova conquista produz aviso acessível e dispensável; trocar de conta reinicia a comparação local. No navegador, um check-in fictício na prévia elevou o progresso de 420 para 480 pontos, exibiu a conquista e atualizou a próxima missão. Modos claro/escuro e atalhos conferidos. A paginação ainda limita os registros carregados usados no cálculo; um histórico permanente de conquistas e resumos globais no servidor fica para a etapa de agregações. `npm run test:unit` passou com 43 testes Node, lógica e 18 rotas.

Modo claro/escuro adicionado ao cabeçalho desktop, cabeçalho mobile e login. A preferência inicial acompanha o dispositivo; a escolha explícita fica no navegador e sincroniza entre abas. A troca atualiza apenas o tema e os controles, preservando formulários e animações em andamento. O tema é aplicado antes da primeira pintura, com tokens de contraste para gráficos, campos, avisos e superfícies glass. Conferidos no navegador alternância, persistência após recarregar e aplicação conectada. `npm run test:unit` passou com 37 testes Node, lógica e 17 rotas.

Em 29/10, o acabamento glass foi aplicado à entrada principal e à prévia: superfícies translúcidas, desfoque moderado e bordas de luz, mantendo o menu azul escuro e os destaques azul/laranja. Os gráficos de barras, linhas/pontos, radar, anel, medidor e rosca têm entrada própria ao aparecerem na tela. A hidratação preserva os gráficos ainda fora da área visível e libera observações de elementos removidos. Impressão e preferência por movimento reduzido mostram os dados sem animação; há alternativa sólida para transparência reduzida e navegadores sem desfoque. Verificados no navegador: dashboard, diagnóstico, financeiro e rosca administrativa. `npm run test:unit` passou com 34 testes Node, verificações de lógica e 17 rotas.

1. Verificar os formulários conectados à API v1 em `tests/client-v1.test.js` e no navegador real; corrigir qualquer diferença entre campos da tela e contratos.
2. Completar paginação, resumos, avisos, estimativas por campo, dívidas do Kit e exportações completas.
3. Completar a administração com modelos/publicação editorial das ferramentas, parâmetros financeiros e relatórios agregados. Completar o procedimento de exclusão definitiva/backups conforme política aprovada e implementar lembretes.
4. Validar na VPS as configurações de execução e o SMTP real. A caixa local, o encerramento gracioso e a entrada principal da API v1 estão preparados e testados localmente.
5. Importação verificável dos dados legados sem alterar a origem, ambiente de homologação, pacote de publicação, CI, backups/restauração e verificação final.

O `npm start` agora usa `server/run.js`, com a nova API PostgreSQL. A entrada legada permanece em `npm run start:legacy`. `npm run dev:postgres` mantém o ambiente local na porta 3001. A execução e a migração usam arquivos privados distintos; o administrador é criado explicitamente por `admin:init`. Foram aprovados 45 testes de unidade/fluxos e dois testes de integração da inicialização com PostgreSQL real, incluindo idempotência administrativa e recusa de promoção de aluno. O banco SQLite existente e os dados da prévia foram preservados. A chave SSH foi autorizada. Na VPS, imagem e banco exclusivos já foram preparados, com cinco migrações e restauração de backup testada. O serviço web aguarda configuração SMTP e e-mail administrativo; DNS ainda aponta para Vercel. Nginx e contêineres dos outros projetos permaneceram intactos. A execução completa local passou com 45 testes de unidade/fluxos e 70 de integração. Ver `vps-publication.md`.

O serviço administrativo em `server/modules/admin/service.js` já está ligado às rotas e à interface `app/admin.js`. Em desenvolvimento, `admin@up.local` recebe seu código na caixa local e abre o painel; suporte tem alunos/acessos e solicitações de dados. O administrador também publica os documentos de acesso. A área editorial das ferramentas e os parâmetros financeiros ainda não estão disponíveis. Os três prazos comerciais seguem os 12 meses definidos pelo usuário; contas, produtos, compras e concessões de homologação permanecem fictícios.

Os testes conectados e a primeira conferência de login/gravação no navegador já passaram. A revisão visual completa, paginação das ferramentas do aluno e recursos complementares continuam pendentes. A colagem de código a partir do primeiro campo e de um campo intermediário foi conferida novamente no navegador: o login administrativo terminou com sucesso. Também foram conferidos busca de alunos, liberação fictícia do Essencial por 30 dias, validade do acesso, mapa de produtos e configuração. Nenhuma mensagem foi enviada para fora da caixa local.

## Configurações externas ainda não comprovadas

Domínio/hospedagem, SMTP real, IDs e campos reais de produto/comprador na Kiwify, conteúdo definitivo, termos aprovados e política de retenção/exclusão. O usuário confirmou em 29/10 que os textos ainda serão preparados. As credenciais serão configuradas de forma privada; não devem ir para o GitHub nem para o chat. O recebimento real e a compra/reembolso de teste previstos no PDF continuam necessários antes da liberação aos alunos. Detalhes técnicos em `docs/privacy-and-legal.md`.

O prazo de acesso não é presumido como vitalício: um evento aprovado sem configuração explícita fica em revisão. Os testes definem seus próprios produtos, mapeamentos e prazos fictícios.

O usuário respondeu **12 meses** para Front, Essencial e Kit. A decisão foi incorporada ao cálculo, à configuração inicial e à interface administrativa. Renovação e cobrança recorrente permanecem por definir.
