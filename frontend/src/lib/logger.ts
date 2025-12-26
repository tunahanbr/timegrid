/* eslint-disable @typescript-eslint/no-explicit-any */
// Production-ready logging utility
// Only logs in development mode, silent in production

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  context?: string;
  data?: any;
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    // Check if running in development mode
    this.isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
  }

  private formatMessage(level: LogLevel, message: string, options?: LogOptions): string {
    const timestamp = new Date().toISOString();
    const context = options?.context ? `[${options.context}]` : '';
    return `${timestamp} ${level.toUpperCase()} ${context} ${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    // Disable all logging
    return false;
  }

  debug(message: string, options?: LogOptions): void {
    if (!this.shouldLog('debug')) return;
    
    const formatted = this.formatMessage('debug', message, options);
    console.log(formatted);
    
    if (options?.data) {
      console.log('Data:', options.data);
    }
  }

  info(message: string, options?: LogOptions): void {
    if (!this.shouldLog('info')) return;
    
    const formatted = this.formatMessage('info', message, options);
    console.log(formatted);
    
    if (options?.data) {
      console.log('Data:', options.data);
    }
  }

  warn(message: string, options?: LogOptions): void {
    if (!this.shouldLog('warn')) return;
    
    const formatted = this.formatMessage('warn', message, options);
    console.warn(formatted);
    
    if (options?.data) {
      console.warn('Data:', options.data);
    }
  }

  error(message: string, error?: Error | any, options?: LogOptions): void {
    if (!this.shouldLog('error')) return;
    
    const formatted = this.formatMessage('error', message, options);
    console.error(formatted);
    
    if (error) {
      console.error('Error details:', error);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
    
    if (options?.data) {
      console.error('Context data:', options.data);
    }
  }

  // Specialized methods for common patterns
  queryStart(queryKey: string): void {
    this.debug(`Query started`, { context: 'React Query', data: { queryKey } });
  }

  querySuccess(queryKey: string, dataCount?: number): void {
    this.debug(`Query successful`, { 
      context: 'React Query', 
      data: { queryKey, dataCount } 
    });
  }

  queryError(queryKey: string, error: any): void {
    this.error(`Query failed`, error, { context: 'React Query', data: { queryKey } });
  }

  mutationStart(mutationType: string, entity: string): void {
    this.debug(`Mutation started`, { 
      context: 'React Query', 
      data: { mutationType, entity } 
    });
  }

  mutationSuccess(mutationType: string, entity: string): void {
    this.debug(`Mutation successful`, { 
      context: 'React Query', 
      data: { mutationType, entity } 
    });
  }

  mutationError(mutationType: string, entity: string, error: any): void {
    this.error(`Mutation failed`, error, { 
      context: 'React Query', 
      data: { mutationType, entity } 
    });
  }

  offlineOperation(operation: string, details?: any): void {
    this.info(`Offline operation`, { context: 'Offline', data: { operation, ...details } });
  }

  syncStart(queueSize: number): void {
    this.info(`Sync started`, { context: 'Sync', data: { queueSize } });
  }

  syncComplete(successful: number, failed: number): void {
    this.info(`Sync complete`, { context: 'Sync', data: { successful, failed } });
  }

  storageOperation(operation: string, details?: any): void {
    this.debug(`Storage operation`, { context: 'Storage', data: { operation, ...details } });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export type for use in other files
export type { LogLevel, LogOptions };
