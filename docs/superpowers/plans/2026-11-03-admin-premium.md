# Administração premium UP — plano de implementação

Objetivo: aplicar a referência visual fornecida à administração existente, com os quatro tons oficiais, navegação responsiva e dados reais, sem alterar backend, autenticação, banco ou webhooks.

Arquitetura: manter JavaScript/CSS sem dependências de produção novas. Separar o shell administrativo e os componentes analíticos das rotinas de formulários já existentes. Tokens administrativos no design system canônico; escopo CSS restrito à área da equipe. Os estilos dos alunos continuam independentes.

- [ ] Criar testes para indicadores reais, estados vazios, filtros de período, dados escapados, permissões e navegação.
- [ ] Implementar shell administrativo: sidebar, busca real de alunos e dos produtos/eventos já carregados, Ctrl+K, notificações e perfil.
- [ ] Implementar componentes do dashboard: KPIs, cadastros por período, atividades de alunos/eventos disponíveis, distribuição de concessões e verificações reais de disponibilidade.
- [ ] Reaproveitar formulários de alunos, produtos, configuração, documentos e privacidade; adicionar visões de integrações e relatórios usando contratos atuais.
- [ ] Centralizar a paleta solicitada em tokens administrativos, com responsividade, tema claro, foco e movimento reduzido.
- [ ] Executar lint, testes de unidade/integração e inspeção visual desktop/mobile; verificar busca, ações e navegação por teclado.
- [ ] Preparar pacote de frontend e publicar somente os assets alterados, preservando mudanças privadas e os tokens Kiwify já presentes na VPS. Conferir rollback e resposta HTTPS.

Limites: sem percentuais comparativos inventados. Gráfico representa cadastros por created_at, não reconstituição histórica de acessos. Atividades usam apenas cadastros e eventos disponíveis. A API não fornece histórico de auditoria ou monitoramento SMTP; não mostrar esses estados como confirmados. Suporte mantém somente suas áreas autorizadas. Gráficos informam eventual limite de carregamento.
