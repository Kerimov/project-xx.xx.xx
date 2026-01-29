-- Вставка тестовых данных для разработки

-- Тестовые организации
INSERT INTO organizations (id, code, name, inn) VALUES
    ('00000000-0000-0000-0000-000000000001', 'ECO', 'ЕЦОФ', '1234567890'),
    ('00000000-0000-0000-0000-000000000002', 'CHILD1', 'Дочка 1', '0987654321'),
    ('00000000-0000-0000-0000-000000000003', 'CHILD2', 'Дочка 2', '1122334455')
ON CONFLICT (code) DO NOTHING;

-- Тестовый пользователь (пароль: "password", хэш bcrypt)
INSERT INTO users (id, username, email, password_hash, role, organization_id) VALUES
    ('00000000-0000-0000-0000-000000000010', 'admin', 'admin@ecof.local', '$2a$10$rOzJqXJqXJqXJqXJqXJqXeJqXJqXJqXJqXJqXJqXJqXJqXJqXJqXJqX', 'ecof_admin', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (username) DO NOTHING;
