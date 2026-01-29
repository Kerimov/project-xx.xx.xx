// Контроллер для работы с НСИ (справочниками)

import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/connection.js';

// Получение списка организаций
export async function getOrganizations(req: Request, res: Response, next: NextFunction) {
  try {
    const { search } = req.query;
    
    let query = 'SELECT id, code, name, inn FROM organizations WHERE 1=1';
    const params: any[] = [];
    
    if (search) {
      query += ' AND (name ILIKE $1 OR code ILIKE $1 OR inn ILIKE $1)';
      params.push(`%${search}%`);
    }
    
    query += ' ORDER BY name LIMIT 100';
    
    const result = await pool.query(query, params);
    
    res.json({
      data: result.rows.map(row => ({
        id: row.id,
        code: row.code,
        name: row.name,
        inn: row.inn
      }))
    });
  } catch (error) {
    next(error);
  }
}

// Получение списка контрагентов (из НСИ или локальной таблицы)
export async function getCounterparties(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, inn } = req.query;
    
    // Пока используем данные из документов, позже будет синхронизация из УХ
    let query = `
      SELECT DISTINCT 
        counterparty_name as name,
        counterparty_inn as inn
      FROM documents
      WHERE counterparty_name IS NOT NULL
    `;
    const params: any[] = [];
    let paramIndex = 1;
    
    if (search) {
      query += ` AND counterparty_name ILIKE $${paramIndex++}`;
      params.push(`%${search}%`);
    }
    
    if (inn) {
      query += ` AND counterparty_inn = $${paramIndex++}`;
      params.push(inn);
    }
    
    query += ' ORDER BY counterparty_name LIMIT 100';
    
    const result = await pool.query(query, params);
    
    res.json({
      data: result.rows.map(row => ({
        name: row.name,
        inn: row.inn
      }))
    });
  } catch (error) {
    next(error);
  }
}

// Получение списка договоров (заглушка, позже будет из УХ)
export async function getContracts(req: Request, res: Response, next: NextFunction) {
  try {
    const { organizationId, counterpartyName } = req.query;
    
    // TODO: Реализовать получение договоров из УХ или локальной таблицы
    // Пока возвращаем пустой список
    res.json({ data: [] });
  } catch (error) {
    next(error);
  }
}

// Получение списка счетов (заглушка, позже будет из УХ)
export async function getAccounts(req: Request, res: Response, next: NextFunction) {
  try {
    const { organizationId, type } = req.query;
    
    // TODO: Реализовать получение счетов из УХ или локальной таблицы
    // Пока возвращаем пустой список
    res.json({ data: [] });
  } catch (error) {
    next(error);
  }
}

// Получение списка складов (заглушка, позже будет из УХ)
export async function getWarehouses(req: Request, res: Response, next: NextFunction) {
  try {
    const { organizationId } = req.query;
    
    // TODO: Реализовать получение складов из УХ или локальной таблицы
    // Пока возвращаем пустой список
    res.json({ data: [] });
  } catch (error) {
    next(error);
  }
}
