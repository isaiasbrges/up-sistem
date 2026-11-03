# E-mails de acesso — Hostinger

Decisão do projeto: usar a caixa de e-mail SMTP da Hostinger para códigos de acesso e avisos transacionais. O login continua sem senha, conforme o PDF: para voltar à conta, o aluno recebe um novo código de seis dígitos, válido por dez minutos e de uso único.

## Configuração privada

No hPanel, consulte **E-mails → domínio → Configurações de dispositivos → Configuração manual**. A [documentação oficial da Hostinger](https://www.hostinger.com/br/support/1575756-como-encontrar-os-detalhes-de-configuracao-de-e-mail-no-hpanel-hostinger/) indica `smtp.hostinger.com`, porta 465 e SSL/TLS. A porta 587 com STARTTLS é uma alternativa. Se a caixa contratada usar Titan ou outro serviço, copie os dados exibidos para aquela caixa e use `SMTP_PROVIDER=custom`.

Configure no arquivo `.env` privado ou nas variáveis privadas da hospedagem:

```dotenv
SMTP_PROVIDER=hostinger
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=acesso@seu-dominio.com.br
SMTP_PASSWORD=
MAIL_FROM="UP Software <acesso@seu-dominio.com.br>"
DEV_MAILBOX=false
```

Substitua o endereço pelo de uma caixa existente e preencha sua senha somente no ambiente privado. Use preferencialmente a mesma caixa para autenticação e remetente. O arquivo `.env` está excluído do Git; não adicione credenciais a exemplos, capturas ou ao chat. O preset da nova API preenche servidor, porta e nome do remetente quando omitidos.

O aplicativo usa TLS direto na porta 465 ou STARTTLS obrigatório na 587, verifica o certificado e não habilita logs SMTP. Nunca desative a verificação do certificado para contornar uma falha.

## Verificar antes da publicação

```sh
npm run mail:verify
```

O comando lê as configurações privadas, testa conexão e autenticação e encerra sem enviar uma mensagem. Uma autenticação bem-sucedida não comprova entrega na caixa de entrada. Na homologação, solicite um código pela tela de acesso para uma conta de teste autorizada, confirme o recebimento, entre e teste um código expirado/usado. Confira também os avisos de liberação de produto.

No hPanel, confira a autenticação do domínio indicada para a caixa (SPF/DKIM e política DMARC) e os limites do plano de e-mail contratado. O sistema não altera registros DNS nem contrata serviços automaticamente. Marketing em massa não faz parte deste envio.

O comando `npm run dev:postgres` continua usando exclusivamente a caixa local fictícia. Nenhuma mensagem desse ambiente é enviada à Hostinger. A nova API usa o módulo em `server/integrations/mail.js`; `npm start` já usa essa nova API e exige as configurações privadas de PostgreSQL e SMTP. Consulte [o acompanhamento](implementation-progress.md).

## Situação atual

Preset e transporte preparados e testados com dados fictícios. O endereço definitivo do remetente e as credenciais ainda precisam ser configurados de forma privada. Nenhum envio real pela Hostinger foi comprovado nesta etapa.
