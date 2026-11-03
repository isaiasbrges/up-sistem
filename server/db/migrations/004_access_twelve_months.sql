-- Decisão comercial do usuário em 28/10/2026: 12 meses para os três produtos.
-- Não altera concessões históricas; define o prazo das próximas liberações.
INSERT INTO up_private.settings(key,value)
SELECT 'access.duration.' || code, '{"kind":"months","months":12}'::jsonb
FROM (VALUES ('front'),('essencial'),('kit')) AS products(code)
ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,
  version=up_private.settings.version+1,updated_by=NULL,updated_at=now();

INSERT INTO up_private.audit_events(action,target_type,reason,metadata)
VALUES ('settings.access_duration','settings','Decisão do responsável pelo projeto: 12 meses por produto.',
  '{"products":["front","essencial","kit"],"duration":{"kind":"months","months":12},"source":"migration-004"}');
