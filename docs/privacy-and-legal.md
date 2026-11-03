# Documentos de acesso e solicitações do titular

Atualização: 29/10/2026. O responsável informou que **os Termos de Uso e a Política de Privacidade ainda serão preparados**. Este arquivo descreve o funcionamento técnico; não substitui esses documentos nem define prazos legais de retenção.

## Publicação de documentos

O administrador encontra **Termos e privacidade** no painel. Cada versão contém tipo, identificador, título, texto e hash SHA-256. Uma versão salva permanece imutável. Para mudar o texto, cadastre outra versão.

Depois de revisar e aprovar o conteúdo, o administrador escolhe uma versão de cada documento, confirma a aprovação, informa o motivo e publica o par. A operação é auditada e usa revisão e chave de idempotência para tratar concorrência e repetição de uma requisição. O suporte não publica documentos.

A nova API em produção exige um par publicado por administrador. Sem ele, `/health/ready` responde 503 e as ferramentas do aluno permanecem indisponíveis. O aluno ainda pode gerenciar os próprios dados, exportá-los e acessar os canais de suporte. A entrada antiga ainda não foi substituída em `npm start`; ela não deve ser usada para publicação.

No primeiro acesso, o aluno lê os dois textos e confirma cada aceite. O recibo guarda versões, hashes, data, IP e identificação limitada do navegador. Uma publicação nova exige novo aceite; os recibos anteriores permanecem preservados. Confirmações da tela anterior são limpas quando muda a versão, inclusive se o texto mantiver o mesmo hash.

## Exportação completa

**Minha conta → Exportar todos os meus dados** gera um JSON dos registros salvos: identidade, concessões, diagnósticos, snapshots e revisões, lançamentos, contas, dívidas, ofertas, planos, check-ins, procedimentos, rascunhos, aceites, solicitações e eventos de login vinculados ao ID do titular.

A exportação inclui dados de produtos vencidos e registros preservados por exclusão lógica. Não depende da página carregada na interface. Valores monetários tipados são strings decimais, para preservar os centavos. Há limite de três exportações em 15 minutos por conta.

O banco usa a função fixa `up_private.export_personal_data()`, que não recebe um ID arbitrário. Seu proprietário é `up_exporter`, papel sem login, superusuário ou bypass de RLS. Políticas específicas de leitura continuam restringindo os registros ao titular da transação. As conexões normais não podem pertencer a esse papel. O suporte continua sem permissão de ler tabelas financeiras; a função não inclui hashes de códigos/sessões, segredos SMTP ou payloads de pagamento.

Uma sessão válida permite exportar os dados mesmo quando o produto vence. A emissão de um novo código continua exigindo acesso ativo, conforme o PDF; fora desse fluxo, o atendimento ao ex-aluno deve ocorrer pelo canal oficial de suporte. O canal configurado pelo administrador também aparece na tela de entrada, sem exigir login.

## Solicitação de exclusão e atendimento

O aluno confirma a solicitação em **Minha conta**. Ela é persistida e fica visível para a equipe, com um único pedido aberto por titular. Enquanto estiver pendente, o aluno pode cancelá-la. A equipe pode iniciar o atendimento; depois disso, o acompanhamento ocorre pelo suporte.

Esta etapa implementa a solicitação e o acompanhamento. A execução da exclusão definitiva e o tratamento de backups ainda precisam do procedimento operacional e da política de retenção aprovados pela UP. Não existe comando de interface que declare uma exclusão concluída sem executá-la. Nenhum dado foi apagado nos testes de solicitação/cancelamento.

## Contratos

| Método | Endpoint | Função |
|---|---|---|
| GET | `/api/v1/platform` | Links de compra e suporte aprovados, sem segredos ou dados de aluno |
| GET | `/api/v1/legal` | Documentos vigentes e situação do aceite |
| POST | `/api/v1/legal/accept` | Aceitar exatamente o par vigente, com duas confirmações |
| GET | `/api/v1/privacy` | Consultar solicitações do próprio titular |
| GET | `/api/v1/privacy/export` | Baixar todos os próprios registros salvos |
| POST | `/api/v1/privacy/deletion-requests` | Registrar solicitação de exclusão |
| POST | `/api/v1/privacy/deletion-requests/:id/cancel` | Cancelar uma solicitação própria ainda pendente |
| GET | `/api/v1/admin/legal` | Versões e publicação atual; somente admin |
| POST | `/api/v1/admin/legal/documents` | Salvar versão imutável; somente admin |
| POST | `/api/v1/admin/legal/publish` | Publicar par aprovado; somente admin |
| GET | `/api/v1/admin/privacy` | Solicitações para atendimento, sem dados financeiros |
| POST | `/api/v1/admin/privacy/:id/start` | Iniciar atendimento com motivo e auditoria |

## Verificação e pendências

`tests/privacy.test.js` cobre publicação, confirmações, hashes, atualização de versões, concorrência de pedidos, cancelamento e exportação além de uma página. Também verifica produtos vencidos, isolamento e privilégios reais dos papéis do PostgreSQL. `tests/client-v1.test.js` exercita os manipuladores reais dos formulários, download do arquivo e preservação após reabrir. `tests/account-ui.test.js` verifica limpeza de confirmações e renderização segura dos textos.

No navegador local foram conferidos bloqueio por falta de confirmação, aceite do texto fictício, download e conteúdo do JSON, solicitação e cancelamento. O ambiente usa documentos claramente identificados como **teste, sem efeito contratual**, na versão `development-1`; eles são criados somente pelo comando de desenvolvimento e não satisfazem o requisito de aprovação da API de produção.

Permanecem externos: textos revisados e aprovados, canal oficial de atendimento, política de retenção e procedimento de exclusão/backups. Não foi declarada conformidade legal nem liberado o lançamento aos alunos.
