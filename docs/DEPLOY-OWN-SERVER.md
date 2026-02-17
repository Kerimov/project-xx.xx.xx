# Публикация проекта на своём сервере

Инструкция по развёртыванию портала ЕЦОФ на **собственном сервере** (VPS, выделенный сервер, домашний ПК с белым IP).

---

## Что будет на сервере

| Компонент | Описание |
|-----------|----------|
| **PostgreSQL** | База данных (порт 5432) |
| **Backend** | Node.js API (порт 3000 или за Nginx) |
| **Frontend** | Собранный SPA (статика) |
| **Nginx** (рекомендуется) | Обратный прокси, раздача статики, HTTPS |

Сервер предполагается **Linux** (Ubuntu 22.04 / Debian 12 или аналог). Для Windows-сервера шаги аналогичны, но команды и сервисы другие.

---

## 1. Подготовка сервера

### 1.1 Установка Node.js 18+

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # должно быть v18+
```

### 1.2 Установка PostgreSQL 14+

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

Создание БД и пользователя:

```bash
sudo -u postgres psql -c "CREATE USER ecof_user WITH PASSWORD 'ваш_надёжный_пароль';"
sudo -u postgres psql -c "CREATE DATABASE ecof_portal OWNER ecof_user;"
```

(Либо оставить пользователя `postgres` и задать ему пароль — тогда в `.env` будет `DB_USER=postgres`.)

### 1.3 Установка Nginx (рекомендуется)

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

### 1.4 Установка PM2 (для автозапуска backend)

```bash
sudo npm install -g pm2
```

---

## 2. Размещение проекта на сервере

### 2.1 Клонирование репозитория

```bash
cd /opt   # или /var/www, /home/user — как принято у вас
sudo git clone https://github.com/ВАШ_ЮЗЕР/ВАШ_РЕПО.git ecof-portal
cd ecof-portal
```

Если репозиторий приватный — настройте SSH-ключ или токен.

### 2.2 Backend

```bash
cd /opt/ecof-portal/backend
npm ci --omit=dev
npm run build
```

Создайте файл **`.env`** в каталоге `backend/` (скопируйте с рабочей машины или создайте вручную):

```env
NODE_ENV=production
PORT=3000

# База данных (ваш PostgreSQL на этом сервере)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecof_portal
DB_USER=ecof_user
DB_PASSWORD=ваш_надёжный_пароль

# JWT — ОБЯЗАТЕЛЬНО свой секрет в проде
JWT_SECRET=длинная-случайная-строка-минимум-32-символа
JWT_EXPIRES_IN=7d

# Домен, с которого открывается портал (без слэша в конце)
CORS_ORIGIN=https://portal.ваш-домен.ru

# 1С УХ (если нужна интеграция)
UH_API_URL=https://web1c.pra.ru:8035/kk_test/hs/ecof
UH_API_USER=Администратор
UH_API_PASSWORD=...
UH_API_INSECURE=true
UH_QUEUE_INTERVAL=5000
UH_SYNC_INTERVAL=60000
```

Применение миграций (один раз после первого деплоя):

```bash
cd /opt/ecof-portal/backend
npm run migrate
```

Запуск backend через PM2:

```bash
cd /opt/ecof-portal/backend
pm2 start dist/index.js --name ecof-backend
pm2 save
pm2 startup   # выполнить команду, которую выведет pm2
```

Проверка: `curl http://localhost:3000/health` должен вернуть `{"status":"ok",...}`.

### 2.3 Frontend

Соберите фронт, указав **URL вашего API** (тот, по которому браузер будет ходить к backend):

```bash
cd /opt/ecof-portal/portal
echo "VITE_API_URL=https://portal.ваш-домен.ru/api" > .env
npm ci --omit=dev
npm run build
```

В результате в `portal/dist/` появится статика (index.html, js, css). Её будет раздавать Nginx.

---

## 3. Nginx: прокси и статика

Предполагается, что портал доступен по домену **https://portal.ваш-домен.ru**.

Создайте конфиг (подставьте свой домен и путь к `portal/dist`):

```bash
sudo nano /etc/nginx/sites-available/ecof-portal
```

Содержимое:

```nginx
server {
    listen 80;
    server_name portal.ваш-домен.ru;

    # Статика фронта
    root /opt/ecof-portal/portal/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API — прокси на backend
    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health и прочее без /api
    location /health {
        proxy_pass http://127.0.0.1:3000/health;
        proxy_set_header Host $host;
    }
}
```

Включите сайт и проверьте конфиг:

```bash
sudo ln -s /etc/nginx/sites-available/ecof-portal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 4. HTTPS (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d portal.ваш-домен.ru
```

Следуйте подсказкам. Certbot сам поправит конфиг Nginx для HTTPS и при необходимости настроит редирект с HTTP на HTTPS.

---

## 5. Обновление проекта

После `git pull`:

```bash
cd /opt/ecof-portal/backend
npm ci --omit=dev
npm run build
pm2 restart ecof-backend

cd /opt/ecof-portal/portal
npm ci --omit=dev
npm run build
# Nginx уже раздаёт из portal/dist — перезапуск не нужен
```

---

## 6. Важные моменты

- **CORS**: в `backend/.env` переменная `CORS_ORIGIN` должна совпадать с тем URL, по которому пользователи открывают портал (например `https://portal.ваш-домен.ru`), без слэша в конце.
- **VITE_API_URL**: при сборке фронта должен быть полный URL до API. Обычно это тот же домен: `https://portal.ваш-домен.ru/api`.
- **JWT_SECRET**: в проде обязательно свой длинный случайный секрет.
- **Файлы загрузок**: в `.env` можно задать `UPLOAD_DIR=./uploads`; убедитесь, что у процесса Node есть права на запись в этот каталог.
- **Брандмауэр**: откройте порты 80 и 443 для Nginx; порт 3000 снаружи можно не открывать (доступ только через Nginx).

---

## 7. Вариант без Nginx (только для теста)

Если Nginx пока не используете:

1. Backend: запустить как выше (PM2 на порту 3000).
2. Frontend: в `.env` при сборке указать `VITE_API_URL=http://IP_СЕРВЕРА:3000/api`.
3. Раздавать статику из `portal/dist` можно через `npx serve -s portal/dist -l 5173` и открывать портал по `http://IP:5173`.

В проде лучше сразу использовать Nginx и HTTPS.

---

## Краткая шпаргалка

| Действие | Команды |
|----------|--------|
| Первый деплой БД | `sudo -u postgres psql` → создать БД и пользователя |
| Backend | `cd backend` → `.env` → `npm ci` → `npm run build` → `npm run migrate` → `pm2 start dist/index.js --name ecof-backend` |
| Frontend | `cd portal` → задать `VITE_API_URL` в `.env` → `npm ci` → `npm run build` |
| Nginx | Настроить `sites-available`, `root` на `portal/dist`, `proxy_pass` на `127.0.0.1:3000` для `/api/` |
| HTTPS | `certbot --nginx -d portal.ваш-домен.ru` |
| Обновление | `git pull` → пересборка backend + frontend → `pm2 restart ecof-backend` |
