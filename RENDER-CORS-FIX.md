# Исправление ошибки CORS

## Проблема

Ошибка CORS возникает, когда backend на Render не разрешает запросы с вашего Vercel домена.

## Решение

### 1. Обновите переменную окружения CORS_ORIGIN в Render

1. Зайдите в Render Dashboard → ваш Backend сервис
2. Откройте **Environment** → **Environment Variables**
3. Найдите переменную `CORS_ORIGIN`
4. Обновите значение на ваш реальный Vercel URL:

```
CORS_ORIGIN=https://project-xx-xx-xx.vercel.app
```

### 2. Поддержка нескольких origins (опционально)

Если у вас есть несколько окружений (production, preview, development), можно указать несколько origins через запятую:

```
CORS_ORIGIN=https://project-xx-xx-xx.vercel.app,https://project-xx-xx-xx-git-main.vercel.app,http://localhost:5173
```

### 3. Перезапустите сервис

После обновления переменной окружения:
1. Нажмите **Manual Deploy** → **Deploy latest commit**
2. Или просто подождите автоматического перезапуска

### 4. Проверка

После перезапуска проверьте:
1. Откройте ваш Vercel проект
2. Попробуйте выполнить логин
3. Ошибка CORS должна исчезнуть

## Текущий URL вашего проекта

Судя по ошибке, ваш Vercel URL:
- **Production**: `https://project-xx-xx-xx.vercel.app`
- **Backend**: `https://ecof-portal-backend.onrender.com`

## Важно

- URL должен точно совпадать (включая протокол `https://`)
- Не должно быть лишних пробелов или символов
- После изменения переменной нужно перезапустить сервис
