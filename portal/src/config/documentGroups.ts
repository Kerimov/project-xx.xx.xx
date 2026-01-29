// Конфигурация групп документов по разделам 1С УХ

export interface DocumentGroup {
  id: string;
  name: string;
  icon?: string;
  subgroups?: DocumentSubgroup[];
  documents?: DocumentTypeConfig[];
}

export interface DocumentSubgroup {
  id: string;
  name: string;
  documents: DocumentTypeConfig[];
}

export interface DocumentTypeConfig {
  type: string;
  label: string;
  description: string;
  formComponent?: string; // название компонента формы
  implemented: boolean;
}

export const documentGroups: DocumentGroup[] = [
  {
    id: 'purchases',
    name: 'Покупки',
    icon: 'ShoppingOutlined',
    subgroups: [
      {
        id: 'receipts',
        name: 'Поступление',
        documents: [
          {
            type: 'ReceiptGoods',
            label: 'Товары (накладная, УПД)',
            description: 'Поступление товаров по накладной или универсальному передаточному документу',
            formComponent: 'ReceiptGoodsForm',
            implemented: true
          },
          {
            type: 'ReceiptServices',
            label: 'Услуги (акт, УПД)',
            description: 'Поступление услуг по акту или универсальному передаточному документу',
            formComponent: 'ReceiptServicesForm',
            implemented: true
          },
          {
            type: 'ReceiptRights',
            label: 'Права (акт, УПД)',
            description: 'Поступление прав по акту или универсальному передаточному документу',
            formComponent: 'ReceiptRightsForm',
            implemented: true
          },
          {
            type: 'ReceiptGoodsServicesCommission',
            label: 'Товары, услуги, комиссия',
            description: 'Комплексное поступление товаров, услуг и комиссионных',
            formComponent: 'ReceiptGoodsServicesCommissionForm',
            implemented: true
          },
          {
            type: 'ReceiptAdditionalExpenses',
            label: 'Поступление доп. расходов',
            description: 'Оформление дополнительных расходов, связанных с закупкой',
            formComponent: 'ReceiptAdditionalExpensesForm',
            implemented: true
          },
          {
            type: 'ReceiptTickets',
            label: 'Поступление билетов',
            description: 'Оформление поступления билетов (авиа, ж/д и т.д.)',
            formComponent: 'ReceiptTicketsForm',
            implemented: true
          }
        ]
      },
      {
        id: 'returns',
        name: 'Возвраты и корректировки',
        documents: [
          {
            type: 'ReturnToSupplier',
            label: 'Возвраты поставщикам',
            description: 'Оформление возврата товаров поставщику',
            formComponent: 'ReturnToSupplierForm',
            implemented: true
          },
          {
            type: 'ReceiptAdjustment',
            label: 'Корректировка поступления',
            description: 'Корректировка ранее оформленного поступления',
            formComponent: 'ReceiptAdjustmentForm',
            implemented: true
          },
          {
            type: 'DiscrepancyAct',
            label: 'Акты о расхождениях',
            description: 'Оформление актов при обнаружении расхождений при приемке',
            formComponent: 'DiscrepancyActForm',
            implemented: true
          }
        ]
      },
      {
        id: 'commission',
        name: 'Комиссия',
        documents: [
          {
            type: 'TransferToConsignor',
            label: 'Передача товаров комитенту',
            description: 'Передача товаров на комиссию',
            formComponent: 'TransferToConsignorForm',
            implemented: true
          },
          {
            type: 'ConsignorReport',
            label: 'Отчеты комитентам',
            description: 'Отчеты комитентов о продаже товаров',
            formComponent: 'ConsignorReportForm',
            implemented: true
          }
        ]
      },
      {
        id: 'invoices',
        name: 'Счета и расчеты',
        documents: [
          {
            type: 'InvoiceFromSupplier',
            label: 'Счета от поставщиков',
            description: 'Регистрация счета на оплату от поставщика',
            formComponent: 'InvoiceFromSupplierForm',
            implemented: true
          },
          {
            type: 'ReceivedInvoice',
            label: 'Счета-фактуры полученные',
            description: 'Регистрация входящих счетов-фактур от поставщиков',
            formComponent: 'ReceivedInvoiceForm',
            implemented: true
          }
        ]
      },
      {
        id: 'other',
        name: 'Прочие документы',
        documents: [
          {
            type: 'PowerOfAttorney',
            label: 'Доверенности',
            description: 'Оформление доверенности на получение товарно-материальных ценностей',
            formComponent: 'PowerOfAttorneyForm',
            implemented: true
          },
          {
            type: 'AdvanceReport',
            label: 'Авансовые отчеты',
            description: 'Оформление авансового отчета подотчетного лица',
            formComponent: 'AdvanceReportForm',
            implemented: true
          }
        ]
      }
    ]
  },
  {
    id: 'sales',
    name: 'Продажи',
    icon: 'DollarOutlined',
    subgroups: [
      {
        id: 'sales',
        name: 'Реализация',
        documents: [
          {
            type: 'SaleGoods',
            label: 'Товары (накладная, УПД)',
            description: 'Реализация товаров покупателю',
            formComponent: 'SaleGoodsForm',
            implemented: true
          },
          {
            type: 'SaleServices',
            label: 'Услуги (акт, УПД)',
            description: 'Реализация услуг покупателю',
            formComponent: 'SaleServicesForm',
            implemented: true
          },
          {
            type: 'SaleRights',
            label: 'Права (акт, УПД)',
            description: 'Реализация прав покупателю',
            formComponent: 'SaleRightsForm',
            implemented: true
          }
        ]
      },
      {
        id: 'sales-returns',
        name: 'Возвраты',
        documents: [
          {
            type: 'ReturnFromBuyer',
            label: 'Возвраты от покупателей',
            description: 'Оформление возврата товаров от покупателя',
            formComponent: 'ReturnFromBuyerForm',
            implemented: true
          },
          {
            type: 'SaleAdjustment',
            label: 'Корректировка реализации',
            description: 'Корректировка ранее оформленной реализации',
            formComponent: 'SaleAdjustmentForm',
            implemented: true
          }
        ]
      },
      {
        id: 'sales-invoices',
        name: 'Счета и расчеты',
        documents: [
          {
            type: 'InvoiceToBuyer',
            label: 'Счета покупателям',
            description: 'Выставление счетов на оплату покупателям',
            formComponent: 'InvoiceToBuyerForm',
            implemented: true
          },
          {
            type: 'IssuedInvoice',
            label: 'Счета-фактуры выданные',
            description: 'Исходящие счета-фактуры покупателям',
            formComponent: 'IssuedInvoiceForm',
            implemented: true
          }
        ]
      }
    ]
  },
  {
    id: 'bank-cash',
    name: 'Банк и касса',
    icon: 'BankOutlined',
    subgroups: [
      {
        id: 'bank',
        name: 'Банковские операции',
        documents: [
          {
            type: 'BankStatement',
            label: 'Выписка банка',
            description: 'Выписка по расчетному счету',
            formComponent: 'BankStatementForm',
            implemented: true
          },
          {
            type: 'PaymentOrderOutgoing',
            label: 'Платежное поручение исходящее',
            description: 'Платежи поставщикам, налогам и т.д.',
            formComponent: 'PaymentOrderOutgoingForm',
            implemented: true
          },
          {
            type: 'PaymentOrderIncoming',
            label: 'Платежное поручение входящее',
            description: 'Поступления от покупателей',
            formComponent: 'PaymentOrderIncomingForm',
            implemented: true
          }
        ]
      },
      {
        id: 'cash',
        name: 'Кассовые операции',
        documents: [
          {
            type: 'CashReceiptOrder',
            label: 'Приходный кассовый ордер (ПКО)',
            description: 'Поступление наличных в кассу',
            formComponent: 'CashReceiptOrderForm',
            implemented: true
          },
          {
            type: 'CashExpenseOrder',
            label: 'Расходный кассовый ордер (РКО)',
            description: 'Выдача наличных из кассы',
            formComponent: 'CashExpenseOrderForm',
            implemented: true
          }
        ]
      }
    ]
  },
  {
    id: 'warehouse',
    name: 'Склад',
    icon: 'InboxOutlined',
    subgroups: [
      {
        id: 'movement',
        name: 'Движение товаров',
        documents: [
          {
            type: 'GoodsTransfer',
            label: 'Перемещение товаров',
            description: 'Перемещение между складами',
            formComponent: 'GoodsTransferForm',
            implemented: true
          },
          {
            type: 'Inventory',
            label: 'Инвентаризация',
            description: 'Инвентаризация товаров на складе',
            formComponent: 'InventoryForm',
            implemented: true
          },
          {
            type: 'GoodsWriteOff',
            label: 'Списание товаров',
            description: 'Списание испорченных/утерянных товаров',
            formComponent: 'GoodsWriteOffForm',
            implemented: true
          },
          {
            type: 'GoodsReceipt',
            label: 'Оприходование товаров',
            description: 'Оприходование излишков',
            formComponent: 'GoodsReceiptForm',
            implemented: true
          }
        ]
      }
    ]
  }
];
