# Интеграция справочников с формами документов

## Обновленные формы (8 из 29)

✅ Обновлены следующие формы:
1. InvoiceFromSupplierPage
2. ReceiptGoodsServicesCommissionPage
3. SaleGoodsPage
4. GoodsTransferPage
5. ReturnToSupplierPage
6. ReceiptAdditionalExpensesPage
7. ReceiptRightsPage
8. SaleServicesPage

## Шаблон для обновления остальных форм

### 1. Добавить импорты

```typescript
import { OrganizationSelect, CounterpartySelect, ContractSelect, AccountSelect, WarehouseSelect } from '../../components/forms';
```

### 2. Добавить state для выбранных значений

```typescript
const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | undefined>();
const [selectedCounterpartyId, setSelectedCounterpartyId] = useState<string | undefined>();
```

### 3. Заменить поле организации

**Было:**
```tsx
<Form.Item label="Организация" name="organizationId" rules={[{ required: true }]}>
  <Select placeholder="Выберите организацию">
    <Option value="00000000-0000-0000-0000-000000000001">ЕЦОФ</Option>
    <Option value="00000000-0000-0000-0000-000000000002">Дочка 1</Option>
    <Option value="00000000-0000-0000-0000-000000000003">Дочка 2</Option>
  </Select>
</Form.Item>
```

**Стало:**
```tsx
<Form.Item 
  label="Организация" 
  name="organizationId" 
  rules={[{ required: true, message: 'Выберите организацию' }]}
>
  <OrganizationSelect 
    onChange={(value) => {
      setSelectedOrganizationId(value);
      form.setFieldsValue({ contractId: undefined, paymentAccountId: undefined, warehouseId: undefined });
    }}
  />
</Form.Item>
```

### 4. Заменить поле контрагента

**Было:**
```tsx
<Form.Item
  label="Контрагент"
  name="counterpartyName"
  rules={[{ required: true, message: 'Выберите контрагента' }]}
>
  <Input placeholder="Введите ИНН или наименование" />
</Form.Item>
```

**Стало:**
```tsx
<Form.Item
  label="Контрагент"
  name="counterpartyId"
  rules={[{ required: true, message: 'Выберите контрагента' }]}
>
  <CounterpartySelect
    onChange={(value, counterparty) => {
      setSelectedCounterpartyId(value);
      if (counterparty) {
        form.setFieldsValue({ 
          counterpartyName: counterparty.name,
          counterpartyInn: counterparty.inn 
        });
      }
    }}
    onNameChange={(name) => {
      form.setFieldsValue({ counterpartyName: name });
    }}
  />
</Form.Item>

<Form.Item name="counterpartyName" hidden>
  <Input />
</Form.Item>

<Form.Item name="counterpartyInn" hidden>
  <Input />
</Form.Item>
```

### 5. Заменить поле договора

**Было:**
```tsx
<Form.Item label="Договор" name="contractId">
  <Select placeholder="Выберите договор" allowClear>
    {/* TODO: загрузка из API */}
  </Select>
</Form.Item>
```

**Стало:**
```tsx
<Form.Item label="Договор" name="contractId">
  <ContractSelect
    organizationId={selectedOrganizationId}
    counterpartyId={selectedCounterpartyId}
  />
</Form.Item>
```

### 6. Заменить поле счета

**Было:**
```tsx
<Form.Item label="Счет на оплату" name="paymentAccountId">
  <Select placeholder="Выберите счет" allowClear>
    {/* TODO: загрузка из API */}
  </Select>
</Form.Item>
```

**Стало:**
```tsx
<Form.Item label="Счет на оплату" name="paymentAccountId">
  <AccountSelect
    organizationId={selectedOrganizationId}
  />
</Form.Item>
```

### 7. Заменить поле склада

**Было:**
```tsx
<Form.Item label="Склад" name="warehouseId" rules={[{ required: true }]}>
  <Select placeholder="Выберите склад">
    {/* TODO: загрузка из API */}
  </Select>
</Form.Item>
```

**Стало:**
```tsx
<Form.Item label="Склад" name="warehouseId" rules={[{ required: true, message: 'Выберите склад' }]}>
  <WarehouseSelect
    organizationId={selectedOrganizationId}
  />
</Form.Item>
```

## Остальные формы для обновления (21 форма)

- GoodsReceiptPage
- GoodsWriteOffPage
- InventoryPage
- CashExpenseOrderPage
- CashReceiptOrderPage
- PaymentOrderIncomingPage
- PaymentOrderOutgoingPage
- BankStatementPage
- IssuedInvoicePage
- ReceivedInvoicePage
- SaleAdjustmentPage
- ReturnFromBuyerPage
- SaleRightsPage
- ConsignorReportPage
- TransferToConsignorPage
- DiscrepancyActPage
- ReceiptAdjustmentPage
- ReceiptTicketsPage
- AdvanceReportPage
- PowerOfAttorneyPage
- InvoiceToBuyerPage

## Примечания

- Все компоненты справочников имеют автодополнение и поиск
- Договоры и счета автоматически фильтруются по выбранной организации
- Договоры также фильтруются по выбранному контрагенту
- Склады фильтруются по выбранной организации
- При изменении организации зависимые поля (договоры, счета, склады) очищаются

## Склады

Склады синхронизируются из 1С УХ. В выгрузке НСИ по очереди пробуются варианты справочника:
- `Справочник.Склады`
- `Справочник.СкладыОрганизаций`
- `Справочник.МестаХранения`

Используется первый справочник, из которого удалось выгрузить хотя бы один элемент. В `data` передаётся `organizationId` (Владелец). На портале склады отображаются в **Справочники** → вкладка **Склады** и в формах документов (аналитика «Склад»).

**Если склады не синхронизируются:** в Конфигураторе проверьте имя справочника складов и при необходимости добавьте его первым в массив `ИменаСправочников` в процедуре `ДобавитьЭлементыНСИСкладов`.

## План счетов (счета учета)

Счета учета синхронизируются из 1С УХ. В коде выгрузки НСИ по очереди пробуются варианты:
- `ПланСчетов.БухгалтерскийУчет`
- `ПланСчетов.Хозрасчетный`
- `ПланСчетов.Основной`
- `Справочник.СчетаУчета` (если счета хранятся в справочнике)

Используется первый вариант, для которого запрос выполняется успешно.

**Если план счетов не синхронизируется:**
1. В Конфигураторе 1С откройте **Конфигурация** → **Планы счетов** и посмотрите **точное имя** нужного плана (например, `БухгалтерскийУчет`, `Хозрасчетный`, `Основной`).
2. В модуле обработки/HTTP-сервиса в процедуре `ДобавитьЭлементыНСИПланаСчетов` в массив `ИменаПланов` первым добавьте строку с вашим именем плана: `"ПланСчетов.ИмяПлана"`.
3. На портале: **Интеграция с УХ** → **Очистить НСИ** → **Синхронизировать НСИ**.
4. Проверьте: **Справочники** → вкладка **План счетов** — должны появиться счета из 1С.
