"""Preencher pelo terminal da VPS; a senha nunca aparece na tela."""
import getpass
import ipaddress
import re
import subprocess
from pathlib import Path

target = Path('/opt/software-up/deployment/private/runtime.env')
if not target.is_file():
    raise SystemExit('Configuração privada do UP não encontrada.')
email = input('Caixa SMTP Hostinger (endereço completo): ').strip()
if not re.fullmatch(r'[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+', email):
    raise SystemExit('Endereço de e-mail inválido.')
password = getpass.getpass('Senha da caixa SMTP (entrada oculta): ')
if not password or any(c in password for c in '\r\n\0'):
    raise SystemExit('Senha vazia ou inválida.')
gateway = subprocess.check_output(['docker','network','inspect','software-up_up','--format','{{range .IPAM.Config}}{{.Gateway}}{{end}}'], text=True).strip()
ipaddress.ip_address(gateway)
patch = {'SMTP_USER':email, 'SMTP_PASSWORD':password, 'MAIL_FROM':f'UP Software <{email}>', 'TRUST_PROXY':gateway+'/32'}
lines = [key+'='+patch.pop(key) if key in patch else line for line in target.read_text().splitlines() for key in [line.split('=',1)[0]]]
lines.extend(key+'='+value for key,value in patch.items())
target.write_text('\n'.join(lines)+'\n')
target.chmod(0o600)
print('SMTP configurado no arquivo privado do UP. Nenhuma senha foi exibida. Falta verificar a autenticação.')
