import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ecof_portal',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

async function createExampleFixedAsset() {
  try {
    console.log('🔍 Проверяю наличие типа объекта FIXED_ASSET...');
    
    // Получаем ID типа объекта "Основное средство"
    let typeRes = await pool.query(
      'SELECT id, code, name FROM object_types WHERE code = $1',
      ['FIXED_ASSET']
    );
    
    if (typeRes.rows.length === 0) {
      console.log('⚠️  Тип объекта FIXED_ASSET не найден. Создаю...');
      
      // Создаем тип объекта FIXED_ASSET
      const createTypeRes = await pool.query(
        `INSERT INTO object_types (code, name, direction_id, icon, description, is_active)
         VALUES ('FIXED_ASSET', 'Основное средство', NULL, 'build', 'Инвентарные объекты основных средств (ОС)', true)
         ON CONFLICT (code) DO NOTHING
         RETURNING id, code, name`,
        []
      );
      
      if (createTypeRes.rows.length === 0) {
        // Попробуем получить еще раз
        typeRes = await pool.query(
          'SELECT id, code, name FROM object_types WHERE code = $1',
          ['FIXED_ASSET']
        );
      } else {
        typeRes = createTypeRes;
      }
      
      if (typeRes.rows.length === 0) {
        console.error('❌ Не удалось создать или найти тип объекта FIXED_ASSET!');
        console.error('   Убедитесь, что миграции применены (запустите бэкенд или выполните миграции вручную)');
        process.exit(1);
      }
      
      console.log('✅ Тип объекта FIXED_ASSET создан');
    }
    
    const fixedAssetTypeId = typeRes.rows[0].id;
    console.log(`✅ Найден тип объекта: ${typeRes.rows[0].name} (${typeRes.rows[0].code})`);
    console.log(`   ID: ${fixedAssetTypeId}`);
    
    // Проверяем, не существует ли уже карточка с таким кодом
    const existingRes = await pool.query(
      'SELECT id, code, name FROM object_cards WHERE type_id = $1 AND code = $2',
      [fixedAssetTypeId, '0005']
    );
    
    if (existingRes.rows.length > 0) {
      console.log(`⚠️  Карточка с кодом 0005 уже существует:`);
      console.log(`   ID: ${existingRes.rows[0].id}`);
      console.log(`   Наименование: ${existingRes.rows[0].name}`);
      console.log('   Пропускаю создание.');
      process.exit(0);
    }
    
    console.log('📝 Создаю карточку объекта учета...');
    
    // Создаем карточку объекта учета с заполненными аналитическими признаками
    const attrs = {
      // 1. Идентификация и классификация
      vin: 'JTDBR32E000123456',
      inventoryCardNumber: 'ОС-6',
      okofCode: '310.29.10.42.111',
      depreciationGroup: '3',
      
      // 2. Финансовая (балансовая) аналитика
      initialCost: 2500000.00,
      vatRate: '20',
      vatAmount: 416667.00,
      amortBaseCost: 2083333.00,
      
      // Амортизация
      amortMethodBU: 'linear',
      usefulLifeMonthsBU: 60,
      monthlyAmortBU: 34722.00,
      
      // 3. Физическая и эксплуатационная аналитика
      putIntoUseDate: '2024-01-15',
      condition: 'good',
      location: 'Отдел продаж. Адрес: г. Москва, ул. Ленина, 1 (основной офис)',
      departmentId: null,
      molId: null,
      
      // Технические характеристики
      techSpecs: {
        model: 'Camry',
        engineVolume: '2.5 л',
        year: 2023,
        color: 'черный',
        licensePlate: 'А123ВС777'
      },
      
      // 4. Налоговая аналитика
      amortMethodNU: 'linear',
      usefulLifeMonthsNU: 60,
      monthlyAmortNU: 34722.00,
      kbk: null,
      cadastralNumber: null,
      
      // 5. Управленческая аналитика
      cfoId: null,
      costItemId: null,
      
      // Дополнительная информация
      maintenanceSchedule: {
        nextMaintenance: '2024-07-15',
        nextMaintenanceMileage: 15000
      },
      insurance: {
        osago: {
          number: 'XXX',
          validUntil: '2025-01-14'
        },
        casco: {
          number: 'YYY',
          validUntil: '2025-01-14'
        }
      },
      history: [
        {
          date: '2024-01-15',
          event: 'Принят в эксплуатацию',
          document: 'акт ОС-1'
        }
      ]
    };
    
    const insertRes = await pool.query(
      `INSERT INTO object_cards (
        type_id,
        code,
        name,
        status,
        attrs
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id, code, name`,
      [
        fixedAssetTypeId,
        '0005',
        'Легковой автомобиль Toyota Camry для отдела продаж',
        'Active',
        JSON.stringify(attrs)
      ]
    );
    
    const card = insertRes.rows[0];
    console.log('✅ Карточка объекта учета успешно создана!');
    console.log(`   ID: ${card.id}`);
    console.log(`   Код: ${card.code}`);
    console.log(`   Наименование: ${card.name}`);
    console.log('\n📋 Карточка доступна в интерфейсе:');
    console.log('   1. Откройте страницу "Аналитики" → вкладка "Объекты учета"');
    console.log('   2. Подпишитесь на "Основное средство" (если еще не подписаны)');
    console.log('   3. Выберите "Основное средство" в выпадающем списке');
    console.log('   4. Вы увидите карточку "0005 - Легковой автомобиль Toyota Camry..."');
    
  } catch (error: any) {
    console.error('❌ Ошибка при создании карточки объекта учета:');
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createExampleFixedAsset();
