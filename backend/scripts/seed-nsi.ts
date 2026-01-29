// Скрипт для заполнения справочников тестовыми данными

import { pool } from '../src/db/connection.js';
import { testConnection } from '../src/db/connection.js';
import dotenv from 'dotenv';

dotenv.config();

async function seedNSI() {
  try {
    console.log('🌱 Начинаем заполнение справочников тестовыми данными...');
    
    // Проверяем подключение к БД
    await testConnection();
    console.log('✅ Подключение к БД установлено');

    // Организации
    console.log('📋 Добавляем организации...');
    const orgs = [
      { id: '00000000-0000-0000-0000-000000000001', code: 'ECO', name: 'ЕЦОФ', inn: '7700000000' },
      { id: '00000000-0000-0000-0000-000000000002', code: 'D1', name: 'Дочка 1', inn: '7700000001' },
      { id: '00000000-0000-0000-0000-000000000003', code: 'D2', name: 'Дочка 2', inn: '7700000002' },
    ];

    for (const org of orgs) {
      await pool.query(
        `INSERT INTO organizations (id, code, name, inn) 
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET code = $2, name = $3, inn = $4`,
        [org.id, org.code, org.name, org.inn]
      );
    }
    console.log(`✅ Добавлено ${orgs.length} организаций`);

    // Контрагенты
    console.log('👥 Добавляем контрагентов...');
    const counterparties = [
      { id: '10000000-0000-0000-0000-000000000001', name: 'ООО "Ромашка"', inn: '7701000001' },
      { id: '10000000-0000-0000-0000-000000000002', name: 'ООО "Василек"', inn: '7701000002' },
      { id: '10000000-0000-0000-0000-000000000003', name: 'ИП Иванов Иван Иванович', inn: '7701000003' },
      { id: '10000000-0000-0000-0000-000000000004', name: 'ООО "Тюльпан"', inn: '7701000004' },
      { id: '10000000-0000-0000-0000-000000000005', name: 'ООО "Лаванда"', inn: '7701000005' },
    ];

    for (const cp of counterparties) {
      await pool.query(
        `INSERT INTO counterparties (id, name, inn) 
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET name = $2, inn = $3`,
        [cp.id, cp.name, cp.inn]
      );
    }
    console.log(`✅ Добавлено ${counterparties.length} контрагентов`);

    // Договоры
    console.log('📄 Добавляем договоры...');
    const contracts = [
      {
        id: '20000000-0000-0000-0000-000000000001',
        name: 'Договор поставки №1/2026',
        organizationId: '00000000-0000-0000-0000-000000000001',
        counterpartyId: '10000000-0000-0000-0000-000000000001'
      },
      {
        id: '20000000-0000-0000-0000-000000000002',
        name: 'Договор поставки №2/2026',
        organizationId: '00000000-0000-0000-0000-000000000001',
        counterpartyId: '10000000-0000-0000-0000-000000000002'
      },
      {
        id: '20000000-0000-0000-0000-000000000003',
        name: 'Договор оказания услуг №1/2026',
        organizationId: '00000000-0000-0000-0000-000000000002',
        counterpartyId: '10000000-0000-0000-0000-000000000003'
      },
    ];

    for (const contract of contracts) {
      await pool.query(
        `INSERT INTO contracts (id, name, organization_id, counterparty_id) 
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET name = $2, organization_id = $3, counterparty_id = $4`,
        [contract.id, contract.name, contract.organizationId, contract.counterpartyId]
      );
    }
    console.log(`✅ Добавлено ${contracts.length} договоров`);

    // Счета
    console.log('💳 Добавляем счета...');
    const accounts = [
      {
        id: '30000000-0000-0000-0000-000000000001',
        code: '40702810100000000001',
        name: 'Расчетный счет ЕЦОФ',
        organizationId: '00000000-0000-0000-0000-000000000001',
        type: 'расчетный'
      },
      {
        id: '30000000-0000-0000-0000-000000000002',
        code: '40702810100000000002',
        name: 'Валютный счет ЕЦОФ',
        organizationId: '00000000-0000-0000-0000-000000000001',
        type: 'валютный'
      },
      {
        id: '30000000-0000-0000-0000-000000000003',
        code: '40702810100000000003',
        name: 'Расчетный счет Дочка 1',
        organizationId: '00000000-0000-0000-0000-000000000002',
        type: 'расчетный'
      },
      {
        id: '30000000-0000-0000-0000-000000000004',
        code: '40702810100000000004',
        name: 'Расчетный счет Дочка 2',
        organizationId: '00000000-0000-0000-0000-000000000003',
        type: 'расчетный'
      },
    ];

    for (const account of accounts) {
      await pool.query(
        `INSERT INTO accounts (id, code, name, organization_id, type) 
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET code = $2, name = $3, organization_id = $4, type = $5`,
        [account.id, account.code, account.name, account.organizationId, account.type]
      );
    }
    console.log(`✅ Добавлено ${accounts.length} счетов`);

    // Склады
    console.log('🏭 Добавляем склады...');
    const warehouses = [
      {
        id: '40000000-0000-0000-0000-000000000001',
        code: 'WH001',
        name: 'Основной склад ЕЦОФ',
        organizationId: '00000000-0000-0000-0000-000000000001'
      },
      {
        id: '40000000-0000-0000-0000-000000000002',
        code: 'WH002',
        name: 'Склад готовой продукции ЕЦОФ',
        organizationId: '00000000-0000-0000-0000-000000000001'
      },
      {
        id: '40000000-0000-0000-0000-000000000003',
        code: 'WH003',
        name: 'Склад Дочка 1',
        organizationId: '00000000-0000-0000-0000-000000000002'
      },
      {
        id: '40000000-0000-0000-0000-000000000004',
        code: 'WH004',
        name: 'Склад Дочка 2',
        organizationId: '00000000-0000-0000-0000-000000000003'
      },
    ];

    for (const warehouse of warehouses) {
      await pool.query(
        `INSERT INTO warehouses (id, code, name, organization_id) 
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET code = $2, name = $3, organization_id = $4`,
        [warehouse.id, warehouse.code, warehouse.name, warehouse.organizationId]
      );
    }
    console.log(`✅ Добавлено ${warehouses.length} складов`);

    console.log('✅ Заполнение справочников завершено успешно!');
    
    // Закрываем соединение
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при заполнении справочников:', error);
    await pool.end();
    process.exit(1);
  }
}

seedNSI();
