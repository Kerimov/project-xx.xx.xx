-- Исправление хэша пароля для пользователя admin
-- Пароль: "password"

UPDATE users 
SET password_hash = '$2a$10$HpiWOBjTxhKEEeZJihJGhu0EEd0zr7iHNy0oPgcB3bjplwWWhOlpe'
WHERE username = 'admin';
