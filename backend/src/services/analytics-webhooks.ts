import { pool } from '../db/connection.js';
import { logger } from '../utils/logger.js';
import crypto from 'node:crypto';

type ResyncJobRow = {
  id: string;
  org_id: string;
  type_id: string;
  status: string;
  cursor_updated_at: string | null;
  cursor_id: string | null;
  batch_size: number;
  fail_count: number;
  next_retry_at: string;
};

export class AnalyticsWebhooksService {
  private running = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly intervalMsDefault = 5000;

  start(intervalMs: number = this.intervalMsDefault) {
    if (this.running) return;
    this.running = true;
    logger.info('Analytics webhooks service started', { intervalMs });

    this.tick(); // сразу
    this.intervalId = setInterval(() => this.tick(), intervalMs);
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
    this.running = false;
    logger.info('Analytics webhooks service stopped');
  }

  private async tick() {
    try {
      // 1) сначала генерируем snapshot события по resync jobs (маленькими батчами)
      await this.processResyncJobs();

      // 2) затем доставляем события по webhooks
      await this.deliverEvents();
    } catch (e: any) {
      logger.error('Analytics webhooks tick failed', e);
    }
  }

  private async processResyncJobs() {
    /**
     * Важно: FOR UPDATE SKIP LOCKED имеет смысл только если «захват» происходит атомарно.
     * Здесь мы «захватываем» джобы одним запросом (CTE + UPDATE ... RETURNING),
     * чтобы параллельные инстансы сервиса не обработали одну и ту же джобу.
     */
    const jobs = await pool.query(
      `WITH picked AS (
         SELECT id
         FROM analytics_resync_jobs
         WHERE status = 'Pending'
           AND next_retry_at <= now()
         ORDER BY created_at ASC
         LIMIT 5
         FOR UPDATE SKIP LOCKED
       )
       UPDATE analytics_resync_jobs j
       SET status = 'Processing'
       FROM picked
       WHERE j.id = picked.id
       RETURNING j.id, j.org_id, j.type_id, j.status, j.cursor_updated_at, j.cursor_id, j.batch_size, j.fail_count, j.next_retry_at`
    );

    for (const job of jobs.rows as ResyncJobRow[]) {
      await this.processResyncJob(job);
    }
  }

  private async processResyncJob(job: ResyncJobRow) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Джоба уже переведена в Processing на этапе захвата (processResyncJobs).

      // Проверяем, что тип подписан
      const sub = await client.query(
        `SELECT 1 FROM org_analytics_subscriptions
         WHERE org_id = $1 AND type_id = $2 AND is_enabled = true`,
        [job.org_id, job.type_id]
      );
      if (!sub.rowCount) {
        await client.query(
          `UPDATE analytics_resync_jobs SET status = 'Completed' WHERE id = $1`,
          [job.id]
        );
        await client.query('COMMIT');
        return;
      }

      const typeRes = await client.query(`SELECT id, code FROM analytics_types WHERE id = $1`, [job.type_id]);
      const typeCode = typeRes.rows[0]?.code;
      if (!typeCode) {
        await client.query(
          `UPDATE analytics_resync_jobs SET status = 'Failed', last_error = $2 WHERE id = $1`,
          [job.id, 'analytics_type not found']
        );
        await client.query('COMMIT');
        return;
      }

      const batchSize = Math.min(Math.max(job.batch_size || 1000, 10), 5000);
      const cursorUpdatedAt = job.cursor_updated_at;
      const cursorId = job.cursor_id;

      const valuesRes = await client.query(
        `SELECT id, code, name, attrs, is_active, updated_at
         FROM analytics_values
         WHERE type_id = $1
           AND (
             $2::timestamptz IS NULL OR $3::uuid IS NULL
             OR (updated_at, id) > ($2::timestamptz, $3::uuid)
           )
         ORDER BY updated_at ASC, id ASC
         LIMIT $4`,
        [job.type_id, cursorUpdatedAt, cursorId, batchSize]
      );

      const rows = valuesRes.rows as Array<{
        id: string;
        code: string;
        name: string;
        attrs: Record<string, unknown>;
        is_active: boolean;
        updated_at: string;
      }>;

      if (rows.length === 0) {
        await client.query(
          `UPDATE analytics_resync_jobs SET status = 'Completed' WHERE id = $1`,
          [job.id]
        );
        await client.query('COMMIT');
        return;
      }

      // bulk insert snapshot events
      const valuesTuples: string[] = [];
      const params: any[] = [];
      let i = 1;
      for (const v of rows) {
        const payload = {
          eventType: 'Snapshot',
          typeCode,
          value: {
            id: v.id,
            code: v.code,
            name: v.name,
            attrs: v.attrs ?? {},
            isActive: v.is_active,
            updatedAt: v.updated_at
          }
        };
        valuesTuples.push(`('Snapshot', $${i++}::uuid, $${i++}::uuid, $${i++}::jsonb)`);
        params.push(job.type_id, v.id, JSON.stringify(payload));
      }
      await client.query(
        `INSERT INTO analytics_events (event_type, type_id, value_id, payload)
         VALUES ${valuesTuples.join(', ')}`,
        params
      );

      const last = rows[rows.length - 1];
      await client.query(
        `UPDATE analytics_resync_jobs
         SET cursor_updated_at = $2, cursor_id = $3, fail_count = 0, last_error = NULL, next_retry_at = now()
         WHERE id = $1`,
        [job.id, last.updated_at, last.id]
      );

      await client.query('COMMIT');
    } catch (e: any) {
      await client.query('ROLLBACK');
      const failCount = (job.fail_count ?? 0) + 1;
      const delaySeconds = Math.min(60 * 2 ** Math.min(failCount, 6), 3600);
      await pool.query(
        `UPDATE analytics_resync_jobs
         SET fail_count = $2, last_error = $3,
             next_retry_at = now() + ($4 || ' seconds')::interval
         WHERE id = $1`,
        [job.id, failCount, e?.message ?? String(e), String(delaySeconds)]
      );
      logger.error('Resync job failed', e, { jobId: job.id, orgId: job.org_id, typeId: job.type_id });
    } finally {
      client.release();
    }
  }

  private async deliverEvents() {
    /**
     * «Захватываем» вебхуки атомарно: переносим next_retry_at вперёд на короткое время,
     * чтобы параллельные инстансы не начали доставку для той же org одновременно.
     */
    const hooksRes = await pool.query(
      `WITH picked AS (
         SELECT org_id
         FROM org_webhooks
         WHERE is_active = true
           AND next_retry_at <= now()
         ORDER BY updated_at ASC
         LIMIT 10
         FOR UPDATE SKIP LOCKED
       )
       UPDATE org_webhooks h
       SET next_retry_at = now() + interval '30 seconds'
       FROM picked
       WHERE h.org_id = picked.org_id
       RETURNING h.org_id, h.url, h.secret, h.last_delivered_seq, h.fail_count`
    );

    for (const hook of hooksRes.rows as Array<{ org_id: string; url: string; secret: string; last_delivered_seq: number; fail_count: number }>) {
      await this.deliverForOrg(hook);
    }
  }

  private async deliverForOrg(hook: { org_id: string; url: string; secret: string; last_delivered_seq: number; fail_count: number }) {
    const batchLimit = 200;
    const eventsRes = await pool.query(
      `SELECT e.seq, e.event_type, t.code as type_code, e.payload, e.created_at
       FROM analytics_events e
       JOIN analytics_types t ON t.id = e.type_id
       WHERE e.seq > $1
         AND EXISTS (
           SELECT 1 FROM org_analytics_subscriptions s
           WHERE s.org_id = $2 AND s.type_id = e.type_id AND s.is_enabled = true
         )
       ORDER BY e.seq ASC
       LIMIT $3`,
      [hook.last_delivered_seq, hook.org_id, batchLimit]
    );

    const events = eventsRes.rows as Array<{ seq: number; event_type: string; type_code: string; payload: any; created_at: string }>;
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
          'x-ecof-signature': signature
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
         SET last_delivered_seq = $2, fail_count = 0, last_error = NULL, next_retry_at = now()
         WHERE org_id = $1`,
        [hook.org_id, newLastSeq]
      );
    } catch (e: any) {
      const failCount = (hook.fail_count ?? 0) + 1;
      const delaySeconds = Math.min(30 * 2 ** Math.min(failCount, 6), 3600);
      await pool.query(
        `UPDATE org_webhooks
         SET fail_count = $2, last_error = $3,
             next_retry_at = now() + ($4 || ' seconds')::interval
         WHERE org_id = $1`,
        [hook.org_id, failCount, e?.message ?? String(e), String(delaySeconds)]
      );
      logger.error('Webhook delivery failed', e, { orgId: hook.org_id });
    }
  }
}

export const analyticsWebhooksService = new AnalyticsWebhooksService();

