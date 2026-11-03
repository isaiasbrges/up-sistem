# Integração de produção — Software UP

Este documento reúne os contratos da nova API e distingue a entrada legada. Consulte o [acompanhamento](implementation-progress.md) para evidências e pendências de publicação. Os estados locais e a seleção de plano na prévia não são controles de segurança.

**Decisão de escopo — 28/10/2026:** a primeira versão funcionará sem IA, com cálculos, regras, orientações fixas e modelos editáveis. Não é necessário configurar provedor, chave, orçamento ou endpoint de geração. Essa decisão substitui as previsões de IA do escopo original.

**Revisão após leitura integral do PDF — 28/10/2026:** os registros pertencem ao aluno e se relacionam por `user_id`. Os perfis `admin` e `suporte` são da operação interna; o PDF não prevê organizações, equipes de clientes ou várias empresas por conta. Consulte a [matriz de requisitos](pdf-requirements.md). A nova API tem sessões persistentes de 30 dias. O usuário definiu SMTP Hostinger e **12 meses de acesso para Front, Essencial e Kit**, contados por calendário a partir da liberação.

## Infraestrutura alvo

- **Revisão de 28/10/2026:** a escolha e a contratação da hospedagem foram adiadas para trabalhar primeiro na [arquitetura](architecture.md). As indicações anteriores de VPS ou Business/Cloud não representam uma contratação definida.
- Nova API em Node.js/Express com PostgreSQL, tabelas por recurso, RLS e papéis separados. A entrada anterior MySQL/SQLite permanece preservada; os dados legados ainda não foram importados. VPS Hostinger definida em 29/10; dimensionamento e instalação ainda precisam ser conferidos.
- HTTPS, armazenamento com backup e monitoramento, fornecidos por hospedagem gerenciada ou configurados na VPS se essa for a escolha posterior.
- Envio transacional pelo [SMTP Hostinger](hostinger-smtp.md); credenciais e recebimento real ainda não foram verificados.
- Ambiente de homologação separado da produção.

## Endpoints da nova API local

| Método | Endpoint | Contrato |
|---|---|---|
| POST | `/api/v1/auth/request-code` | E-mail normalizado, mesmo retorno para e-mail não localizado; limites por IP/e-mail, hash, expiração. |
| POST | `/api/v1/auth/verify-code` | Código 6 dígitos, expira em 10 min, inválido após 5 erros; cookie seguro httpOnly. |
| POST | `/api/v1/auth/logout` | Revoga sessão persistente. |
| GET/PATCH | `/api/v1/me` | Identidade, produtos efetivos e atualização de nome sem alteração de função/e-mail. |
| GET/POST | `/api/v1/diagnostics` | Histórico imutável por aluno e cálculo no servidor. |
| GET/POST/PATCH | `/api/v1/finance/snapshots` | Um snapshot por mês/usuário, indicadores decimais e revisões. |
| GET/POST/PATCH/DELETE | `/api/v1/kit/transactions` | Lançamentos, categorias e escopo pessoal/empresa. |
| GET/POST/PATCH/DELETE | `/api/v1/kit/bills` | Contas a pagar e status. |
| GET/POST/PATCH/DELETE | `/api/v1/kit/debts` | Dívidas por aluno; simulação em `/kit/debt-simulation`. |
| GET/POST/PATCH/DELETE | `/api/v1/kit/offers` | Oferta editável por aluno, apenas para Kit Completo. |
| GET/POST/PATCH | `/api/v1/kit/plans` | Plano persistente; check-ins em `/api/v1/kit/checkins`. Lembretes recorrentes ainda pendentes. |
| GET/POST/PATCH/DELETE | `/api/v1/kit/procedures` | Procedimentos por aluno; exportação PDF ainda pendente. |
| POST | `/webhooks/kiwify` | Autenticação de webhook e atualização de permissões. |
| GET/POST/PATCH/PUT | `/api/v1/admin/*` | Alunos/acessos para admin e suporte; produtos, eventos e configurações para admin. Sem acesso financeiro individual. |
| GET/POST | `/api/v1/legal`, `/api/v1/legal/accept` | Documentos vigentes e aceite das versões exatas, com recibo persistente. |
| GET/POST | `/api/v1/privacy/*` | Exportação integral e solicitação/cancelamento de exclusão do próprio titular. |

Criações exigem `Idempotency-Key`; edições e exclusões de recursos versionados exigem `If-Match`. A nova API não expõe `/api/state`. O ambiente local inicia por `npm run dev:postgres`; o comando principal de publicação ainda está em preparação.

## Regras obrigatórias do PDF

- Reproduzir o contrato das pp. 5–6: POST JSON, parâmetro `signature`, HMAC-SHA1 hexadecimal minúsculo sobre o corpo bruto antes do parse e comparação em tempo constante; assinatura inválida recebe 401. Conferir assinatura e campos de pedido, cliente e produto com o webhook real antes de homologar a integração. A especificação está identificada; a compatibilidade com o serviço atual ainda não foi comprovada.
- Deduplicar `order_id + webhook_event_type`; não liberar acesso por Pix criado ou boleto criado.
- Reembolso e chargeback revogam **somente** o produto correspondente; dados permanecem registrados segundo a política definida.
- Permissões independentes: `front` libera Diagnóstico + Raio-X; `essencial` ferramentas 1 e 2 do Kit; `kit` todas as cinco.
- Desautorizar no servidor toda chamada de recurso sem compra ativa, independentemente de tela/botão oculto.
- Custos e números calculados com aritmética decimal e testados centavo a centavo. Diagnósticos, comparações e prioridades usam regras fixas do sistema.
- Orientações e modelos versionados e revisados. Não enviar informações do aluno a serviços de IA nesta versão.
- Termo e política aprovados com aceite versionado, exportação e exclusão de dados conforme LGPD.
- O material do Pr. Rafael, da Bring e as perguntas exatas ainda precisam de validação de conteúdo.

## Critérios mínimos de liberação

1. Compra real por cartão e Pix aprovada com liberação automática.
2. Reembolso e chargeback revogando somente o acesso apropriado.
3. Verificação de OTP, limites, sessão, expiração e tentativas.
4. Teste de isolamento entre alunos, inclusive alteração manual de IDs em requisições.
5. Testes do cálculo, incluindo margem negativa, dívida em atraso, valores percentuais e divisão por zero.
6. Teste de carga progressivo (50 → 100 → 250 → 500 usuários simultâneos) na Hostinger.
7. Backup restaurado em homologação e revisão dos termos LGPD.

## Atualização de implementação — 27/10/2026

A primeira etapa do backend está em `server/index.js`, com login, sessões e persistência por aluno. Em 27/10, o código foi preparado para Business/Cloud com Node.js e MySQL, com VPS opcional. Esse é um registro histórico: a revisão de 28/10 acima reabre a hospedagem e propõe PostgreSQL com RLS para a próxima etapa. Consulte o README para configuração e limitações da implementação atual.

Na entrada legada, os endpoints são `POST /api/auth/request-code`, `POST /api/auth/verify-code`, `POST /api/auth/logout`, `GET/PATCH /api/me` e `GET/PUT /api/state`. Esse adaptador temporário de estado inteiro foi substituído pelos contratos por recurso na nova API. `npm start` passou a usar a nova API via `server/run.js`; a entrada legada fica em `npm run start:legacy`. A instalação real ainda depende das etapas do roteiro de VPS.

A afirmação inicial de ausência de backend descreve o pacote original. Webhook, administração, consentimento versionado, exportação integral e solicitações de dados foram implementados e testados localmente. SMTP/Kiwify reais e critérios de liberação acima continuam por comprovar. Publicação editorial das ferramentas, exclusão definitiva segundo política aprovada, lembretes e pacote final de publicação permanecem em desenvolvimento. O usuário confirmou em 29/10 que os textos definitivos ainda serão preparados; a nova API de produção mantém as ferramentas bloqueadas até a publicação aprovada e o aceite. Consulte [documentos e privacidade](privacy-and-legal.md).
