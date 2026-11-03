#!/bin/sh
set -eu
umask 077
cd /opt/software-up
test -f deployment/compose.yml
mkdir -p deployment/backups
target="deployment/backups/software-up-$(date -u +%Y%m%dT%H%M%SZ).dump"
test ! -e "$target"
docker compose -f deployment/compose.yml exec -T db pg_dump -U up_owner -d software_up -Fc > "$target"
test -s "$target"
docker compose -f deployment/compose.yml exec -T db pg_restore --list < "$target" > /dev/null
printf 'Backup exclusivo do UP criado e conferido: %s\n' "$target"
