import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { message } from 'antd';
import dayjs from 'dayjs';
import { api } from '../../services/api';
import { parseDateSafe } from '../../utils/dateUtils';

type SetString = (value?: string) => void;
type SetItems = (items: any[]) => void;

interface UseDocumentEditOptions {
  documentId?: string;
  form: any;
  navigate: (path: string) => void;
  setItems?: SetItems;
  collections?: Array<{ key: string; setter: SetItems }>;
  setSelectedOrganizationId?: SetString;
  setSelectedCounterpartyId?: SetString;
  setSelectedContractId?: SetString;
  setSelectedWarehouseId?: SetString;
}

function mapDocumentToFormValues(doc: any) {
  return {
    ...doc,
    date: parseDateSafe(doc.date),
    dueDate: parseDateSafe(doc.dueDate),
    startDate: parseDateSafe(doc.startDate),
    endDate: parseDateSafe(doc.endDate),
    periodStart: parseDateSafe(doc.periodStart),
    periodEnd: parseDateSafe(doc.periodEnd),
    invoiceDate: parseDateSafe(doc.invoiceDate),
    serviceStartDate: parseDateSafe(doc.serviceStartDate),
    serviceEndDate: parseDateSafe(doc.serviceEndDate),
    adjustmentDate: parseDateSafe(doc.adjustmentDate),
    validUntil: parseDateSafe(doc.validUntil)
  };
}

export function useDocumentEdit({
  documentId,
  form,
  navigate,
  setItems,
  collections,
  setSelectedOrganizationId,
  setSelectedCounterpartyId,
  setSelectedContractId,
  setSelectedWarehouseId
}: UseDocumentEditOptions) {
  const paramsId = useParams<{ id?: string }>().id;
  const id = documentId || paramsId;
  const isEditMode = !!id;
  const [loading, setLoading] = useState(isEditMode);

  useEffect(() => {
    if (!isEditMode || !id) return;

    const loadDocument = async () => {
      try {
        setLoading(true);
        const response = await api.documents.getById(id);
        const doc = response.data;

        form.setFieldsValue(mapDocumentToFormValues(doc));

        if (setItems && Array.isArray(doc.items)) {
          setItems(doc.items);
        }
        if (collections) {
          collections.forEach(({ key, setter }) => {
            const value = doc[key];
            if (Array.isArray(value)) {
              setter(value);
            }
          });
        }
        if (setSelectedOrganizationId) {
          setSelectedOrganizationId(doc.organizationId);
        }
        if (setSelectedCounterpartyId) {
          setSelectedCounterpartyId(doc.counterpartyId);
        }
        if (setSelectedContractId) {
          setSelectedContractId(doc.contractId);
        }
        if (setSelectedWarehouseId) {
          setSelectedWarehouseId(doc.warehouseId);
        }
      } catch (error: any) {
        message.error('Ошибка загрузки документа: ' + (error.message || 'Неизвестная ошибка'));
        navigate('/documents');
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [id, isEditMode, form, navigate, setItems, collections, setSelectedOrganizationId, setSelectedCounterpartyId, setSelectedContractId, setSelectedWarehouseId]);

  return { id, isEditMode, loading, setLoading };
}
