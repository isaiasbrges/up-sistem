# Requisitos do PDF e aplicação na arquitetura

Revisão: 28/10/2026. Fonte lida integralmente: **Plataforma UP — Especificação para o Isaias**, título interno **Software UP — Arquitetura do entregável**, Lucas Canedo, 26/10/2026, 20 páginas. As tabelas de dados e a seção de privacidade também foram conferidas nas páginas renderizadas.

Este arquivo registra os requisitos do produto para orientar o desenvolvimento; não declara conformidade já implementada. A [arquitetura](architecture.md) descreve o destino técnico. O README descreve a aplicação que existe hoje.

## Precedência das decisões

1. Seguir o PDF para funcionamento, propriedade dos dados, produtos, privacidade e ordem de entrega, conforme orientação do usuário em 28/10/2026.
2. Manter a alteração já aprovada na conversa: **primeira versão sem IA**, com cálculos, regras, orientações fixas e modelos editáveis. A resposta sobre organização dos dados não foi interpretada como autorização para reintroduzir IA.
3. Tratar ferramentas e fornecedores recomendados como recomendações: a p. 3 permite outra stack, desde que preserve acesso por compra, cálculo no código, segredos no servidor e isolamento do aluno.
4. Detalhes não definidos no documento ficam explicitamente pendentes; não ampliar o produto por suposição. Hospedagem permanece em aberto conforme pedido anterior do usuário.
5. O usuário escolheu SMTP da Hostinger para envio de acesso e recuperação, em lugar do fornecedor de e-mail sugerido no PDF. O acesso permanece por código, sem criar um segundo fluxo de senha.
6. Prazo definido pelo usuário: **12 meses para Front, Kit Essencial e Kit Completo**. Essa resposta resolve a decisão deixada em aberto na p. 18. O prazo usa meses de calendário a partir da liberação; renovação/cobrança recorrente não foram definidas.

## Organização dos dados: decisão resolvida

O sistema é centrado no **aluno comprador**. O e-mail da compra localiza sua conta; um ID estável identifica os registros. As tabelas do PDF usam `user_id` para acessos, diagnósticos, Raio-X, dívidas e ferramentas. Cada aluno vê apenas os próprios dados. Referências: pp. 3, 15–18.

O PDF não define organizações de clientes, várias empresas por conta, convites ou equipes de clientes compartilhando dados. Tamanho da equipe é um campo do perfil do negócio, na p. 7; não é uma função de cadastro de colaboradores. Casa/empresa e pessoal/empresa são classificações dos lançamentos e dívidas, não entidades que concedem acesso a outra pessoa.

Os perfis de equipe especificados são internos à operação do UP: `admin` e `suporte`. Suporte gerencia alunos e acessos e não vê números nem respostas individuais. A equipe recebe relatórios agregados e anônimos; atendimento individual exige solicitação do aluno. Referências: pp. 17–18.

## Matriz de requisitos

| Área | Orientação do PDF | Páginas | Aplicação na arquitetura |
|---|---|---|---|
| Entregável | Aplicativo separado, simples, bom no celular; aulas continuam na Kiwify | 1–2 | Um aplicativo, preservando o visual aprovado; sem área de cursos no UP |
| Produtos | Front: Diagnóstico/Raio-X; Essencial: itens 1–2; Kit: itens 1–5; acessos independentes | 1, 12, 17 | Permissões por aluno, produto, pedido e origem; reembolso não apaga outra compra válida |
| Criação de conta | Compra aprovada cria/localiza aluno pelo e-mail normalizado | 3–6, 15 | Webhook é o fluxo normal de entrada; concessão manual é administrativa e auditada; sem cadastro público automático |
| Envio de código | Só com acesso ativo; mesma mensagem para conta localizada ou não | 3–4 | Checagem no servidor; nenhuma chave comercial ou decisão de acesso no navegador |
| Código | Seis dígitos; guardar hash; dez minutos; cinco erros; reenvio após 60 segundos | 4 | Desafio persistente e consumido atomicamente; sem código em logs |
| Limites e sessão | Três códigos/e-mail em 15 minutos; limite por IP/hora; cookie seguro por 30 dias | 4 | Corrigir divergências atuais; quantidade por IP é parâmetro ainda não informado |
| Auditoria de login | Data, IP e sucesso; suporte corrige e-mail no admin | 4, 15 | `login_events`; correção auditada com colisões tratadas e ID do aluno preservado |
| Webhook | POST JSON; corpo bruto; HMAC-SHA1; `signature`; 401 se inválida; duplicata por pedido/tipo | 5–6, 16 | Testes sobre o contrato do PDF e conferência com payload real antes de homologar |
| Eventos comerciais | Aprovado/pago libera; reembolso e chargeback encerram acesso correspondente; criado/rejeitado não libera | 5–6 | Histórico por origem, repetição sem duplicar acesso e proteção contra eventos fora de ordem |
| Configuração comercial | Mapa de IDs editável no admin; reprocessamento; troca de token com sobreposição mínima de um dia | 6, 17 | Configuração no servidor, eventos persistentes e operação administrativa auditada |
| Diagnóstico | Oito dimensões da Roda, quatro áreas do Radar, evidências, confirmação de gargalo e perfil | 6–8 | Questionário versionado; médias, empates, cuidado e recomendações calculados no servidor |
| Histórico | Inicial preservado; refazer cria registro; comparação inicial/mais recente | 8, 16 | Registros finalizados imutáveis; comparação usa números, regras e textos fixos na versão sem IA |
| Raio-X do front | Foto do mês médio com campos A–F, estimativa por campo e um registro mensal | 8–11 | Entradas, indicadores, origem, semáforo e ações separados; revisões técnicas preservam o histórico |
| Cálculos | Fórmulas explícitas; margem não positiva não gera ponto de equilíbrio fictício | 10 | Aritmética decimal, valores indisponíveis explícitos e testes centavo a centavo |
| Semáforo e ações | Limites editáveis no admin; no máximo três ações na ordem indicada | 10–11 | Parâmetros/textos versionados; três ações é a referência, corrigindo material derivado que cite duas |
| Kit financeiro | Lançamentos casa/empresa; resumo mensal; contas em sete dias; dívidas; simulação; CSV | 12 | Dados reais mensais do aluno; separar da média do front; não contar lançamentos e snapshots duas vezes |
| Roteiros e ofertas | Biblioteca da Bring; variáveis; copiar/abrir WhatsApp; quatro ofertas-base editáveis | 13 | Modelos editoriais aprovados; envio ao contato continua sendo ação do aluno |
| Plano | Exemplo e plano editável; check-in de cinco perguntas; histórico; lembrete no dia escolhido | 13 | Plano/check-ins por aluno; lembrete persistente e com deduplicação |
| Transferência | Procedimentos, checklist, roteiro de delegação e exportação PDF | 13 | Dados por aluno; exportação não pode incluir registros de outro titular |
| Administração | Alunos/acessos, eventos, produtos, conteúdo, configurações e relatórios agregados | 17–18 | Permissões de servidor por função; área de IA retirada da primeira versão |
| Privacidade | Aceite versionado; exportar todos os dados; solicitar exclusão; equipe sem dados individuais por padrão | 17–18 | `consents`, pedidos de privacidade, acesso interno restrito e auditoria |
| Qualidade | Ambiente de teste separado; testes de cálculos/acesso em cada etapa; compra real cartão/Pix e reembolso | 19–20 | Critérios de aceite por etapa; conformidade não é inferida só porque as telas funcionam |

## Stack e isolamento

O PDF recomenda Next.js/TypeScript, Supabase/Postgres, Vercel e Resend, mas autoriza outra stack na p. 3. Não é necessário trocar as telas já aprovadas para cumprir o produto.

O isolamento no próprio banco é citado nas pp. 15 e 19. A arquitetura revisada propõe **PostgreSQL com RLS** como destino para esse requisito, mantendo a API Node.js/Express como alternativa permitida. A atual implementação MySQL/SQLite ainda não foi migrada. Escolher PostgreSQL não contrata Supabase, Vercel nem VPS; a operação desses componentes continua por definir.

## Diagnóstico da entrada legada (histórico)

A tabela abaixo descreve a base anterior à nova API. O estado atual, incluindo PostgreSQL, sessões persistentes, Kiwify, administração e privacidade, está no [acompanhamento](implementation-progress.md). A migração dos dados e a troca do comando principal ainda não foram concluídas.

| Requisito | Evidência atual | Próxima entrega necessária |
|---|---|---|
| Dados por recurso e por aluno | Um JSON por e-mail em `up_accounts` | IDs e migração para tabelas por recurso, com reconciliação |
| Isolamento no banco | MySQL/SQLite e filtros/autorização na API | Políticas RLS testadas com papel real da aplicação no PostgreSQL |
| Sessão de 30 dias | Oito horas e armazenamento em memória | Prazo correto, persistência, revogação e testes de reinício |
| Três códigos em 15 minutos | Três pedidos em dez minutos | Janela correta, reenvio de 60 segundos e limites persistentes |
| Código fora dos logs | Código impresso em desenvolvimento sem SMTP | Caixa de e-mail de teste, sem impressão de OTP |
| Pedido com acesso ativo | Emissão verifica existência da conta | Verificar pelo menos uma concessão ativa também na conclusão do login |
| Registro de login | Não há tabela persistente de eventos de login | Registrar sucesso/erro com data e IP, com acesso e retenção definidos |
| Webhook e concessões por pedido | Concessão por ferramenta local; webhook ausente | Recepção autenticada, deduplicação, concessões e revogações persistentes |
| Administração e privacidade | Prévia visual; etapas de produção listadas como pendentes | Administração real, suporte restrito, aceite versionado e exportação/exclusão |
| Dinheiro exato | Cálculos com `Number` e arredondamento de apresentação | Aritmética decimal e conferência dos casos previstos no PDF |

Outros requisitos da matriz precisam de validação própria durante a implementação. Não são considerados concluídos por ausência nesta tabela de diferenças confirmadas.

## Ordem de entrega

1. Base, tabelas, migração e isolamento por aluno.
2. Webhook Kiwify, produtos e acessos.
3. Login por código conforme prazos, limites e auditoria do PDF.
4. Diagnóstico sem IA, com casos de referência.
5. Raio-X sem IA, com cinco casos conferidos centavo a centavo.
6. Administração mínima, e-mails, privacidade e teste completo de compra/reembolso.
7. Kit, como fase 2: permissões, cinco ferramentas, conteúdo, lembretes e exportações.

A etapa de IA da ordem original foi removida pela decisão aprovada. As funcionalidades já existentes são aproveitadas e testadas de novo nos pontos alterados; esta ordem não exige apagar a interface nem descartar os registros atuais.

## Pendências que o documento realmente deixa

- Política de renovação após os 12 meses de acesso definidos pelo usuário.
- Domínio, subdomínio e infraestrutura de operação. SMTP Hostinger foi escolhido; credenciais e recebimento real permanecem por configurar/verificar.
- Nome e IDs finais de produtos, preço e configuração comercial; preços do PDF não são oferta atual verificada.
- Textos definitivos da Roda, roteiros, ofertas, campos das aulas e conteúdos aprovados por Bring/Pr. Rafael.
- Campos reais do comprador/produto no webhook, a conferir na Kiwify.
- Data da fase 1 e prazo da fase 2/Kit.
- Detalhes operacionais adicionais, como valor do limite por IP/hora e retenção dos registros, que o PDF não quantifica.
- Textos aprovados dos Termos de Uso e da Política de Privacidade: o usuário informou em 29/10/2026 que ainda serão preparados. Cadastro/publicação e aceite versionado já existem na nova API; veja [o fluxo](privacy-and-legal.md).

Fornecedor de IA, orçamento, prompts e lista para citações automáticas deixam de ser pendências desta primeira versão sem IA. Equipes de clientes e múltiplas empresas não ficam aguardando decisão: estão fora do escopo descrito pelo documento.
