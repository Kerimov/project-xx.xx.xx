import { pool } from '../src/db/connection.js';
import bcrypt from 'bcryptjs';

async function fixAdminPassword() {
  try {
    console.log('Подключение к базе данных...');
    await pool.query('SELECT 1');
    console.log('Подключение успешно');

    const passwordHash = bcrypt.hashSync('password', 10);
    console.log('Хэш пароля сгенерирован:', passwordHash);

    const result = await pool.query(
      `UPDATE users 
       SET password_hash = $1 
       WHERE username = 'admin' 
       RETURNING id, username, email, role`,
      [passwordHash]
    );

    if (result.rows.length === 0) {
      console.log('⚠️  Пользователь admin не найден в базе данных');
    } else {
      console.log('✅ Пароль пользователя admin успешно обновлен');
      console.log('Пользователь:', result.rows[0]);
    }

    // Проверяем, что пароль работает
    const checkResult = await pool.query(
      'SELECT password_hash FROM users WHERE username = $1',
      ['admin']
    );

    if (checkResult.rows.length > 0) {
      const isValid = bcrypt.compareSync('password', checkResult.rows[0].password_hash);
      console.log('✅ Проверка пароля:', isValid ? 'Пароль работает!' : '❌ Пароль не работает');
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

fixAdminPassword();
