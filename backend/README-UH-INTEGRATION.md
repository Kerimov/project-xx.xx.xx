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
# Подключение к БД 1С УХ (PostgreSQL)
UH_DB_HOST=your-uh-db-server
UH_DB_PORT=5432
UH_DB_NAME=uh_database
UH_DB_USER=uh_user
UH_DB_PASSWORD=uh_password
UH_DB_SSL=true
```

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
