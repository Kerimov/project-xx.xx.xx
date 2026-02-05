# Настройка переменных окружения для Vercel

## Файл для импорта: `vercel.env`

Этот файл содержит переменные окружения, которые нужно добавить в Vercel Dashboard.

## Инструкция по настройке:

### 1. Получите URL вашего backend из Render

После деплоя backend на Render вы получите URL вида:
- `https://your-backend-name.onrender.com`

### 2. Откройте Vercel Dashboard

1. Зайдите на https://vercel.com
2. Выберите ваш проект
3. Перейдите в **Settings** → **Environment Variables**

### 3. Добавьте переменные окружения

#### Способ 1: Импорт из файла (если поддерживается)

Если Vercel поддерживает импорт из файла, используйте `vercel.env`

#### Способ 2: Ручное добавление

Добавьте следующие переменные:

**Для Production:**
```
Key: VITE_API_URL
Value: https://your-backend-name.onrender.com/api
Environment: Production
```

**Для Preview (опционально):**
```
Key: VITE_API_URL
Value: https://your-backend-name.onrender.com/api
Environment: Preview
```

**Для Development (опционально):**
```
Key: VITE_API_URL
Value: https://your-backend-name.onrender.com/api
Environment: Development
```

### 4. Важные замечания

- **Замените** `your-backend-name.onrender.com` на реальный URL вашего backend
- URL должен заканчиваться на `/api`
- После добавления переменных нужно **перезапустить деплой** (Redeploy) или сделать новый коммит

### 5. Проверка после настройки

1. Откройте ваш проект на Vercel
2. Откройте консоль разработчика (F12)
3. Перейдите на вкладку Network
4. Попробуйте выполнить любое действие (логин, загрузка данных)
5. Проверьте, что запросы идут на правильный URL backend
6. Не должно быть ошибок CORS

## Текущие переменные в vercel.env:

```
VITE_API_URL=https://your-backend-name.onrender.com/api
```

**⚠️ ВАЖНО:** Замените `your-backend-name.onrender.com` на реальный URL вашего backend из Render!
