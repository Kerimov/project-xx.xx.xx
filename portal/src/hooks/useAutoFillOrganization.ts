import { useEffect } from 'react';
import { FormInstance } from 'antd';
import { useAuth } from '../contexts/AuthContext';

/**
 * Хук для автоматического заполнения поля organizationId организацией текущего пользователя
 * Используется при создании новых документов (не в режиме редактирования)
 */
export function useAutoFillOrganization(
  form: FormInstance,
  isEditMode: boolean,
  setSelectedOrganizationId?: (value?: string) => void
) {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Автозаполнение только для новых документов (не в режиме редактирования)
    // и только если пользователь загружен
    if (!isEditMode && !loading && user?.organizationId) {
      const currentValue = form.getFieldValue('organizationId');
      // Заполняем только если поле еще не заполнено
      if (!currentValue) {
        form.setFieldsValue({ organizationId: user.organizationId });
        if (setSelectedOrganizationId) {
          setSelectedOrganizationId(user.organizationId);
        }
      }
    }
  }, [form, isEditMode, loading, user?.organizationId, setSelectedOrganizationId]);
}
