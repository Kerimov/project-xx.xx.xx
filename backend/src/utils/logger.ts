// Структурированное логирование (консоль + файл в папке logs)

import fs from 'fs';
import path from 'path';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private logLevel: LogLevel;
  private logDir: string | null = null;
  private logFilePath: string | null = null;

  constructor() {
    const envLevel = process.env.LOG_LEVEL || 'info';
    this.logLevel = LogLevel[envLevel.toUpperCase() as keyof typeof LogLevel] || LogLevel.INFO;
    const dir = process.env.LOG_DIR || 'logs';
    if (path.isAbsolute(dir)) {
      this.logDir = dir;
    } else {
      this.logDir = path.join(process.cwd(), dir);
    }
    this.logFilePath = path.join(this.logDir, 'app.log');
  }

  private writeToFile(line: string): void {
    try {
      if (!fs.existsSync(this.logDir!)) {
        fs.mkdirSync(this.logDir!, { recursive: true });
      }
      fs.appendFileSync(this.logFilePath!, line + '\n', 'utf8');
    } catch (_e) {
      // игнорируем ошибки записи в файл
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatLog(entry: LogEntry): string {
    if (process.env.NODE_ENV === 'production') {
      // В продакшене используем JSON формат для парсинга логов
      return JSON.stringify(entry);
    } else {
      // В разработке используем читаемый формат
      const time = entry.timestamp;
      const level = entry.level.toUpperCase().padEnd(5);
      const context = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
      const error = entry.error ? `\n  Error: ${entry.error.name}: ${entry.error.message}` : '';
      return `[${time}] ${level} ${entry.message}${context}${error}`;
    }
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    };

    const formatted = this.formatLog(entry);

    this.writeToFile(formatted);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        break;
    }
  }

  debug(message: string, context?: Record<string, any>) {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, any>) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    this.log(LogLevel.ERROR, message, context, error);
  }
}

export const logger = new Logger();
