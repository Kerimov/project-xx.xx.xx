/**
 * Блок «Аналитики» для форм документов.
 * Аналитики в 1С — субконто (договор, склад, счёт и т.д.), по которым детализируются проводки.
 * Значения передаются в 1С при отправке документа и заполняют реквизиты Договор, Склад и др.
 */

import React from 'react';
import { Card, Form, Alert, Space } from 'antd';
import { Link } from 'react-router-dom';
import { InfoCircleOutlined } from '@ant-design/icons';
import { AnalyticsValueSelect } from './AnalyticsValueSelect';
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
  const { isEnabled, loading } = useAnalyticsAccess();

  // Проверяем доступность аналитик
  const contractEnabled = showContract && isEnabled('CONTRACT');
  const warehouseEnabled = showWarehouse && isEnabled('WAREHOUSE');
  const accountEnabled = showAccount && (isEnabled('ACCOUNT') || isEnabled('BANK_ACCOUNT'));
  const accountTypeCode = isEnabled('ACCOUNT') ? 'ACCOUNT' : 'BANK_ACCOUNT';

  // Собираем список недоступных аналитик для подсказки
  const missing: string[] = [];
  if (showContract && !contractEnabled) missing.push('Договор');
  if (showWarehouse && !warehouseEnabled) missing.push('Склад');
  if (showAccount && !accountEnabled) missing.push('Счёт (банк/касса)');

  const showAny = contractEnabled || warehouseEnabled || accountEnabled;
  const showMissingHint = missing.length > 0 && !loading;

  // Если ничего не доступно и есть недоступные — показываем только подсказку
  if (!showAny && showMissingHint) {
    return (
      <Card size="small" title="Аналитики" style={{ marginBottom: 16 }}>
        <Alert
          type="info"
          icon={<InfoCircleOutlined />}
          message={
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <span>
                Для использования аналитик <strong>{missing.join(', ')}</strong> необходимо подключить подписки в настройках организации.
              </span>
              <Link to="/analytics" target="_blank" rel="noopener noreferrer">
                Перейти в настройки аналитик →
              </Link>
            </Space>
          }
        />
      </Card>
    );
  }

  // Если ничего не доступно и нет недоступных — не показываем секцию
  if (!showAny) return null;

  return (
    <Card size="small" title="Аналитики" style={{ marginBottom: 16 }}>
      {showMissingHint && (
        <Alert
          type="info"
          icon={<InfoCircleOutlined />}
          message={
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <span>
                Аналитики <strong>{missing.join(', ')}</strong> недоступны. <Link to="/analytics" target="_blank" rel="noopener noreferrer">Подключить подписки →</Link>
              </span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        />
      )}
      <Form.Item noStyle shouldUpdate>
        {() => (
          <>
            {contractEnabled && (
              <Form.Item label="Договор" name={contractName}>
                <AnalyticsValueSelect
                  typeCode="CONTRACT"
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
                <AnalyticsValueSelect
                  typeCode="WAREHOUSE"
                  organizationId={organizationId}
                  placeholder="Склад (субконто)"
                />
              </Form.Item>
            )}
            {accountEnabled && (
              <Form.Item label="Счёт" name={accountName}>
                <AnalyticsValueSelect
                  typeCode={accountTypeCode}
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
