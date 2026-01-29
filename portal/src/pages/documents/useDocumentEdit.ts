import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { message } from 'antd';
import dayjs from 'dayjs';
import { api } from '../../services/api';

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
    date: doc.date ? dayjs(doc.date) : undefined,
    dueDate: doc.dueDate ? dayjs(doc.dueDate) : undefined,
    startDate: doc.startDate ? dayjs(doc.startDate) : undefined,
    endDate: doc.endDate ? dayjs(doc.endDate) : undefined,
    periodStart: doc.periodStart ? dayjs(doc.periodStart) : undefined,
    periodEnd: doc.periodEnd ? dayjs(doc.periodEnd) : undefined,
    invoiceDate: doc.invoiceDate ? dayjs(doc.invoiceDate) : undefined,
    serviceStartDate: doc.serviceStartDate ? dayjs(doc.serviceStartDate) : undefined,
    serviceEndDate: doc.serviceEndDate ? dayjs(doc.serviceEndDate) : undefined,
    adjustmentDate: doc.adjustmentDate ? dayjs(doc.adjustmentDate) : undefined,
    validUntil: doc.validUntil ? dayjs(doc.validUntil) : undefined
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
