/**
 * Конфигурация интеграции с 1С:УХ по видам документов.
 * Соответствие типов портала типам документов 1С и обязательные реквизиты.
 *
 * Типы документов 1С см. в конфигурации УХ (ПоступлениеТоваровУслуг,
 * РеализацияТоваровУслуг, ОприходованиеТоваров, ПеремещениеТоваров и т.д.).
 */

export interface UHDocumentTypeConfig {
  /** Код типа документа на портале (англ.) */
  portalType: string;
  /** Имя типа документа в 1С (для маппинга в обработке 1С) */
  uhTypeName: string;
  /** Обязательные реквизиты на уровне документа (поле в payload) */
  requiredFields: string[];
  /** Реквизиты, которые передаём в 1С при наличии */
  optionalFields: string[];
  /** Документ имеет табличную часть «Товары/Услуги» */
  hasItems: boolean;
  /** Обязательные поля в строке табличной части (для hasItems) */
  itemRequiredFields?: string[];
  /** Документ привязан к складу (организация + склад из НСИ) */
  requiresWarehouse?: boolean;
  /** Документ привязан к счёту (банк/касса) */
  requiresAccount?: boolean;
}

/**
 * Список типов документов портала и их настройка для 1С:УХ.
 * Обработка 1С (ОпределитьТипДокумента1С) должна использовать тот же portalType.
 */
export const UH_DOCUMENT_TYPES: UHDocumentTypeConfig[] = [
  // —— Покупки: поступление ——
  {
    portalType: 'ReceiptGoods',
    uhTypeName: 'ПоступлениеТоваровУслуг',
    requiredFields: ['type', 'number', 'date', 'sourceCompany', 'counterpartyName', 'totalAmount', 'currency'],
    optionalFields: ['counterpartyInn', 'contractId', 'warehouseId', 'warehouseName', 'dueDate', 'vatOnTop', 'vatIncluded'],
    hasItems: true,
    itemRequiredFields: ['nomenclatureName', 'quantity', 'unit', 'price', 'totalAmount', 'vatPercent'],
    requiresWarehouse: true
  },
  {
    portalType: 'ReceiptServices',
    uhTypeName: 'ПоступлениеТоваровУслуг',
    requiredFields: ['type', 'number', 'date', 'sourceCompany', 'counterpartyName', 'totalAmount', 'currency'],
    optionalFields: ['counterpartyInn', 'contractId', 'servicePeriod', 'serviceStartDate', 'serviceEndDate'],
    hasItems: true,
    itemRequiredFields: ['serviceName', 'quantity', 'unit', 'price', 'totalAmount', 'vatPercent'],
    requiresWarehouse: false
  },
  {
    portalType: 'ReceiptRights',
    uhTypeName: 'ПоступлениеТоваровУслуг',
    requiredFields: ['type', 'number', 'date', 'sourceCompany', 'counterpartyName', 'totalAmount', 'currency'],
    optionalFields: ['counterpartyInn', 'contractId'],
    hasItems: true,
    itemRequiredFields: ['nomenclatureName', 'quantity', 'unit', 'price', 'totalAmount', 'vatPercent'],
    requiresWarehouse: false
  },
  {
    portalType: 'ReceiptGoodsServicesCommission',
    uhTypeName: 'ПоступлениеТоваровУслуг',
    requiredFields: ['type', 'number', 'date', 'sourceCompany', 'counterpartyName', 'totalAmount', 'currency'],
    optionalFields: ['counterpartyInn', 'contractId', 'warehouseId', 'warehouseName'],
    hasItems: true,
    itemRequiredFields: ['nomenclatureName', 'quantity', 'unit', 'price', 'totalAmount', 'vatPercent'],
    requiresWarehouse: false
  },
  {
    portalType: 'ReceiptAdditionalExpenses',
    uhTypeName: 'ПоступлениеДопРасходов',
    requiredFields: ['type', 'number', 'date', 'sourceCompany', 'counterpartyName', 'totalAmount', 'currency'],
    optionalFields: ['counterpartyInn', 'contractId'],
    hasItems: true,
    itemRequiredFields: ['nomenclatureName', 'quantity', 'unit', 'price', 'totalAmount', 'vatPercent'],
    requiresWarehouse: false
  },
  {
    portalType: 'ReceiptTickets',
    uhTypeName: 'ПоступлениеБилетов',
    requiredFields: ['type', 'number', 'date', 'sourceCompany', 'counterpartyName', 'totalAmount', 'currency'],
    optionalFields: ['counterpartyInn', 'contractId'],
    hasItems: true,
    itemRequiredFields: ['nomenclatureName', 'quantity', 'unit', 'price', 'totalAmount', 'vatPercent'],
    requiresWarehouse: false
  },
  // —— Покупки: возвраты и корректировки ——
  {
    portalType: 'ReturnToSupplier',
    uhTypeName: 'ВозвратТоваровПоставщику',
    requiredFields: ['type', 'number', 'date', 'sourceCompany', 'counterpartyName', 'totalAmount', 'currency'],
    optionalFields: ['counterpartyInn', 'contractId', 'warehouseId', 'warehouseName'],
    hasItems: true,
    itemRequiredFields: ['nomenclatureName', 'quantity', 'unit', 'price', 'totalAmount', 'vatPercent'],
    requiresWarehouse: true
  },
  {
    portalType: 'ReceiptAdjustment',
    uhTypeName: 'КорректировкаПоступления',
    requiredFields: ['type', 'number', 'date', 'sourceCompany', 'counterpartyName', 'totalAmount', 'currency'],
    optionalFields: ['counterpartyInn', 'contractId'],
    hasItems: true,
    itemRequiredFields: ['nomenclatureName', 'quantity', 'unit', 'price', 'totalAmount', 'vatPercent'],
    requiresWarehouse: false
  },
  {
    portalType: 'DiscrepancyAct',
    uhTypeName: 'АктРасхождений',
    requiredFields: ['type', 'number', 'date', 'sourceCompany', 'counterpartyName', 'totalAmount', 'currency'],
    optionalFields: ['counterpartyInn', 'contractId', 'warehouseId', 'warehouseName'],
    hasItems: true,
    itemRequiredFields: ['nomenclatureName', 'quantity', 'unit', 'price', 'totalAmount', 'vatPercent'],
    requiresWarehouse: true
  },
  // —— Покупки: счета ——
  {
    portalType: 'InvoiceFromSupplier',
    uhTypeName: 'СчетНаОплату',
    requiredFields: ['type', 'number', 'date', 'sourceCompany', 'counterpartyName', 'totalAmount', 'currency'],
    optionalFields: ['counterpartyInn', 'contractId', 'dueDate'],
    hasItems: false,
    requiresWarehouse: false
  },
  {
    portalType: 'ReceivedInvoice',
    uhTypeName: 'СчетФактураПолученный',
    requiredFields: ['type', 'number', 'date', 'sourceCompany', 'counterpartyName', 'totalAmount', 'currency'],
    optionalFields: ['counterpartyInn', 'contractId'],
    hasItems: true,
    itemRequiredFields: ['nomenclatureName', 'quantity', 'unit', 'price', 'totalAmount', 'vatPercent'],
    requiresWarehouse: false
  },
  // —— Продажи ——
  {
    portalType: 'SaleGoods',
    uhTypeName: 'РеализацияТоваровУслуг',
    requiredFields: ['type', 'number', 'date', 'sourceCompany', 'counterpartyName', 'totalAmount', 'currency'],
    optionalFields: ['counterpartyInn', 'contractId', 'warehouseId', 'warehouseName'],
    hasItems: true,
    itemRequiredFields: ['nomenclatureName', 'quantity', 'unit', 'price', 'totalAmount', 'vatPercent'],
    requiresWarehouse: true
  },
  {
    portalType: 'SaleServices',
    uhTypeName: 'РеализацияТоваровУслуг',
    requiredFields: ['type', 'number', 'date', 'sourceCompany', 'counterpartyName', 'totalAmount', 'currency'],
    optionalFields: ['counterpartyInn', 'contractId'],
    hasItems: true,
    itemRequiredFields: ['serviceName', 'quantity', 'unit', 'price', 'totalAmount', 'vatPercent'],
    requiresWarehouse: false
  },
  {
    portalType: 'SaleRights',
    uhTypeName: 'РеализацияТоваровУслуг',
    requiredFields: ['type', 'number', 'date', 'sourceCompany', 'counterpartyName', 'totalAmount', 'currency'],
    optionalFields: ['counterpartyInn', 'contractId'],
    hasItems: true,
    itemRequiredFields: ['nomenclatureName', 'quantity', 'unit', 'price', 'totalAmount', 'vatPercent'],
    requiresWarehouse: false
  },
  {
    portalType: 'ReturnFromBuyer',
    uhTypeName: 'ВозвратТоваровОтПокупателя',
    requiredFields: ['type', 'number', 'date', 'sourceCompany', 'counterpartyName', 'totalAmount', 'currency'],
    optionalFields: ['counterpartyInn', 'contractId', 'warehouseId', 'warehouseName'],
    hasItems: true,
    itemRequiredFields: ['nomenclatureName', 'quantity', 'unit', 'price', 'totalAmount', 'vatPercent'],
    requiresWarehouse: true
  },
  {
    portalType: 'SaleAdjustment',
    uhTypeName: 'КорректировкаРеализации',
    requiredFields: ['type', 'number', 'date', 'sourceCompany', 'counterpartyName', 'totalAmount', 'currency'],
    optionalFields: ['counterpartyInn', 'contractId'],
    hasItems: true,
    itemRequiredFields: ['nomenclatureName', 'quantity', 'unit', 'price', 'totalAmount', 'vatPercent'],
    requiresWarehouse: false
  },
  {
    portalType: 'InvoiceToBuyer',
    uhTypeName: 'СчетНаОплату',
    requiredFields: ['type', 'number', 'date', 'sourceCompany', 'counterpartyName', 'totalAmount', 'currency'],
    optionalFields: ['counterpartyInn', 'contractId', 'dueDate'],
    hasItems: false,
    requiresWarehouse: false
  },
  {
    portalType: 'IssuedInvoice',
    uhTypeName: 'СчетФактураВыданный',
    requiredFields: ['type', 'number', 'date', 'sourceCompany', 'counterpartyName', 'totalAmount', 'currency'],
    optionalFields: ['counterpartyInn', 'contractId'],
    hasItems: true,
    itemRequiredFields: ['nomenclatureName', 'quantity', 'unit', 'price', 'totalAmount', 'vatPercent'],
    requiresWarehouse: false
  },
  // —— Банк и касса ——
  {
    portalType: 'BankStatement',
    uhTypeName: 'ВыпискаБанка',
    requiredFields: ['type', 'number', 'date', 'sourceCompany', 'totalAmount', 'currency'],
    optionalFields: ['accountId', 'accountName', 'counterpartyName', 'counterpartyInn'],
    hasItems: false,
    requiresWarehouse: false,
    requiresAccount: true
  },
  {
    portalType: 'PaymentOrderOutgoing',
    uhTypeName: 'ПлатежноеПоручениеИсходящее',
    requiredFields: ['type', 'number', 'date', 'sourceCompany', 'counterpartyName', 'totalAmount', 'currency'],
    optionalFields: ['counterpartyInn', 'contractId', 'accountId', 'accountName', 'purpose'],
    hasItems: false,
    requiresWarehouse: false,
    requiresAccount: true
  },
  {
    portalType: 'PaymentOrderIncoming',
    uhTypeName: 'ПлатежноеПоручениеВходящее',
    requiredFields: ['type', 'number', 'date', 'sourceCompany', 'counterpartyName', 'totalAmount', 'currency'],
    optionalFields: ['counterpartyInn', 'contractId', 'accountId', 'accountName', 'purpose'],
    hasItems: false,
    requiresWarehouse: false,
    requiresAccount: true
  },
  {
    portalType: 'CashReceiptOrder',
    uhTypeName: 'ПриходныйКассовыйОрдер',
    requiredFields: ['type', 'number', 'date', 'sourceCompany', 'totalAmount', 'currency'],
    optionalFields: ['counterpartyName', 'counterpartyInn', 'purpose'],
    hasItems: false,
    requiresWarehouse: false
  },
  {
    portalType: 'CashExpenseOrder',
    uhTypeName: 'РасходныйКассовыйОрдер',
    requiredFields: ['type', 'number', 'date', 'sourceCompany', 'totalAmount', 'currency'],
    optionalFields: ['counterpartyName', 'counterpartyInn', 'purpose'],
    hasItems: false,
    requiresWarehouse: false
  },
  // —— Склад ——
  {
    portalType: 'GoodsTransfer',
    uhTypeName: 'ПеремещениеТоваров',
    requiredFields: ['type', 'number', 'date', 'sourceCompany', 'totalAmount', 'currency'],
    optionalFields: ['warehouseIdFrom', 'warehouseNameFrom', 'warehouseIdTo', 'warehouseNameTo'],
    hasItems: true,
    itemRequiredFields: ['nomenclatureName', 'quantity', 'unit', 'price', 'totalAmount', 'vatPercent'],
    requiresWarehouse: true
  },
  {
    portalType: 'GoodsWriteOff',
    uhTypeName: 'СписаниеТоваров',
    requiredFields: ['type', 'number', 'date', 'sourceCompany', 'totalAmount', 'currency'],
    optionalFields: ['counterpartyName', 'warehouseId', 'warehouseName'],
    hasItems: true,
    itemRequiredFields: ['nomenclatureName', 'quantity', 'unit', 'price', 'totalAmount', 'vatPercent'],
    requiresWarehouse: true
  },
  {
    portalType: 'GoodsReceipt',
    uhTypeName: 'ОприходованиеТоваров',
    requiredFields: ['type', 'number', 'date', 'sourceCompany', 'totalAmount', 'currency'],
    optionalFields: ['counterpartyName', 'counterpartyInn', 'warehouseId', 'warehouseName'],
    hasItems: true,
    itemRequiredFields: ['nomenclatureName', 'quantity', 'unit', 'price', 'totalAmount', 'vatPercent'],
    requiresWarehouse: true
  },
  {
    portalType: 'Inventory',
    uhTypeName: 'ИнвентаризацияТоваров',
    requiredFields: ['type', 'number', 'date', 'sourceCompany', 'totalAmount', 'currency'],
    optionalFields: ['warehouseId', 'warehouseName'],
    hasItems: true,
    itemRequiredFields: ['nomenclatureName', 'quantity', 'unit', 'price', 'totalAmount', 'vatPercent'],
    requiresWarehouse: true
  },
  // —— Комиссия, прочее ——
  {
    portalType: 'TransferToConsignor',
    uhTypeName: 'ПередачаТоваровКомитенту',
    requiredFields: ['type', 'number', 'date', 'sourceCompany', 'counterpartyName', 'totalAmount', 'currency'],
    optionalFields: ['counterpartyInn', 'contractId', 'warehouseId', 'warehouseName'],
    hasItems: true,
    itemRequiredFields: ['nomenclatureName', 'quantity', 'unit', 'price', 'totalAmount', 'vatPercent'],
    requiresWarehouse: true
  },
  {
    portalType: 'ConsignorReport',
    uhTypeName: 'ОтчетКомитенту',
    requiredFields: ['type', 'number', 'date', 'sourceCompany', 'counterpartyName', 'totalAmount', 'currency'],
    optionalFields: ['counterpartyInn', 'contractId'],
    hasItems: true,
    itemRequiredFields: ['nomenclatureName', 'quantity', 'unit', 'price', 'totalAmount', 'vatPercent'],
    requiresWarehouse: false
  },
  {
    portalType: 'PowerOfAttorney',
    uhTypeName: 'Доверенность',
    requiredFields: ['type', 'number', 'date', 'sourceCompany', 'counterpartyName'],
    optionalFields: ['counterpartyInn', 'contractId', 'dueDate'],
    hasItems: false,
    requiresWarehouse: false
  },
  {
    portalType: 'AdvanceReport',
    uhTypeName: 'АвансовыйОтчет',
    requiredFields: ['type', 'number', 'date', 'sourceCompany', 'totalAmount', 'currency'],
    optionalFields: ['counterpartyName', 'counterpartyInn', 'purpose'],
    hasItems: true,
    itemRequiredFields: ['nomenclatureName', 'quantity', 'unit', 'price', 'totalAmount', 'vatPercent'],
    requiresWarehouse: false
  }
];

const byPortalType = new Map<string, UHDocumentTypeConfig>();
UH_DOCUMENT_TYPES.forEach(c => byPortalType.set(c.portalType, c));

/** Конфиг по типу документа портала */
export function getUHDocumentConfig(portalType: string): UHDocumentTypeConfig | undefined {
  return byPortalType.get(portalType);
}

/** Проверка: тип документа поддерживается интеграцией */
export function isSupportedDocumentType(portalType: string): boolean {
  return byPortalType.has(portalType);
}
