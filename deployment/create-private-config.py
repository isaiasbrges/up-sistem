"""Executar somente no diretório novo e exclusivo /opt/software-up/deployment."""
import os
import secrets
from pathlib import Path

base = Path(__file__).resolve().parent
if base != Path('/opt/software-up/deployment'):
    raise SystemExit('Destino exclusivo do UP não confirmado.')
os.umask(0o077)
folder = base / 'private'
folder.mkdir(mode=0o700, exist_ok=False)
owner, app, internal = (secrets.token_hex(32) for _ in range(3))
values = {
 'db.env': f'POSTGRES_USER=up_owner\nPOSTGRES_DB=software_up\nPOSTGRES_PASSWORD={owner}\n',
 'migration.env': f'MIGRATION_DATABASE_URL=postgresql://up_owner:{owner}@db:5432/software_up\nAPP_DATABASE_PASSWORD={app}\nINTERNAL_DATABASE_PASSWORD={internal}\n',
 'runtime.env': f'''NODE_ENV=production
HOST=0.0.0.0
PORT=3000
APP_ORIGIN=https://app.universodoproposito.com
TRUST_PROXY=loopback
DATABASE_URL=postgresql://up_runtime:{app}@db:5432/software_up
INTERNAL_DATABASE_URL=postgresql://up_service:{internal}@db:5432/software_up
AUTH_SECRET={secrets.token_hex(32)}
KIWIFY_WEBHOOK_SECRET={secrets.token_hex(32)}
PAYLOAD_ENCRYPTION_KEY={__import__('base64').b64encode(secrets.token_bytes(32)).decode()}
SMTP_PROVIDER=hostinger
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM=
DEV_MAILBOX=false
ALLOW_PREVIEW=false
AUTH_REQUESTS_PER_IP_HOUR=20
'''
}
for name, value in values.items():
    with (folder / name).open('x', encoding='utf-8', newline='\n') as file:
        file.write(value)
    (folder / name).chmod(0o600)
print('Configurações privadas criadas. SMTP ainda precisa ser preenchido. Nenhum segredo foi exibido.')
