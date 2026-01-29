# Портал ЕЦОФ (интеграция с 1С:УХ)

Фронт: React (Vite) + Ant Design. Бэкенд: Node.js (Express) + PostgreSQL. Документы, НСИ, очередь отправки в 1С:УХ.

---

## Что нужно на ПК

- **Node.js** 18+ и **npm**
- **PostgreSQL** 14+ (локально или через Docker)

---

## 1. Клонировать / скопировать проект

```bash
cd C:\project-xx.xx.xx
```

(или путь, куда скопирован репозиторий)

---

## 2. База данных

### Вариант A: PostgreSQL в Docker

```bash
docker-compose up -d postgres
```

БД: `ecof_portal`, пользователь/пароль: `postgres/postgres`, порт с хоста: **5433**.

### Вариант B: Локальный PostgreSQL

Создать БД и пользователя:

```sql
CREATE USER postgres WITH PASSWORD 'postgres';
CREATE DATABASE ecof_portal OWNER postgres;
```

Порт по умолчанию: **5432**.

---

## 3. Бэкенд

```bash
cd backend
cp .env.example .env
```

Отредактировать **`.env`**:

- При **Docker** (шаг 2A): `DB_PORT=5433`, `DB_HOST=localhost`.
- При **локальном Postgres**: `DB_PORT=5432`, `DB_HOST=localhost`.
- `JWT_SECRET` — сменить на свой (для продакшена обязательно).
- `CORS_ORIGIN` — оставить `http://localhost:5173` для разработки.

Установка и запуск:

```bash
npm install
npm run dev
```

Сервер: **http://localhost:3000**. При старте сам подключается к БД, применяет миграции и запускает очередь УХ и синхронизацию НСИ.

(Опционально) Наполнить НСИ тестовыми данными:

```bash
npm run seed-nsi
```

---

## 4. Портальный фронт

В **другом** терминале:

```bash
cd portal
cp .env.example .env
```

В **`.env`** указать адрес API:

- Локально: `VITE_API_URL=http://localhost:3000/api`

Установка и запуск:

```bash
npm install
npm run dev
```

Портал: **http://localhost:5173**.

---

## 5. Проверка

1. Открыть **http://localhost:5173**.
2. Зарегистрировать пользователя (Регистрация) или войти, если в БД уже есть пользователи (из миграций/seed).
3. Раздел «Документы» — создание и просмотр документов.

Бэкенд без 1С будет работать: документы сохраняются в БД, очередь УХ будет помечать отправку как ошибку до настройки 1С.

---

## 6. Интеграция с 1С:УХ (опционально)

- Настройка HTTP-сервиса в 1С: **`docs/1C-UH-HTTP-Service-Creation-Step-by-Step.md`**.
- Пример кода обработки: **`docs/1C-UH-Example-Code.bsl`**.

В настройках портала (интеграция с 1С) указать базовый URL сервиса 1С, например: `http://сервер-1с:8080/ecof`.

---

## Краткая шпаргалка (другой ПК)

| Шаг | Команды |
|-----|--------|
| БД (Docker) | `docker-compose up -d postgres` |
| Бэкенд | `cd backend` → `cp .env.example .env` → поправить `DB_PORT=5433` если Docker → `npm install` → `npm run dev` |
| Портальный фронт | `cd portal` → `cp .env.example .env` → `VITE_API_URL=http://localhost:3000/api` → `npm install` → `npm run dev` |
| Открыть | http://localhost:5173 |

---

## Структура репозитория

| Каталог / файл | Назначение |
|----------------|------------|
| `backend/` | API (Express), БД (PostgreSQL), миграции, очередь УХ, НСИ |
| `portal/` | SPA (React, Vite, Ant Design) |
| `docs/` | Инструкции по 1С (HTTP-сервис, пример BSL) |
| `docker-compose.yml` | Контейнер PostgreSQL |

Миграции лежат в `backend/db/migrations/`, применяются автоматически при запуске бэкенда.
