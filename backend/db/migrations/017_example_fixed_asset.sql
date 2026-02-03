-- Пример создания карточки объекта учета "Основное средство"
-- Демонстрирует, как заполняются аналитические признаки (разрезы учета)

-- Пример создания карточки объекта учета "Основное средство"
-- Демонстрирует, как заполняются аналитические признаки (разрезы учета)
-- ВАЖНО: Эта миграция создает тестовую карточку. Если карточка с кодом '0005' уже существует, она не будет создана повторно.

DO $$
DECLARE
  fixed_asset_type_id UUID;
  example_card_id UUID;
BEGIN
  -- Получаем ID типа объекта "Основное средство"
  SELECT id INTO fixed_asset_type_id FROM object_types WHERE code = 'FIXED_ASSET';
  
  IF fixed_asset_type_id IS NOT NULL THEN
    -- Проверяем, не существует ли уже карточка с таким кодом
    IF NOT EXISTS (SELECT 1 FROM object_cards WHERE type_id = fixed_asset_type_id AND code = '0005') THEN
      -- Создаем карточку объекта учета с заполненными аналитическими признаками
      INSERT INTO object_cards (
        type_id,
        code,
        name,
        status,
        attrs
      ) VALUES (
        fixed_asset_type_id,
        '0005',
        'Легковой автомобиль Toyota Camry для отдела продаж',
        'Active',
        jsonb_build_object(
          -- 1. Идентификация и классификация
          'vin', 'JTDBR32E000123456',
          'inventoryCardNumber', 'ОС-6',
          'okofCode', '310.29.10.42.111',
          'depreciationGroup', '3',
          
          -- 2. Финансовая (балансовая) аналитика
          'initialCost', 2500000.00,
          'vatRate', '20',
          'vatAmount', 416667.00,
          'amortBaseCost', 2083333.00,
          
          -- Амортизация
          'amortMethodBU', 'linear',
          'usefulLifeMonthsBU', 60,
          'monthlyAmortBU', 34722.00,
          
          -- 3. Физическая и эксплуатационная аналитика
          'putIntoUseDate', '2024-01-15',
          'condition', 'good',
          'location', 'Отдел продаж. Адрес: г. Москва, ул. Ленина, 1 (основной офис)',
          'departmentId', NULL, -- Можно указать UUID подразделения, если оно есть в системе
          'molId', NULL, -- Можно указать UUID МОЛ, если он есть в системе
          
          -- Технические характеристики (дополнительные поля в JSON)
          'techSpecs', jsonb_build_object(
            'model', 'Camry',
            'engineVolume', '2.5 л',
            'year', 2023,
            'color', 'черный',
            'licensePlate', 'А123ВС777'
          ),
          
          -- 4. Налоговая аналитика
          'amortMethodNU', 'linear',
          'usefulLifeMonthsNU', 60,
          'monthlyAmortNU', 34722.00,
          'kbk', NULL, -- КБК зависит от региона
          'cadastralNumber', NULL, -- Не применимо для автомобиля
          
          -- 5. Управленческая аналитика
          'cfoId', NULL, -- Можно указать UUID ЦФО "Отдел продаж (Москва)", если он есть
          'costItemId', NULL, -- Можно указать UUID статьи затрат "Эксплуатация транспорта"
          
          -- Дополнительная информация
          'maintenanceSchedule', jsonb_build_object(
            'nextMaintenance', '2024-07-15',
            'nextMaintenanceMileage', 15000
          ),
          'insurance', jsonb_build_object(
            'osago', jsonb_build_object(
              'number', 'XXX',
              'validUntil', '2025-01-14'
            ),
            'casco', jsonb_build_object(
              'number', 'YYY',
              'validUntil', '2025-01-14'
            )
          ),
          'history', jsonb_build_array(
            jsonb_build_object(
              'date', '2024-01-15',
              'event', 'Принят в эксплуатацию',
              'document', 'акт ОС-1'
            )
          )
        )
      )
      RETURNING id INTO example_card_id;
      
      RAISE NOTICE 'Создана карточка объекта учета с ID: %', example_card_id;
    ELSE
      RAISE NOTICE 'Карточка с кодом 0005 уже существует, пропускаем создание';
    END IF;
  ELSE
    RAISE NOTICE 'Тип объекта FIXED_ASSET не найден. Сначала выполните миграцию 015_seed_object_types.sql';
  END IF;
END $$;
