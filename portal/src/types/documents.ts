// Типы документов первички для портала ЕЦОФ

export type DocumentType =
  | 'ReceiptGoods' // Поступление товаров (накладная, УПД)
  | 'ReceiptServices' // Поступление услуг (акт, УПД)
  | 'ReceiptRights' // Поступление прав (акт, УПД)
  | 'InvoiceFromSupplier' // Счет от поставщика
  | 'PowerOfAttorney' // Доверенность
  | 'AdvanceReport'; // Авансовый отчет

export interface DocumentBase {
  id?: string;
  number: string;
  date: string;
  type: DocumentType;
  organizationId: string;
  counterpartyId?: string;
  counterpartyName?: string;
  counterpartyInn?: string;
  contractId?: string;
  paymentAccountId?: string;
  originalReceived?: boolean;
  portalStatus: 'Draft' | 'Validated' | 'Frozen' | 'QueuedToUH' | 'SentToUH';
  uhStatus?: 'None' | 'Accepted' | 'Posted' | 'Error';
}

// Поступление товаров (накладная, УПД)
export interface ReceiptGoodsDocument extends DocumentBase {
  type: 'ReceiptGoods';
  documentNumber?: string; // Дополнительное поле "Номер"
  warehouseId?: string; // Склад (обязательное для товаров)
  hasDiscrepancies?: boolean; // Есть расхождения
  paymentTerms?: string; // Расчеты: срок, счета (60.01, 60.02)
  consignor?: string; // Грузоотправитель
  consignee?: string; // Грузополучатель
  vatOnTop?: boolean; // НДС сверху
  vatIncluded?: boolean; // НДС включен в стоимость
  items: ReceiptGoodsItem[];
  isUPD?: boolean; // УПД (универсальный передаточный документ)
  invoiceRequired?: 'notRequired' | 'required'; // Счет-фактура
  totalAmount: number;
  totalVAT: number;
}

export interface ReceiptGoodsItem {
  id?: string;
  rowNumber?: number; // N - порядковый номер строки
  nomenclatureId?: string;
  nomenclatureName: string;
  quantity: number;
  unit: string; // единица измерения
  price: number;
  amount: number;
  vatPercent: number;
  vatAmount: number;
  totalAmount: number;
  accountId?: string; // счет учета
  countryOfOrigin?: string; // Страна происхождения
}

// Поступление услуг (акт, УПД)
export interface ReceiptServicesDocument extends DocumentBase {
  type: 'ReceiptServices';
  documentNumber?: string; // Дополнительное поле "Номер"
  servicePeriod?: string; // Период оказания услуг
  serviceStartDate?: string; // Дата начала оказания услуг
  serviceEndDate?: string; // Дата окончания оказания услуг
  items: ReceiptServicesItem[];
  isUPD?: boolean;
  invoiceRequired?: 'notRequired' | 'required'; // Счет-фактура
  totalAmount: number;
  totalVAT: number;
}

export interface ReceiptServicesItem {
  id?: string;
  serviceId?: string;
  serviceName: string;
  quantity: number;
  unit: string;
  price: number;
  amount: number;
  vatPercent: number;
  vatAmount: number;
  totalAmount: number;
  accountId?: string;
}

// Номенклатура (справочник)
export interface Nomenclature {
  id: string;
  type: 'Goods' | 'Service' | 'Material' | 'FixedAsset';
  name: string;
  fullName?: string;
  article?: string;
  unit: string;
  vatPercent: number;
  groupId?: string;
  countryOfOrigin?: string;
  manufacturer?: string;
}
