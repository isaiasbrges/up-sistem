# Publicação isolada do UP na VPS — cancelada

**Estado atual: implantação cancelada e desfeita a pedido do responsável em 29/10/2026, pois esta não era a VPS correta. Não existe destino de publicação ativo confirmado.**

Destino anteriormente informado: Hostinger, `109.176.199.193`, domínio `app.universodoproposito.com`. O apontamento DNS será feito pelo responsável. Existem outros sistemas na VPS; a autorização exige preservá-los.

## Situação do acesso

A chave exclusiva `software-up-deploy` foi autorizada. O inventário confirmou Ubuntu 24.04, Docker Compose e Nginx já existentes; outros projetos foram preservados. Senhas e chaves privadas não pertencem a este documento nem ao repositório.

## Ordem da implantação

1. Confirmar a chave e executar uma consulta limitada a sistema operacional, recursos, portas e serviços. Não abrir um shell root livre.
2. Identificar o proxy e a forma de execução existentes. Não reiniciar, reinstalar, remover, atualizar ou substituir serviços de outros projetos.
3. Preparar uma pasta nova exclusiva do UP e um banco exclusivo, com credenciais separadas de migração e execução. A porta local candidata é 3127; só será usada após confirmar que está livre.
4. Instalar as dependências e criar os arquivos privados do UP. A aplicação não recebe a credencial proprietária do banco. Configurar SMTP real em arquivo privado.
5. Aplicar as migrações no banco exclusivo e provisionar os dois logins de execução. Criar o administrador com e-mail aprovado pelo responsável.
6. Iniciar o UP somente em interface local e verificar saúde, autenticação e leitura/gravação. Nenhuma conta fictícia ou documento de desenvolvimento é criado pela entrada de produção.
7. Após o DNS, criar uma rota nova e específica para o domínio e HTTPS, conforme o proxy existente. Alterar somente configurações novas do UP. Se a infraestrutura compartilhada exigir alguma alteração adicional, apresentar a mudança antes.
8. Testar entrega de e-mail, cadastro de produtos, compra/reembolso em homologação e restauração do backup exclusivo. Os textos legais aprovados são necessários para liberar as ferramentas aos alunos.

## Comandos do projeto

`npm start` inicia a nova API PostgreSQL (`server/run.js`). `npm run dev:postgres` continua sendo o ambiente local com contas fictícias e caixa de teste. O servidor antigo fica disponível somente por `npm run start:legacy` e não é a entrada de publicação.

Copiar `.env.example` para o arquivo privado da aplicação e `.env.migration.example` para o arquivo privado de migração. O destino exato será definido após a inspeção; os comandos aceitam `UP_ENV_FILE` e `UP_MIGRATION_ENV_FILE`.

```sh
npm ci --omit=dev
npm run db:migrate
npm run db:provision
npm run admin:init -- --email EMAIL_AUTORIZADO --name "Administrador UP"
npm run mail:verify
npm start
```

Não executar os comandos de banco contra bases de outros projetos. A inicialização verifica os papéis PostgreSQL e a conexão SMTP. Encerramento por SIGTERM/SIGINT aguarda o serviço e as tarefas; o limite é de 25 segundos. O gerenciador de serviço deve ser exclusivo do UP.

O pacote definitivo de infraestrutura, os backups e as configurações do proxy serão adaptados à inspeção real. Este arquivo é um roteiro de publicação, não comprovação de implantação na VPS.


## Histórico da preparação, antes do cancelamento

- Código enviado por pacote com SHA-256 conferido para `/opt/software-up`.
- Imagem `software-up-app:20261029` construída com Node.js 24, sem dependências de desenvolvimento, dados locais, chaves ou arquivos privados.
- Rede `software-up_up`, volume `software-up_db_data` e contêiner `software-up-db-1` exclusivos. PostgreSQL não publica portas no host. Limites: banco 768 MB/1 CPU; aplicação 512 MB/1 CPU.
- Cinco migrações aplicadas, credenciais de aplicação restritas e teste interno da API aprovado. Prévia e arquivos privados retornam 404. A aplicação não recebeu a credencial proprietária do banco.
- Backup `deployment/backups/software-up-20261029T224829Z.dump` criado, restaurado em uma base temporária exclusiva e conferido; a base temporária foi removida após o teste.
- Arquivos preexistentes do Nginx conferidos por SHA-256 e IDs dos contêineres preexistentes comparados antes/depois: preservados. Nginx não foi recarregado nesta etapa.
- Testes locais completos aprovados: 45 de unidade/fluxos e 70 de integração, além da lógica e das 18 rotas.
- O serviço web permanente **ainda não foi iniciado**, pois faltam o SMTP privado e o e-mail administrativo. Não houve envio de e-mails reais.
- O domínio ainda resolve para a Vercel. Os modelos de configuração Nginx foram preparados dentro da pasta do UP, sem ativação pública ou emissão de certificado.

## Concluir a configuração privada

No terminal da VPS, executar `python3 /opt/software-up/deployment/configure-smtp.py`. O script pede o endereço da caixa e a senha com entrada oculta, grava somente `deployment/private/runtime.env` com permissão 600 e ajusta o proxy confiável para a rede exclusiva do UP. O Compose usa leitura literal do arquivo para preservar caracteres especiais da senha.

Depois, conferir `docker compose -f deployment/compose.yml run --rm --no-deps web node server/commands/verify-mail.js`. Essa verificação autentica, sem enviar e-mails. Criar o administrador com o endereço autorizado e iniciar somente o serviço web do UP.

Para o apontamento, usar registro A de `app` para `109.176.199.193`, substituindo eventual CNAME desse mesmo subdomínio. Preservar os demais registros. A emissão de HTTPS e a ativação da rota específica dependem do DNS correto. Os termos aprovados e a homologação Kiwify continuam necessários antes da liberação aos alunos.


## Cancelamento confirmado em 29/10/2026

Antes da remoção, foram conferidos o digest do pacote, o ID do contêiner e da imagem, os rótulos da rede/volume e a ausência de usuários no banco novo. Foram removidos somente o contêiner `software-up-db-1`, o volume `software-up_db_data`, a rede `software-up_up`, a imagem exclusiva `software-up-app:20261029` e a pasta `/opt/software-up` criada nesta implantação. As imagens-base compartilháveis não foram removidas.

Os IDs dos contêineres preexistentes e os hashes dos arquivos preexistentes do Nginx continuaram iguais. Nenhuma configuração do UP chegou a ser ativada no Nginx. A linha de autorização da chave `software-up-deploy` foi removida, preservando todas as demais linhas de chaves. O código local e o registro de auditoria foram preservados; nenhum dado local ou código do projeto foi apagado.

As instruções anteriores são um histórico técnico da tentativa cancelada. Nova implantação depende da identificação explícita da VPS correta.
