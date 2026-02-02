# Интеграция портала с 1С:УХ по видам документов и НСИ

## Обзор

Интеграция построена по единому конфигу видов документов: каждому типу документа портала сопоставлен тип документа 1С:УХ, обязательные реквизиты и структура табличных частей. Payload для HTTP API 1С формируется на основе этого конфига и НСИ (организация, склад, счёт, контрагент).

## Соответствие типов документов (портал → 1С)

Обработка 1С (`ОпределитьТипДокумента1С`) должна использовать те же коды типов портала (`type` в payload). Ниже — маппинг и типы документов 1С.

| Тип на портале | Тип документа 1С (имя для маппинга) | Табличная часть | Склад | Счёт |
|----------------|--------------------------------------|-----------------|-------|------|
| **Покупки: поступление** |
| ReceiptGoods | ПоступлениеТоваровУслуг | Товары | да | — |
| ReceiptServices | ПоступлениеТоваровУслуг | Услуги | — | — |
| ReceiptRights | ПоступлениеТоваровУслуг | Права | — | — |
| ReceiptGoodsServicesCommission | ПоступлениеТоваровУслуг | Товары/услуги | — | — |
| ReceiptAdditionalExpenses | ПоступлениеДопРасходов | Строки | — | — |
| ReceiptTickets | ПоступлениеБилетов | Строки | — | — |
| **Покупки: возвраты и корректировки** |
| ReturnToSupplier | ВозвратТоваровПоставщику | Товары | да | — |
| ReceiptAdjustment | КорректировкаПоступления | Товары | — | — |
| DiscrepancyAct | АктРасхождений | Товары | да | — |
| **Покупки: счета** |
| InvoiceFromSupplier | СчетНаОплату | — | — | — |
| ReceivedInvoice | СчетФактураПолученный | Строки | — | — |
| **Продажи** |
| SaleGoods | РеализацияТоваровУслуг | Товары | да | — |
| SaleServices | РеализацияТоваровУслуг | Услуги | — | — |
| SaleRights | РеализацияТоваровУслуг | Права | — | — |
| ReturnFromBuyer | ВозвратТоваровОтПокупателя | Товары | да | — |
| SaleAdjustment | КорректировкаРеализации | Товары | — | — |
| InvoiceToBuyer | СчетНаОплату | — | — | — |
| IssuedInvoice | СчетФактураВыданный | Строки | — | — |
| **Банк и касса** |
| BankStatement | ВыпискаБанка | — | — | да |
| PaymentOrderOutgoing | ПлатежноеПоручениеИсходящее | — | — | да |
| PaymentOrderIncoming | ПлатежноеПоручениеВходящее | — | — | да |
| CashReceiptOrder | ПриходныйКассовыйОрдер | — | — | — |
| CashExpenseOrder | РасходныйКассовыйОрдер | — | — | — |
| **Склад** |
| GoodsTransfer | ПеремещениеТоваров | Товары | да (от/до) | — |
| GoodsWriteOff | СписаниеТоваров | Товары | да | — |
| GoodsReceipt | ОприходованиеТоваров | Товары | да | — |
| Inventory | ИнвентаризацияТоваров | Товары | да | — |
| **Комиссия и прочее** |
| TransferToConsignor | ПередачаТоваровКомитенту | Товары | да | — |
| ConsignorReport | ОтчетКомитенту | Товары | — | — |
| PowerOfAttorney | Доверенность | — | — | — |
| AdvanceReport | АвансовыйОтчет | Строки | — | — |

Конфиг в коде: `backend/src/config/uh-document-types.ts`.

## Структура payload для POST /documents

Тело запроса: `{ "payload": { ... } }`. В `payload` передаётся:

### Общие реквизиты (уровень документа)

| Поле | Тип | Обязательность | Описание |
|------|-----|----------------|----------|
| portalDocId | string (UUID) | да | ID документа на портале |
| portalVersion | number | да | Версия документа |
| idempotencyKey | string | да | Ключ идемпотентности |
| type | string | да | Тип документа портала (см. таблицу выше) |
| number | string | да | Номер документа |
| date | string (YYYY-MM-DD) | да | Дата документа |
| sourceCompany | string | да | Наименование организации (из НСИ портала) |
| counterpartyName | string | для большинства | Контрагент |
| counterpartyInn | string | нет | ИНН контрагента |
| totalAmount | number | для документов с суммой | Сумма документа |
| amount | number | нет | Дублирует totalAmount при необходимости |
| currency | string | да | Валюта (RUB и т.д.) |
| warehouseName | string | для документов со складом | Наименование склада (из НСИ) |
| warehouseCode | string | нет | Код склада |
| accountName | string | для банк/касса | Наименование счёта |
| accountCode | string | нет | Код счёта |

Дополнительно в `payload` могут передаваться поля из версии документа портала: `contractId`, `dueDate`, `purpose`, `servicePeriod`, `warehouseIdFrom`/`warehouseIdTo` и т.д. — по конфигу вида документа.

### Табличная часть items

Для документов с табличной частью в `payload.items` передаётся массив строк в едином формате для 1С:

| Поле | Тип | Описание |
|------|-----|----------|
| nomenclatureName | string | Номенклатура (или услуга — для услуг может использоваться serviceName) |
| serviceName | string | Наименование услуги (альтернатива nomenclatureName) |
| quantity | number | Количество |
| unit | string | Единица измерения (шт, м, кг и т.д.) |
| price | number | Цена |
| totalAmount | number | Сумма по строке |
| amount | number | Опционально, дублирует totalAmount |
| vatPercent | number | Ставка НДС |
| vatAmount | number | Сумма НДС |
| rowNumber | number | Номер строки |

Портал нормализует строки из версии документа (nomenclatureName/serviceName, quantity, unit, price, totalAmount, vatPercent) в этот формат перед отправкой. Склад и организация подставляются из НСИ портала по `warehouseId` и `organization_id`.

## НСИ (нормативно-справочная информация)

### Синхронизация из 1С в портал

Сервис НСИ (`backend/src/services/nsi-sync.ts`) запрашивает дельту у 1С (`GET .../nsi/delta`) и обновляет таблицы портала:

| Тип НСИ (type в ответе 1С) | Таблица портала | Ключевые поля |
|-----------------------------|-----------------|---------------|
| Organization | organizations | id, code, name, inn |
| Counterparty | counterparties | id, name, inn, data |
| Contract | contracts | id, name, organization_id, counterparty_id, data |
| Warehouse | warehouses | id, code, name, organization_id, data |
| Account | accounts | id, code, name, organization_id, type, data |

Формат элемента в ответе 1С по дельте НСИ: `{ id, type, name?, code?, data?: { ... } }`. В `data` ожидаются, при необходимости: `organizationId`, `counterpartyId`, `inn`, `code`, `type` (для счетов) и т.д.

### Использование НСИ при формировании payload

- **Организация**: берётся из документа портала (`organization_id` → JOIN с `organizations` → `organization_name` → в payload как `sourceCompany`).
- **Склад**: по `warehouseId` из версии документа ищется запись в `warehouses`; в payload подставляются `warehouseName`, `warehouseCode`.
- **Счёт**: по `accountId`/`paymentAccountId` из версии ищется запись в `accounts`; в payload подставляются `accountName`, `accountCode`.
- **Контрагент**: имя и ИНН хранятся в таблице `documents` и передаются в payload как `counterpartyName`, `counterpartyInn`.

Чтобы передача в 1С была корректной, склады и счета должны быть предварительно синхронизированы из 1С (или заполнены вручную в НСИ портала), а в документах должны быть указаны существующие `warehouseId`/`accountId`.

## Обработка 1С

В конфигурации 1С:УХ необходимо:

1. Реализовать маппинг типов портала → тип документа 1С (как в `docs/1C-UH-Example-Code.bsl`, функция `ОпределитьТипДокумента1С`).
2. Заполнять реквизиты документа из `payload`: организация по `sourceCompany`, контрагент по `counterpartyName`/`counterpartyInn`, склад по `warehouseName`/`warehouseCode` (если документ со складом), счёт по `accountName`/`accountCode` (для банка/кассы), табличная часть из `payload.items` (номенклатура, количество, единица, цена, сумма, НДС).

Расширение обработки под новые виды документов или реквизиты делается в 1С и при необходимости дополняется конфигом в портале (`uh-document-types.ts`) и полями в payload.

## Файлы интеграции в репозитории

| Файл | Назначение |
|------|------------|
| `backend/src/config/uh-document-types.ts` | Конфиг видов документов: маппинг портал→1С, обязательные/опциональные поля, флаги склад/счёт |
| `backend/src/services/uh-payload.ts` | Сборка payload: подстановка организации, склада, счёта из НСИ, нормализация items |
| `backend/src/services/uh-queue.ts` | Очередь отправки в 1С: вызов buildUHPayload и uhIntegrationService.upsertDocument |
| `backend/src/services/uh-integration.ts` | HTTP-запросы к 1С (POST /documents, GET /health, nsi/delta и т.д.) |
| `backend/src/services/nsi-sync.ts` | Синхронизация НСИ из 1С: организации, контрагенты, договоры, склады, счета |
| `docs/1C-UH-Example-Code.bsl` | Пример кода обработки HTTP-сервиса 1С (приём документа, маппинг типов, заполнение реквизитов) |
