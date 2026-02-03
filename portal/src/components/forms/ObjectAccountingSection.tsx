/**
 * Блок «Объекты учета» для форм документов.
 * Объекты учета — это конкретные экземпляры объектов (ОС №0005, Проект "А", ЦФО "Отдел продаж" и т.д.),
 * которые используются для детализации документов и аналитики.
 * 
 * Связь с analytics_types:
 * - analytics_types — это "виды аналитик" (разрезы учета): COUNTERPARTY, CONTRACT, WAREHOUSE и т.д.
 * - object_types — это "объекты учета" (что учитываем): FIXED_ASSET, PROJECT, CFO и т.д.
 * - Они могут пересекаться: например, CONTRACT может быть и analytics_type (для субконто), 
 *   и object_type (для карточек договоров с детализацией).
 * - В формах документов используются оба: analytics для субконто, objects для детализации.
 */

import React from 'react';
import { Card, Form, Alert, Space } from 'antd';
import { Link } from 'react-router-dom';
import { InfoCircleOutlined } from '@ant-design/icons';
import { ObjectCardSelect } from './ObjectCardSelect';
import { api } from '../../services/api';
import { useState, useEffect } from 'react';

export interface ObjectAccountingSectionProps {
  /** Показывать выбор основного средства */
  showFixedAsset?: boolean;
  /** Показывать выбор проекта */
  showProject?: boolean;
  /** Показывать выбор ЦФО */
  showCFO?: boolean;
  /** Показывать выбор договора как объекта учета (с детализацией) */
  showContractObject?: boolean;
  /** Имя поля основного средства в Form */
  fixedAssetName?: string;
  /** Имя поля проекта в Form */
  projectName?: string;
  /** Имя поля ЦФО в Form */
  cfoName?: string;
  /** Имя поля договора-объекта в Form */
  contractObjectName?: string;
}

const defaultFixedAssetName = 'fixedAssetId';
const defaultProjectName = 'projectId';
const defaultCFOName = 'cfoId';
const defaultContractObjectName = 'contractObjectId';

export function ObjectAccountingSection({
  showFixedAsset = false,
  showProject = false,
  showCFO = false,
  showContractObject = false,
  fixedAssetName = defaultFixedAssetName,
  projectName = defaultProjectName,
  cfoName = defaultCFOName,
  contractObjectName = defaultContractObjectName
}: ObjectAccountingSectionProps) {
  const [subscriptions, setSubscriptions] = useState<Array<{ typeCode: string; isEnabled: boolean }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSubscriptions = async () => {
      try {
        const response = await api.objects.subscriptions.list();
        setSubscriptions(response.data || []);
      } catch (e) {
        console.error('Ошибка загрузки подписок на объекты учета:', e);
      } finally {
        setLoading(false);
      }
    };
    loadSubscriptions();
  }, []);

  const isSubscribed = (typeCode: string) => {
    return subscriptions.some((s) => s.typeCode === typeCode && s.isEnabled);
  };

  const fixedAssetEnabled = showFixedAsset && isSubscribed('FIXED_ASSET');
  const projectEnabled = showProject && isSubscribed('PROJECT');
  const cfoEnabled = showCFO && isSubscribed('CFO');
  const contractObjectEnabled = showContractObject && isSubscribed('CONTRACT');

  const missing: string[] = [];
  if (showFixedAsset && !fixedAssetEnabled) missing.push('Основное средство');
  if (showProject && !projectEnabled) missing.push('Проект');
  if (showCFO && !cfoEnabled) missing.push('ЦФО');
  if (showContractObject && !contractObjectEnabled) missing.push('Договор (объект учета)');

  const showAny = fixedAssetEnabled || projectEnabled || cfoEnabled || contractObjectEnabled;
  const showMissingHint = missing.length > 0 && !loading;

  if (!showAny && showMissingHint) {
    return (
      <Card size="small" title="Объекты учета" style={{ marginBottom: 16 }}>
        <Alert
          type="info"
          icon={<InfoCircleOutlined />}
          message={
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <span>
                Для использования объектов учета <strong>{missing.join(', ')}</strong> необходимо подключить подписки в настройках организации.
              </span>
              <Link to="/analytics" target="_blank" rel="noopener noreferrer">
                Перейти в настройки объектов учета →
              </Link>
            </Space>
          }
        />
      </Card>
    );
  }

  if (!showAny) return null;

  return (
    <Card size="small" title="Объекты учета" style={{ marginBottom: 16 }}>
      {showMissingHint && (
        <Alert
          type="info"
          icon={<InfoCircleOutlined />}
          message={
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <span>
                Объекты учета <strong>{missing.join(', ')}</strong> недоступны. <Link to="/analytics" target="_blank" rel="noopener noreferrer">Подключить подписки →</Link>
              </span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        />
      )}
      <Form.Item noStyle shouldUpdate>
        {() => (
          <>
            {fixedAssetEnabled && (
              <Form.Item label="Основное средство" name={fixedAssetName}>
                <ObjectCardSelect objectTypeCode="FIXED_ASSET" placeholder="Выберите основное средство" />
              </Form.Item>
            )}
            {projectEnabled && (
              <Form.Item label="Проект" name={projectName}>
                <ObjectCardSelect objectTypeCode="PROJECT" placeholder="Выберите проект" />
              </Form.Item>
            )}
            {cfoEnabled && (
              <Form.Item label="ЦФО" name={cfoName}>
                <ObjectCardSelect objectTypeCode="CFO" placeholder="Выберите ЦФО" />
              </Form.Item>
            )}
            {contractObjectEnabled && (
              <Form.Item label="Договор (объект учета)" name={contractObjectName}>
                <ObjectCardSelect objectTypeCode="CONTRACT" placeholder="Выберите договор" />
              </Form.Item>
            )}
          </>
        )}
      </Form.Item>
    </Card>
  );
}
