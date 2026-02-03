# Интеграция объектов учета с аналитиками и формами документов

## Связь между analytics_types и object_types

### Концептуальная разница

1. **`analytics_types`** (виды аналитик / разрезы учета):
   - Это **"какими признаками"** мы описываем документы и проводки
   - Используются как **субконто** в 1С (договор, склад, счёт)
   - Примеры: `CONTRACT`, `WAREHOUSE`, `ACCOUNT`, `COUNTERPARTY`
   - Значения хранятся в `analytics_values` (справочники)

2. **`object_types`** (объекты учета):
   - Это **"что именно"** мы учитываем (конкретные экземпляры)
   - Используются для **детализации** и **аналитики** документов
   - Примеры: `FIXED_ASSET` (ОС №0005), `PROJECT` (Проект "А"), `CFO` (ЦФО "Отдел продаж")
   - Карточки хранятся в `object_cards` с детальными атрибутами

### Пересечения

Некоторые сущности могут быть **одновременно** и аналитикой, и объектом учета:

- **CONTRACT** (Договор):
  - Как `analytics_type`: используется как субконто в проводках
  - Как `object_type`: карточка договора с детализацией (даты, условия, файлы)

- **COUNTERPARTY** (Контрагент):
  - Как `analytics_type`: используется в документах для указания контрагента
  - Как `object_type`: карточка контрагента с реквизитами, адресами, контактами

### Рекомендация по использованию

- **В формах документов** используйте:
  - `AnalyticsSection` — для выбора аналитик (субконто): договор, склад, счёт
  - `ObjectAccountingSection` — для выбора объектов учета: ОС, проект, ЦФО

- **В документах** сохраняйте:
  - `contractId` (из AnalyticsSection) — для субконто
  - `fixedAssetId`, `projectId`, `cfoId` (из ObjectAccountingSection) — для детализации

## Структура БД

### Таблицы аналитик (существующие)

```sql
analytics_types          -- Виды аналитик (CONTRACT, WAREHOUSE, ACCOUNT...)
analytics_values         -- Значения аналитик (конкретные договоры, склады...)
org_analytics_subscriptions  -- Подписки организаций на аналитики
```

### Таблицы объектов учета (новые)

```sql
object_types            -- Типы объектов учета (FIXED_ASSET, PROJECT, CFO...)
object_type_schemas     -- Схемы полей для типов объектов
object_cards            -- Карточки объектов (конкретные экземпляры)
object_card_history     -- История изменений карточек
org_object_subscriptions -- Подписки организаций на объекты учета
object_events           -- События изменений (outbox для webhook)
```

## API Endpoints

### Аналитики (существующие)

```
GET    /api/analytics/types                    -- Список видов аналитик
GET    /api/analytics/subscriptions           -- Подписки организации
POST   /api/analytics/subscriptions           -- Установить подписку
GET    /api/analytics/subscribed-values       -- Значения по подписке
```

### Объекты учета (новые)

```
GET    /api/objects/types                     -- Список типов объектов (ecof_admin)
GET    /api/objects/types/:id                 -- Тип объекта с схемой полей
POST   /api/objects/types                     -- Создать тип (ecof_admin)
PUT    /api/objects/types/:id                 -- Обновить тип (ecof_admin)

GET    /api/objects/cards                     -- Список карточек объектов
GET    /api/objects/cards/:id                 -- Карточка объекта с историей
POST   /api/objects/cards                     -- Создать карточку
PUT    /api/objects/cards/:id                 -- Обновить карточку
DELETE /api/objects/cards/:id                 -- Удалить карточку (org_admin)

GET    /api/objects/subscriptions             -- Подписки организации на объекты
POST   /api/objects/subscriptions             -- Установить подписку (org_admin)
GET    /api/objects/subscribed-cards          -- Карточки по подписке
```

## Frontend компоненты

### Компоненты выбора аналитик (существующие)

- `CounterpartySelect` — выбор контрагента (проверяет подписку на `COUNTERPARTY`)
- `ContractSelect` — выбор договора (проверяет подписку на `CONTRACT`)
- `WarehouseSelect` — выбор склада (проверяет подписку на `WAREHOUSE`)
- `AccountSelect` — выбор счёта (проверяет подписку на `ACCOUNT`/`BANK_ACCOUNT`)
- `AnalyticsSection` — секция аналитик в формах документов

### Компоненты выбора объектов учета (новые)

- `ObjectCardSelect` — универсальный компонент для выбора карточки объекта учета
  - Параметры: `objectTypeCode` (например, `'FIXED_ASSET'`)
  - Проверяет подписку организации на тип объекта
  - Загружает карточки через `/api/objects/subscribed-cards`

- `ObjectAccountingSection` — секция объектов учета в формах документов
  - Параметры: `showFixedAsset`, `showProject`, `showCFO`, `showContractObject`
  - Показывает только подписанные типы объектов

## Пример использования в форме документа

```tsx
import { AnalyticsSection, ObjectAccountingSection } from '../../components/forms';

// В форме документа:
<AnalyticsSection
  showContract
  showWarehouse
  showAccount
  organizationId={selectedOrganizationId}
  counterpartyId={selectedCounterpartyId}
/>

<ObjectAccountingSection
  showFixedAsset
  showProject
  showCFO
/>
```

## Валидация на бэкенде

При сохранении документа бэкенд проверяет:

1. **Аналитики**: все переданные `contractId`, `warehouseId`, `accountId` должны быть из подписанных аналитик
2. **Объекты учета**: все переданные `fixedAssetId`, `projectId`, `cfoId` должны быть из подписанных объектов учета

Проверка выполняется в `backend/src/controllers/documents.ts` в функциях `createDocument` и `updateDocument`:
- `validateDocumentAnalyticsSubscriptions()` — проверяет аналитики
- `validateDocumentObjectSubscriptions()` — проверяет объекты учета

## Хранение данных в документе

Данные документов хранятся в таблице `document_versions` в поле `data` (JSONB):

```json
{
  "number": "0001",
  "date": "2024-01-15",
  "organizationId": "uuid-org",
  "contractId": "uuid-contract",        // из AnalyticsSection
  "warehouseId": "uuid-warehouse",      // из AnalyticsSection
  "fixedAssetId": "uuid-os-0005",       // из ObjectAccountingSection
  "projectId": "uuid-project",          // из ObjectAccountingSection
  "cfoId": "uuid-cfo"                   // из ObjectAccountingSection
}
```

## Миграция данных

Если нужно связать существующие `analytics_types` с новыми `object_types`:

1. **Для CONTRACT**: можно создать `object_type` с кодом `CONTRACT` и мигрировать данные из `analytics_values` в `object_cards`
2. **Для COUNTERPARTY**: аналогично, создать `object_type` `COUNTERPARTY` и мигрировать контрагентов

Но это не обязательно — можно использовать оба подхода параллельно:
- `analytics_values` для быстрого выбора в документах (субконто)
- `object_cards` для детальной карточки с атрибутами

## Пример: Основное средство

### Как объект учета

```json
{
  "typeCode": "FIXED_ASSET",
  "code": "0005",
  "name": "Легковой автомобиль Toyota Camry",
  "attrs": {
    "vin": "JTDBR32E000123456",
    "initialCost": 2500000,
    "amortMethodBU": "linear",
    "usefulLifeMonthsBU": 60,
    "putIntoUseDate": "2024-01-15",
    "molId": "uuid-мол",
    "cfoId": "uuid-цфо"
  }
}
```

### Использование в документе

В форме документа "Поступление товаров" можно выбрать:
- **Аналитики**: договор, склад, счёт (через `AnalyticsSection`)
- **Объекты учета**: основное средство для отнесения затрат (через `ObjectAccountingSection`)

При сохранении документа:
```json
{
  "type": "ReceiptGoods",
  "contractId": "uuid-договора",      // из AnalyticsSection
  "warehouseId": "uuid-склада",        // из AnalyticsSection
  "fixedAssetId": "uuid-ос-0005",      // из ObjectAccountingSection
  "projectId": "uuid-проекта",         // из ObjectAccountingSection
  "cfoId": "uuid-цфо"                  // из ObjectAccountingSection
}
```

## Подписки организаций

Организация должна подписаться на:
1. **Аналитики** (`org_analytics_subscriptions`): `CONTRACT`, `WAREHOUSE`, `ACCOUNT`
2. **Объекты учета** (`org_object_subscriptions`): `FIXED_ASSET`, `PROJECT`, `CFO`

Обе подписки управляются на странице `/analytics`:
- Вкладка "Аналитики" — подписки на аналитики
- Вкладка "Объекты учета" — подписки на объекты учета

## Единая страница управления

Вся функциональность объединена на странице `/analytics`:

1. **Вкладка "Аналитики"**:
   - Подписки на виды аналитик (для `org_admin`/`ecof_admin`)
   - Просмотр подписанных аналитик (для `employee`)

2. **Вкладка "Объекты учета"**:
   - Управление типами объектов учета (только для `ecof_admin`)
   - Подписки на объекты учета (для `org_admin`/`ecof_admin`)
   - Просмотр и создание карточек объектов учета
   - Просмотр подписанных объектов (для `employee`)
