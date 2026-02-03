/**
 * Блок «Аналитики» для форм документов.
 * Аналитики в 1С — субконто (договор, склад, счёт и т.д.), по которым детализируются проводки.
 * Значения передаются в 1С при отправке документа и заполняют реквизиты Договор, Склад и др.
 */

import React from 'react';
import { Card, Form } from 'antd';
import { ContractSelect } from './ContractSelect';
import { WarehouseSelect } from './WarehouseSelect';
import { AccountSelect } from './AccountSelect';
import { useAnalyticsAccess } from '../../contexts/AnalyticsAccessContext';

export interface AnalyticsSectionProps {
  /** Показывать выбор договора */
  showContract?: boolean;
  /** Показывать выбор склада */
  showWarehouse?: boolean;
  /** Показывать выбор счёта (банк/касса) */
  showAccount?: boolean;
  /** ID организации — для фильтра договоров/складов/счетов */
  organizationId?: string;
  /** ID контрагента — для фильтра договоров */
  counterpartyId?: string;
  /** Обязательность склада */
  warehouseRequired?: boolean;
  /** Имя поля договора в Form */
  contractName?: string;
  /** Имя поля склада в Form */
  warehouseName?: string;
  /** Имя поля счёта в Form */
  accountName?: string;
}

const defaultContractName = 'contractId';
const defaultWarehouseName = 'warehouseId';
const defaultAccountName = 'accountId';

export function AnalyticsSection({
  showContract = true,
  showWarehouse = false,
  showAccount = false,
  organizationId,
  counterpartyId,
  warehouseRequired = false,
  contractName = defaultContractName,
  warehouseName = defaultWarehouseName,
  accountName = defaultAccountName
}: AnalyticsSectionProps) {
  const { isEnabled } = useAnalyticsAccess();

  // Гейт по подпискам организации: показываем только доступные аналитики
  const contractEnabled = showContract && isEnabled('CONTRACT');
  const warehouseEnabled = showWarehouse && isEnabled('WAREHOUSE');
  const accountEnabled = showAccount && (isEnabled('ACCOUNT') || isEnabled('BANK_ACCOUNT'));

  const showAny = contractEnabled || warehouseEnabled || accountEnabled;
  if (!showAny) return null;

  return (
    <Card size="small" title="Аналитики" style={{ marginBottom: 16 }}>
      <Form.Item noStyle shouldUpdate>
        {() => (
          <>
            {contractEnabled && (
              <Form.Item label="Договор" name={contractName}>
                <ContractSelect
                  organizationId={organizationId}
                  counterpartyId={counterpartyId}
                  placeholder="Договор контрагента (субконто)"
                />
              </Form.Item>
            )}
            {warehouseEnabled && (
              <Form.Item
                label="Склад"
                name={warehouseName}
                rules={warehouseRequired ? [{ required: true, message: 'Выберите склад' }] : undefined}
              >
                <WarehouseSelect
                  placeholder="Склад (субконто)"
                />
              </Form.Item>
            )}
            {accountEnabled && (
              <Form.Item label="Счёт" name={accountName}>
                <AccountSelect
                  organizationId={organizationId}
                  placeholder="Банковский счёт / касса (субконто)"
                />
              </Form.Item>
            )}
          </>
        )}
      </Form.Item>
    </Card>
  );
}
