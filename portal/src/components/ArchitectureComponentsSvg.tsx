import React from 'react';

type Props = {
  height?: number;
};

export function ArchitectureComponentsSvg({ height = 520 }: Props) {
  // Inline SVG (no runtime deps) — stable in any environment.
  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg
        viewBox="0 0 1200 620"
        width="1200"
        height={height}
        style={{ display: 'block', minWidth: 900 }}
        role="img"
        aria-label="Схема компонентов: Портал ↔ 1С:УХ"
      >
        <defs>
          <linearGradient id="bg" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#fafafa" />
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="rgba(0,0,0,0.12)" />
          </filter>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L10,3 L0,6 Z" fill="#334155" />
          </marker>
          <style>{`
            .box { fill: #ffffff; stroke: #e2e8f0; stroke-width: 2; rx: 16; filter: url(#shadow); }
            .box2 { fill: #ffffff; stroke: #e2e8f0; stroke-width: 2; rx: 14; }
            .title { font: 700 16px Inter, Segoe UI, Arial, sans-serif; fill: #0f172a; }
            .text { font: 500 13px Inter, Segoe UI, Arial, sans-serif; fill: #334155; }
            .hint { font: 500 12px Inter, Segoe UI, Arial, sans-serif; fill: #64748b; }
            .line { stroke: #334155; stroke-width: 2; fill: none; marker-end: url(#arrow); }
            .dash { stroke-dasharray: 6 6; }
            .label { font: 600 12px Inter, Segoe UI, Arial, sans-serif; fill: #0f172a; }
            .pill { fill: #eff6ff; stroke: #bfdbfe; stroke-width: 1.5; rx: 999; }
          `}</style>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width="1200" height="620" fill="url(#bg)" />

        {/* Portal zone */}
        <rect x="40" y="60" width="740" height="520" className="box2" />
        <text x="60" y="92" className="title">
          Портал (единое окно)
        </text>
        <text x="60" y="114" className="hint">
          UI/UX + API + фоновые воркеры. Истина для портальных сущностей — Portal DB.
        </text>

        {/* 1C zone */}
        <rect x="820" y="60" width="340" height="520" className="box2" />
        <text x="840" y="92" className="title">
          1С:УХ (учётное ядро)
        </text>
        <text x="840" y="114" className="hint">
          Проведение, регламент, отчётность. Доступ по HTTP‑сервисам.
        </text>

        {/* User */}
        <rect x="70" y="150" width="240" height="90" className="box" />
        <text x="92" y="182" className="title">Пользователь</text>
        <text x="92" y="206" className="text">Бухгалтер / Дочка</text>
        <text x="92" y="228" className="hint">Browser / thin client</text>

        {/* Frontend */}
        <rect x="350" y="150" width="260" height="90" className="box" />
        <text x="372" y="182" className="title">Frontend (SPA)</text>
        <text x="372" y="206" className="text">React + AntD</text>
        <text x="372" y="228" className="hint">HTTP(S) → Backend API</text>

        {/* Backend */}
        <rect x="350" y="270" width="260" height="100" className="box" />
        <text x="372" y="304" className="title">Backend API</text>
        <text x="372" y="328" className="text">REST/JSON</text>
        <text x="372" y="350" className="hint">Auth + validation + rate limits</text>

        {/* DB */}
        <rect x="70" y="270" width="240" height="150" className="box" />
        <text x="92" y="304" className="title">Portal DB</text>
        <text x="92" y="328" className="text">Postgres (write‑model)</text>
        <text x="92" y="352" className="hint">documents / versions / files</text>
        <text x="92" y="372" className="hint">uh_queue / object_cards / nsi*</text>

        {/* Workers */}
        <rect x="350" y="410" width="260" height="110" className="box" />
        <text x="372" y="444" className="title">Workers</text>
        <text x="372" y="468" className="text">Очередь / фоновые задачи</text>
        <text x="372" y="490" className="hint">УХ: отправка / статусы / ретраи</text>
        <text x="372" y="510" className="hint">НСИ: delta sync / прогрев кэша</text>

        {/* Cache */}
        <rect x="640" y="270" width="120" height="100" className="box" />
        <text x="662" y="304" className="title">Redis</text>
        <text x="662" y="328" className="hint">hot lookups</text>
        <text x="662" y="348" className="hint">TTL + invalidate</text>

        {/* Read model */}
        <rect x="640" y="410" width="120" height="110" className="box" />
        <text x="656" y="444" className="title">Read</text>
        <text x="656" y="468" className="hint">Replica/</text>
        <text x="656" y="486" className="hint">Search</text>
        <text x="656" y="510" className="hint">fast lists</text>

        {/* 1C HTTP */}
        <rect x="850" y="170" width="280" height="110" className="box" />
        <text x="872" y="204" className="title">HTTP‑сервисы</text>
        <text x="872" y="228" className="text">/hs/ecof/*</text>
        <text x="872" y="252" className="hint">documents / nsi/delta / health</text>

        {/* UH DB */}
        <rect x="850" y="320" width="280" height="120" className="box" />
        <text x="872" y="354" className="title">БД 1С:УХ</text>
        <text x="872" y="378" className="text">MS SQL / Postgres</text>
        <text x="872" y="402" className="hint">учётные таблицы + регистры</text>

        {/* Lines */}
        <path className="line" d="M310 195 L350 195" />
        <text x="318" y="182" className="label">HTTPS</text>

        <path className="line" d="M610 195 L690 195" />
        <path className="line" d="M690 195 L690 300" style={{ stroke: '#334155', strokeWidth: 2, fill: 'none' }} markerEnd="url(#arrow)" />
        <text x="620" y="182" className="label">REST</text>

        <path className="line" d="M350 320 L310 320" />
        <text x="190" y="308" className="label">SQL</text>

        <path className="line" d="M610 320 L640 320" />
        <text x="612" y="306" className="label">cache</text>

        <path className="line" d="M480 370 L480 410" />
        <text x="492" y="398" className="label">outbox/queue</text>

        <path className="line" d="M610 470 L640 470" />
        <text x="612" y="456" className="label">index</text>

        <path className="line" d="M610 465 L850 225" />
        <text x="690" y="286" className="label">HTTP</text>

        <path className="line dash" d="M990 280 L990 320" />
        <text x="1002" y="306" className="label">SQL</text>

        {/* Pills */}
        <rect x="90" y="440" width="200" height="32" className="pill" />
        <text x="110" y="461" className="hint">
          Подписки ограничивают UI
        </text>

        <rect x="90" y="480" width="200" height="32" className="pill" />
        <text x="110" y="501" className="hint">
          Идемпотентность + ретраи
        </text>
      </svg>
    </div>
  );
}

