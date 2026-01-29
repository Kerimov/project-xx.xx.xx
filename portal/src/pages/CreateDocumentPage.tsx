import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CreateReceiptServicesPage } from './CreateReceiptServicesPage';
import { ReceiptRightsPage } from './documents/ReceiptRightsPage';
import { InvoiceFromSupplierPage } from './documents/InvoiceFromSupplierPage';
import { PowerOfAttorneyPage } from './documents/PowerOfAttorneyPage';
import { AdvanceReportPage } from './documents/AdvanceReportPage';
import { ReceiptGoodsServicesCommissionPage } from './documents/ReceiptGoodsServicesCommissionPage';
import { ReceiptAdditionalExpensesPage } from './documents/ReceiptAdditionalExpensesPage';
import { ReceiptTicketsPage } from './documents/ReceiptTicketsPage';
import { ReturnToSupplierPage } from './documents/ReturnToSupplierPage';
import { ReceiptAdjustmentPage } from './documents/ReceiptAdjustmentPage';
import { DiscrepancyActPage } from './documents/DiscrepancyActPage';
import { TransferToConsignorPage } from './documents/TransferToConsignorPage';
import { ConsignorReportPage } from './documents/ConsignorReportPage';
import { ReceivedInvoicePage } from './documents/ReceivedInvoicePage';
import { SaleGoodsPage } from './documents/SaleGoodsPage';
import { SaleServicesPage } from './documents/SaleServicesPage';
import { SaleRightsPage } from './documents/SaleRightsPage';
import { ReturnFromBuyerPage } from './documents/ReturnFromBuyerPage';
import { SaleAdjustmentPage } from './documents/SaleAdjustmentPage';
import { InvoiceToBuyerPage } from './documents/InvoiceToBuyerPage';
import { IssuedInvoicePage } from './documents/IssuedInvoicePage';
import { BankStatementPage } from './documents/BankStatementPage';
import { PaymentOrderOutgoingPage } from './documents/PaymentOrderOutgoingPage';
import { PaymentOrderIncomingPage } from './documents/PaymentOrderIncomingPage';
import { CashReceiptOrderPage } from './documents/CashReceiptOrderPage';
import { CashExpenseOrderPage } from './documents/CashExpenseOrderPage';
import { GoodsTransferPage } from './documents/GoodsTransferPage';
import { InventoryPage } from './documents/InventoryPage';
import { GoodsWriteOffPage } from './documents/GoodsWriteOffPage';
import { GoodsReceiptPage } from './documents/GoodsReceiptPage';
import { api } from '../services/api';

export function CreateDocumentPage() {
  const navigate = useNavigate();
  const { type, id } = useParams<{ type?: string; id?: string }>();
  
  // Если есть id, значит это режим редактирования - определяем type из документа
  const [documentType, setDocumentType] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (id) {
      // Загружаем документ для определения типа
      api.documents.getById(id).then((response) => {
        setDocumentType(response.data.type);
        setLoading(false);
      }).catch(() => {
        setLoading(false);
        navigate('/documents');
      });
    }
  }, [id, navigate]);

  if (loading) {
    return <div>Загрузка...</div>;
  }

  const actualType = type || documentType;
  if (!actualType) {
    navigate('/documents');
    return null;
  }

  // Роутинг по типу документа
  switch (actualType) {
    case 'ReceiptServices':
      return <CreateReceiptServicesPage documentId={id} />;
    case 'ReceiptRights':
      return <ReceiptRightsPage documentId={id} />;
    case 'InvoiceFromSupplier':
      return <InvoiceFromSupplierPage documentId={id} />;
    case 'PowerOfAttorney':
      return <PowerOfAttorneyPage documentId={id} />;
    case 'AdvanceReport':
      return <AdvanceReportPage documentId={id} />;
    case 'ReceiptGoodsServicesCommission':
      return <ReceiptGoodsServicesCommissionPage documentId={id} />;
    case 'ReceiptAdditionalExpenses':
      return <ReceiptAdditionalExpensesPage documentId={id} />;
    case 'ReceiptTickets':
      return <ReceiptTicketsPage documentId={id} />;
    case 'ReturnToSupplier':
      return <ReturnToSupplierPage documentId={id} />;
    case 'ReceiptAdjustment':
      return <ReceiptAdjustmentPage documentId={id} />;
    case 'DiscrepancyAct':
      return <DiscrepancyActPage documentId={id} />;
    case 'TransferToConsignor':
      return <TransferToConsignorPage documentId={id} />;
    case 'ConsignorReport':
      return <ConsignorReportPage documentId={id} />;
    case 'ReceivedInvoice':
      return <ReceivedInvoicePage documentId={id} />;
    case 'SaleGoods':
      return <SaleGoodsPage documentId={id} />;
    case 'SaleServices':
      return <SaleServicesPage documentId={id} />;
    case 'SaleRights':
      return <SaleRightsPage documentId={id} />;
    case 'ReturnFromBuyer':
      return <ReturnFromBuyerPage documentId={id} />;
    case 'SaleAdjustment':
      return <SaleAdjustmentPage documentId={id} />;
    case 'InvoiceToBuyer':
      return <InvoiceToBuyerPage documentId={id} />;
    case 'IssuedInvoice':
      return <IssuedInvoicePage documentId={id} />;
    case 'BankStatement':
      return <BankStatementPage documentId={id} />;
    case 'PaymentOrderOutgoing':
      return <PaymentOrderOutgoingPage documentId={id} />;
    case 'PaymentOrderIncoming':
      return <PaymentOrderIncomingPage documentId={id} />;
    case 'CashReceiptOrder':
      return <CashReceiptOrderPage documentId={id} />;
    case 'CashExpenseOrder':
      return <CashExpenseOrderPage documentId={id} />;
    case 'GoodsTransfer':
      return <GoodsTransferPage documentId={id} />;
    case 'Inventory':
      return <InventoryPage documentId={id} />;
    case 'GoodsWriteOff':
      return <GoodsWriteOffPage documentId={id} />;
    case 'GoodsReceipt':
      return <GoodsReceiptPage documentId={id} />;
    case 'ReceiptGoods':
    default:
      // По умолчанию показываем форму "Поступление товаров"
      return <GoodsReceiptPage documentId={id} />;
  }
}
