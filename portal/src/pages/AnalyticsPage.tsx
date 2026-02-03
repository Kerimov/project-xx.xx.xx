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
  const [webhookForm] = Form.useForm();
  const [webhookLoading, setWebhookLoading] = useState(false);

  const enabledSet = useMemo(() => new Set(subs.filter((s) => s.isEnabled).map((s) => s.typeId)), [subs]);

  const load = async () => {
    try {
      setLoading(true);
      const [tRes, sRes] = await Promise.all([
        api.analytics.listTypes(),
        api.analytics.listSubscriptions()
      ]);
      setTypes(tRes.data || []);
      setSubs(sRes.data || []);

      // Загружаем webhook только если пользователь администратор
      if (isOrgAdmin) {
        try {
          const wRes = await api.analytics.getWebhook();
          if (wRes.data) {
            webhookForm.setFieldsValue({
              url: wRes.data.url,
              secret: '',
              isActive: wRes.data.isActive
            });
          } else {
            webhookForm.setFieldsValue({ url: '', secret: '', isActive: true });
          }
        } catch (e: any) {
          // Игнорируем ошибку 403 для обычных сотрудников
          if (!e?.message?.includes('403') && !e?.message?.includes('Forbidden')) {
            message.error(e?.message || 'Ошибка загрузки webhook');
          }
        }
      }
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

  const saveWebhook = async () => {
    try {
      const values = await webhookForm.validateFields();
      setWebhookLoading(true);
      await api.analytics.upsertWebhook(values);
      message.success('Webhook сохранён. Запущен ресинк подписанных аналитик.');
      await api.analytics.resync();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.message || 'Ошибка сохранения webhook');
    } finally {
      setWebhookLoading(false);
    }
  };

  const resync = async () => {
    try {
      setWebhookLoading(true);
      const r = await api.analytics.resync();
      message.success(`Ресинк поставлен в очередь: ${r.data.created}`);
    } catch (e: any) {
      message.error(e?.message || 'Ошибка ресинка');
    } finally {
      setWebhookLoading(false);
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

        {isOrgAdmin && (
          <Card size="small" title="Webhook для доставки аналитик (push)" loading={loading}>
          <Form form={webhookForm} layout="vertical">
            <Row gutter={12}>
              <Col xs={24} md={14}>
                <Form.Item
                  name="url"
                  label="URL получателя"
                  rules={[{ required: true, message: 'Укажите URL' }]}
                >
                  <Input placeholder="https://accounting дочерней компании /webhooks/ecof-analytics" />
                </Form.Item>
              </Col>
              <Col xs={24} md={10}>
                <Form.Item
                  name="secret"
                  label="Секрет (для подписи HMAC SHA-256)"
                  rules={[{ required: true, message: 'Укажите secret (минимум 8 символов)' }]}
                >
                  <Input.Password placeholder="********" />
                </Form.Item>
              </Col>
            </Row>
            <Space wrap>
              <Button type="primary" onClick={saveWebhook} loading={webhookLoading}>
                Сохранить webhook
              </Button>
              <Button onClick={resync} loading={webhookLoading}>
                Ресинк подписок
              </Button>
            <Tag>Подпись: заголовок `x-ecof-signature`</Tag>
          </Space>
        </Form>
      </Card>
        )}

        <Card size="small" title="Подписки на виды аналитик" loading={loading}>
          <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
            {isOrgAdmin 
              ? 'Включите только те аналитики, которые ваша организация будет получать и использовать в документах на портале.'
              : 'Текущие подписки вашей организации на аналитики. Для изменения подписок обратитесь к администратору организации.'}
          </Typography.Paragraph>

          <Divider style={{ margin: '12px 0' }} />

          <Row gutter={[12, 12]}>
            {types
              .filter((t) => t.isActive)
              .map((t) => (
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
                      {!isOrgAdmin && enabledSet.has(t.id) && (
                        <Tag color="green">Подписана</Tag>
                      )}
                    </Space>
                  </Card>
                </Col>
              ))}
          </Row>
        </Card>
      </Space>
    </div>
  );
}

