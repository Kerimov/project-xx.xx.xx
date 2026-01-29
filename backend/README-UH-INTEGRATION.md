# Интеграция с 1С УХ

## Настройка подключения

### Вариант 1: HTTP API (Рекомендуемый способ)

1. **Настройка переменных окружения** в `backend/.env`:

```env
# URL API 1С УХ
UH_API_URL=http://your-uh-server:8080/api

# Аутентификация
UH_API_USER=api_user
UH_API_PASSWORD=api_password

# Таймауты и retry
UH_API_TIMEOUT=30000
UH_RETRY_ATTEMPTS=3
UH_RETRY_DELAY=5000
```

2. **Настройка HTTP сервиса в 1С УХ**:

В конфигурации 1С УХ необходимо создать HTTP сервис с эндпоинтами:
- `POST /api/documents` - создание/обновление документа
- `POST /api/documents/{ref}/post` - проведение документа
- `GET /api/documents/{ref}/status` - получение статуса документа
- `GET /api/nsi/delta` - получение дельты НСИ
- `GET /api/health` - проверка доступности

### Вариант 2: Прямое подключение к БД (Не рекомендуется)

⚠️ **ВНИМАНИЕ**: Прямое подключение к БД 1С не рекомендуется из-за:
- Нарушения архитектуры 1С
- Проблем с блокировками
- Сложности поддержки при обновлениях

Если все же требуется прямое подключение:

```env
# Тип БД УХ: postgres | mssql
UH_DB_TYPE=mssql

# --- MS SQL Server (поддерживается) ---
UH_MSSQL_SERVER=1csql-srv.prima.pra.ru
UH_MSSQL_PORT=1433
UH_MSSQL_DATABASE=kk_test

# Аутентификация:
# 1) Integrated (домен) — текущий пользователь Windows. Backend должен запускаться под доменной учётной записью (ПК в домене):
# UH_MSSQL_AUTH=integrated
# Логин/пароль не указывать — используется учётная запись процесса.
# На ПК должен быть установлен Microsoft ODBC Driver 17 (или 18) for SQL Server:
# https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server
# При необходимости укажите драйвер: UH_MSSQL_ODBC_DRIVER=ODBC Driver 18 for SQL Server

# 2) NTLM (домен\пользователь + пароль). Часто даёт "untrusted domain" при подключении с другого ПК:
# UH_MSSQL_USER=DOMAIN\\user
# UH_MSSQL_PASSWORD=change-me
# UH_MSSQL_AUTH=ntlm

# 3) Либо SQL auth (рекомендуется при ошибке "untrusted domain"):
# UH_MSSQL_AUTH=sql
# UH_MSSQL_USERNAME=sql_user
# UH_MSSQL_PASSWORD=change-me

# Если при NTLM появляется "Login from an untrusted domain..." — используйте один из вариантов:
# - UH_MSSQL_AUTH=integrated: запускайте backend под доменной учётной записью (вход в Windows как prima\v.kerimov, затем npm run dev).
# - Либо UH_MSSQL_AUTH=sql и SQL-логин в SQL Server.

# TLS/сертификаты (часто для внутреннего контура удобнее trustServerCertificate=true)
UH_MSSQL_ENCRYPT=false
UH_MSSQL_TRUST_SERVER_CERTIFICATE=true

# --- PostgreSQL (старый вариант) ---
# UH_DB_TYPE=postgres
# UH_DB_HOST=your-uh-db-server
# UH_DB_PORT=5432
# UH_DB_NAME=uh_database
# UH_DB_USER=uh_user
# UH_DB_PASSWORD=uh_password
# UH_DB_SSL=true
```

### Проверка HTTP-сервисов 1С (публикация)

На странице портала «Подключение к БД 1С:УХ» можно проверить доступность OData и ПорталЕЦОФ по URL публикации. Если 1С требует Basic Auth, задайте в `backend/.env`:

```env
UH_1C_USER=Администратор
UH_1C_PASSWORD=your-password
```

Запросы к `/odata/`, `/ecof/` и т.д. будут отправляться с заголовком `Authorization: Basic ...`.

## Использование

```typescript
import { uhIntegrationService } from './services/uh-integration.js';

// Отправка документа
const response = await uhIntegrationService.upsertDocument({
  operationType: 'UpsertDocument',
  documentId: 'portal-doc-id',
  payload: {
    portalDocId: 'portal-doc-id',
    portalVersion: 1,
    idempotencyKey: 'unique-key',
    sourceCompany: 'Дочка 1',
    type: 'ReceiptGoods',
    number: '001',
    date: '2026-01-29',
    data: { /* данные документа */ }
  }
});

// Проверка доступности
const isAvailable = await uhIntegrationService.healthCheck();
```

## Очередь для асинхронной обработки

Для надежной отправки документов рекомендуется использовать очередь сообщений (RabbitMQ, Redis, или встроенную в БД).

## Безопасность

- Используйте HTTPS для подключения к удаленному серверу
- Храните credentials в переменных окружения, не коммитьте в git
- Используйте отдельного пользователя API с ограниченными правами
- Настройте firewall для доступа только с портала

## Документация по настройке 1С УХ

Подробная инструкция по настройке HTTP сервиса в 1С УХ находится в файле:
- `docs/1C-UH-HTTP-Service-Setup.md` - пошаговая инструкция
- `docs/1C-UH-Example-Code.bsl` - примеры кода на языке 1С
