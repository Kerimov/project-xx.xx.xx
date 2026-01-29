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
  warehouseId?: string;
  hasDiscrepancies?: boolean;
  originalReceived?: boolean;
  portalStatus: 'Draft' | 'Validated' | 'Frozen' | 'QueuedToUH' | 'SentToUH';
  uhStatus?: 'None' | 'Accepted' | 'Posted' | 'Error';
}

// Поступление товаров (накладная, УПД)
export interface ReceiptGoodsDocument extends DocumentBase {
  type: 'ReceiptGoods';
  items: ReceiptGoodsItem[];
  isUPD?: boolean; // УПД (универсальный передаточный документ)
  invoiceRequired?: boolean;
  totalAmount: number;
  totalVAT: number;
}

export interface ReceiptGoodsItem {
  id?: string;
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
  countryOfOrigin?: string;
}

// Поступление услуг (акт, УПД)
export interface ReceiptServicesDocument extends DocumentBase {
  type: 'ReceiptServices';
  items: ReceiptServicesItem[];
  isUPD?: boolean;
  invoiceRequired?: boolean;
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
