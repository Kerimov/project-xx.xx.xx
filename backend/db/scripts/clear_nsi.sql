-- Очистка синхронизированных данных НСИ (для повторной загрузки из 1С).
-- Порядок: договоры → счета → склады → контрагенты → организации (только те, на которые не ссылаются документы/пакеты/пользователи) → состояние синхронизации.
-- Запуск: psql -U user -d dbname -f clear_nsi.sql

BEGIN;

DELETE FROM contracts;
DELETE FROM accounts;
DELETE FROM warehouses;
DELETE FROM accounting_accounts;
DELETE FROM counterparties;

DELETE FROM organizations
WHERE id NOT IN (
  SELECT organization_id FROM documents WHERE organization_id IS NOT NULL
  UNION
  SELECT organization_id FROM packages WHERE organization_id IS NOT NULL
  UNION
  SELECT organization_id FROM users WHERE organization_id IS NOT NULL
);

DELETE FROM nsi_sync_state;

COMMIT;
