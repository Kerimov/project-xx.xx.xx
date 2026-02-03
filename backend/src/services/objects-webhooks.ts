import { pool } from '../db/connection.js';
import { logger } from '../utils/logger.js';
import crypto from 'node:crypto';

/**
 * Сервис доставки событий объектов учета по webhook в системы дочерних организаций.
 * Использует ту же таблицу org_webhooks, что и аналитики, но доставляет события из object_events.
 */
export class ObjectsWebhooksService {
  private running = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly intervalMsDefault = 5000;

  start(intervalMs: number = this.intervalMsDefault) {
    if (this.running) return;
    this.running = true;
    logger.info('Objects webhooks service started', { intervalMs });

    this.tick(); // сразу
    this.intervalId = setInterval(() => this.tick(), intervalMs);
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
    this.running = false;
    logger.info('Objects webhooks service stopped');
  }

  private async tick() {
    try {
      await this.deliverEvents();
    } catch (e: any) {
      logger.error('Objects webhooks tick failed', e);
    }
  }

  private async deliverEvents() {
    // Выбираем активные вебхуки, которые пора доставлять, и блокируем строки, чтобы доставка по одной организации не шла параллельно
    const hooksRes = await pool.query(
      `SELECT org_id, url, secret, 
              COALESCE(last_delivered_object_seq, 0) as last_delivered_object_seq,
              COALESCE(object_webhook_fail_count, 0) as object_webhook_fail_count
       FROM org_webhooks
       WHERE is_active = true
         AND (object_webhook_next_retry_at IS NULL OR object_webhook_next_retry_at <= now())
       ORDER BY updated_at ASC
       LIMIT 10
       FOR UPDATE SKIP LOCKED`
    );

    for (const hook of hooksRes.rows as Array<{
      org_id: string;
      url: string;
      secret: string;
      last_delivered_object_seq: number;
      object_webhook_fail_count: number;
    }>) {
      await this.deliverForOrg(hook);
    }
  }

  private async deliverForOrg(hook: {
    org_id: string;
    url: string;
    secret: string;
    last_delivered_object_seq: number;
    object_webhook_fail_count: number;
  }) {
    const batchLimit = 200;
    const lastSeq = hook.last_delivered_object_seq;

    // Получаем события объектов учета, на которые подписана организация
    const eventsRes = await pool.query(
      `SELECT e.seq, e.event_type, t.code as type_code, e.card_id, e.payload, e.created_at
       FROM object_events e
       JOIN object_types t ON t.id = e.type_id
       WHERE e.seq > $1
         AND EXISTS (
           SELECT 1 FROM org_object_subscriptions s
           WHERE s.org_id = $2 AND s.type_id = e.type_id AND s.is_enabled = true
         )
       ORDER BY e.seq ASC
       LIMIT $3`,
      [lastSeq, hook.org_id, batchLimit]
    );

    const events = eventsRes.rows as Array<{
      seq: number;
      event_type: string;
      type_code: string;
      card_id: string;
      payload: any;
      created_at: string;
    }>;

    if (events.length === 0) {
      return;
    }

    const body = JSON.stringify({
      orgId: hook.org_id,
      fromSeq: events[0].seq,
      toSeq: events[events.length - 1].seq,
      events: events.map((e) => ({
        seq: e.seq,
        typeCode: e.type_code,
        eventType: e.event_type,
        cardId: e.card_id,
        payload: e.payload,
        createdAt: e.created_at
      }))
    });

    const signature = crypto.createHmac('sha256', hook.secret).update(body).digest('hex');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const resp = await fetch(hook.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-ecof-signature': signature,
          'x-ecof-event-type': 'objects' // Отличаем от аналитик
        },
        body,
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`Webhook HTTP ${resp.status}: ${text.slice(0, 500)}`);
      }

      const newLastSeq = events[events.length - 1].seq;
      await pool.query(
        `UPDATE org_webhooks
         SET last_delivered_object_seq = $2, 
             object_webhook_fail_count = 0, 
             object_webhook_last_error = NULL, 
             object_webhook_next_retry_at = now(),
             updated_at = now()
         WHERE org_id = $1`,
        [hook.org_id, newLastSeq]
      );

      logger.info('Objects webhook delivered', {
        orgId: hook.org_id,
        eventsCount: events.length,
        fromSeq: events[0].seq,
        toSeq: newLastSeq
      });
    } catch (e: any) {
      const failCount = hook.object_webhook_fail_count + 1;
      const delaySeconds = Math.min(30 * 2 ** Math.min(failCount, 6), 3600);
      await pool.query(
        `UPDATE org_webhooks
         SET object_webhook_fail_count = $2, 
             object_webhook_last_error = $3,
             object_webhook_next_retry_at = now() + ($4 || ' seconds')::interval,
             updated_at = now()
         WHERE org_id = $1`,
        [hook.org_id, failCount, e?.message ?? String(e), String(delaySeconds)]
      );
      logger.error('Objects webhook delivery failed', e, { orgId: hook.org_id, failCount });
    }
  }
}

export const objectsWebhooksService = new ObjectsWebhooksService();
