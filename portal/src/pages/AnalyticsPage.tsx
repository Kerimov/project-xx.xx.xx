import { useEffect, useMemo, useState } from 'react';
import { Card, Checkbox, Col, Divider, Form, Input, Row, Space, Typography, message, Button, Tag } from 'antd';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useAnalyticsAccess } from '../contexts/AnalyticsAccessContext';

type TypeRow = { id: string; code: string; name: string; directionId: string | null; isActive: boolean };
type SubRow = { typeId: string; typeCode: string; typeName: string; isEnabled: boolean };

export function AnalyticsPage() {
  const { user } = useAuth();
  const { refresh: refreshAccess } = useAnalyticsAccess();
  const isOrgAdmin = useMemo(() => user?.role === 'org_admin' || user?.role === 'ecof_admin', [user?.role]);
  const [types, setTypes] = useState<TypeRow[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingTypeId, setSavingTypeId] = useState<string | null>(null);

  const enabledSet = useMemo(() => new Set(subs.filter((s) => s.isEnabled).map((s) => s.typeId)), [subs]);
  
  // Для сотрудников показываем только подписанные аналитики
  const displayedTypes = useMemo(() => {
    if (isOrgAdmin) {
      // Администратор видит все аналитики
      return types.filter((t) => t.isActive);
    } else {
      // Сотрудник видит только подписанные аналитики
      return types.filter((t) => t.isActive && enabledSet.has(t.id));
    }
  }, [types, enabledSet, isOrgAdmin]);

  const load = async () => {
    try {
      setLoading(true);
      const [tRes, sRes] = await Promise.all([
        api.analytics.listTypes(),
        api.analytics.listSubscriptions()
      ]);
      setTypes(tRes.data || []);
      setSubs(sRes.data || []);
    } catch (e: any) {
      message.error(e?.message || 'Ошибка загрузки аналитик');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSubscription = async (typeId: string, isEnabled: boolean) => {
    try {
      setSavingTypeId(typeId);
      await api.analytics.setSubscription({ typeId, isEnabled });
      const sRes = await api.analytics.listSubscriptions();
      setSubs(sRes.data || []);
      // Обновляем контекст доступа, чтобы формы документов сразу увидели изменения
      await refreshAccess();
      message.success(isEnabled ? 'Подписка включена' : 'Подписка отключена');
    } catch (e: any) {
      message.error(e?.message || 'Ошибка сохранения подписки');
    } finally {
      setSavingTypeId(null);
    }
  };


  return (
    <div className="page">
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Аналитики
        </Typography.Title>
        <Typography.Text type="secondary">
          Организация: <b>{user?.organizationId || '—'}</b>
        </Typography.Text>

        <Card size="small" title="Подписки на виды аналитик" loading={loading}>
          <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
            {isOrgAdmin 
              ? 'Включите только те аналитики, которые ваша организация будет получать и использовать в документах на портале.'
              : 'Аналитики, на которые подписана ваша организация. Для изменения подписок обратитесь к администратору организации.'}
          </Typography.Paragraph>

          <Divider style={{ margin: '12px 0' }} />

          {displayedTypes.length === 0 ? (
            <Typography.Paragraph type="secondary" style={{ textAlign: 'center', padding: '40px 0' }}>
              {isOrgAdmin 
                ? 'Нет доступных аналитик. Обратитесь к администратору ЕЦОФ для добавления аналитик в каталог.'
                : 'Ваша организация не подписана ни на одну аналитику. Обратитесь к администратору организации для настройки подписок.'}
            </Typography.Paragraph>
          ) : (
            <Row gutter={[12, 12]}>
              {displayedTypes.map((t) => (
                <Col key={t.id} xs={24} md={12} lg={8}>
                  <Card size="small">
                    <Space direction="vertical">
                      <Checkbox
                        checked={enabledSet.has(t.id)}
                        disabled={!isOrgAdmin || savingTypeId === t.id}
                        onChange={(e) => toggleSubscription(t.id, e.target.checked)}
                      >
                        <b>{t.name}</b>
                      </Checkbox>
                      <Typography.Text type="secondary">Код: {t.code}</Typography.Text>
                      {!isOrgAdmin && (
                        <Tag color="green">Подписана</Tag>
                      )}
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Card>
      </Space>
    </div>
  );
}

