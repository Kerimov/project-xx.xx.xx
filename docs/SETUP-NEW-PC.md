# Настройка проекта на новом ПК

Инструкция для быстрого развёртывания проекта при переходе на другой компьютер.

---

## Быстрый старт

1. **Склонировать/скопировать проект** в папку (например, `c:\project-xx.xx.xx`)

2. **Установить зависимости:**
   ```bash
   cd backend
   npm install
   
   cd ../portal
   npm install
   ```

3. **Настроить `.env` файлы:**
   - `backend/.env` — скопировать из `backend/.env.example` и заполнить
   - `portal/.env` — скопировать из `portal/.env.example` и заполнить

4. **Запустить БД** (PostgreSQL локально или через Docker)

5. **Запустить серверы:**
   ```bash
   # Backend (в одном терминале)
   cd backend
   npm run dev
   
   # Frontend (в другом терминале)
   cd portal
   npm run dev
   ```

---

## Детальная настройка

### 1. Переменные окружения Backend (`backend/.env`)

**Основные:**
```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecof_portal
DB_USER=postgres
DB_PASSWORD=postgres

JWT_SECRET=your-secret-key-change-in-production
CORS_ORIGIN=http://localhost:5173
```

**Подключение к БД 1С:УХ (MS SQL):**
```env
UH_DB_TYPE=mssql
UH_MSSQL_SERVER=1csql-srv.prima.pra.ru
UH_MSSQL_PORT=1433
UH_MSSQL_DATABASE=kk_test

# Integrated Auth (доменная учётная запись)
UH_MSSQL_AUTH=integrated

# Или SQL Auth (если Integrated не работает)
# UH_MSSQL_AUTH=sql
# UH_MSSQL_USER=sql_login
# UH_MSSQL_PASSWORD=password

UH_MSSQL_ENCRYPT=false
UH_MSSQL_TRUST_SERVER_CERTIFICATE=true
```

**Учётные данные для проверки HTTP-сервисов 1С (опционально):**
```env
UH_1C_USER=Администратор
UH_1C_PASSWORD=test123!@#
```

**HTTP API 1С УХ (базовый URL сервиса ecof — без /documents в конце):**
```env
UH_API_URL=https://localhost:8035/kk_test/hs/ecof
UH_API_USER=Администратор
UH_API_PASSWORD=test123!@#
UH_API_INSECURE=true
```
Backend сам обращается к `.../ecof/documents`, `.../ecof/health`, `.../ecof/nsi/delta`. В браузере по адресу `https://localhost:8035/kk_test/hs/ecof` будет 404 — это нормально, обработчиков на корне нет. (Для внешнего доступа замените localhost на web1c.pra.ru:8035.)

### 2. Переменные окружения Portal (`portal/.env`)

```env
VITE_API_URL=http://localhost:3000/api
```

---

## Особенности настройки

### MS SQL Server (1С:УХ)

**Integrated Auth:**
- Backend должен запускаться под **доменной учётной записью** (вход в Windows как доменный пользователь)
- На ПК должен быть установлен **Microsoft ODBC Driver 17** (или 18) for SQL Server
- Если появляется ошибка "untrusted domain" — использовать SQL Auth вместо Integrated

**SQL Auth:**
- Создать SQL-логин в SQL Server с правами на базу `kk_test`
- В `.env` указать `UH_MSSQL_AUTH=sql` и логин/пароль

### Проверка подключения

После запуска backend и portal:
1. Открыть **http://localhost:5173**
2. Перейти на страницу **"Подключение к БД 1С:УХ"**
3. Проверить параметры подключения
4. Нажать **"Проверить подключение"**

### Проверка HTTP-сервисов 1С

На странице **"Проверка HTTP-сервисов 1С"**:
- **URL публикации** по умолчанию: `https://localhost:8035/kk_test` (HTTP-сервисы под `/hs/`)
- **Логин 1С** по умолчанию: `Администратор`
- **Пароль** по умолчанию: `test123!@#`

Проверяются эндпоинты:
- `/` — корень публикации
- `/odata/standard.odata/` — OData
- `/hs/` — корень HTTP-сервисов
- `/hs/ecof/health` — ПорталЕЦОФ /health
- `/hs/ecof/nsi/delta` — ПорталЕЦОФ /nsi/delta
- `/hs/ecof/documents` — ПорталЕЦОФ /documents
- `/hs/ecof/documents/test/status` — ПорталЕЦОФ /documents/{ref}/status

---

## Запуск серверов

### Через Cursor/IDE

Backend и portal можно запускать через терминал Cursor, но иногда возникают проблемы с `spawn EPERM` (особенно для Vite). В таком случае запускайте вручную в обычном PowerShell/CMD.

### Вручную

**Backend:**
```powershell
cd c:\project-xx.xx.xx\backend
npm run dev
```

**Portal:**
```powershell
cd c:\project-xx.xx.xx\portal
npm run dev
```

Backend будет доступен на **http://localhost:3000**  
Portal будет доступен на **http://localhost:5173** (или 5174, если 5173 занят)

---

## Частые проблемы

### Backend не запускается: порт 3000 занят

```powershell
# Найти процесс
netstat -ano | findstr ":3000"

# Завершить (замените PID на найденный)
taskkill /F /PID <PID>
```

### Portal не запускается: spawn EPERM

Запустите portal вручную в обычном терминале (не из Cursor).

### Ошибка подключения к SQL Server: "Server is not found or not accessible"

**Проверить:**
1. Доступность сервера: `ping 1csql-srv.prima.pra.ru`
2. Доступность порта: `Test-NetConnection -ComputerName 1csql-srv.prima.pra.ru -Port 1433`
3. Если порт недоступен — проблема в сети/firewall или SQL Server не слушает TCP/IP
4. Если порт доступен — проблема в аутентификации (попробовать SQL Auth вместо Integrated)

### Ошибка 401 при проверке HTTP-сервисов 1С

Указать логин и пароль 1С в форме на странице проверки или в `backend/.env`:
```env
UH_1C_USER=Администратор
UH_1C_PASSWORD=test123!@#
```

---

## Полезные ссылки

- **README.md** (корень) — общая инструкция по развёртыванию
- **docs/1C-UH-HTTP-Service-Creation-Step-by-Step.md** — настройка HTTP-сервиса в 1С
- **docs/README-UH-INTEGRATION.md** — интеграция с 1С:УХ (подключение к БД, HTTP API)
- **docs/CHAT-HANDOFF.md** — история разработки и контекст
