import * as vscode from 'vscode';
import { ConnectionManager, MySQLConnection } from './connectionManager';
import { RowDataPacket, OkPacket, ResultSetHeader, FieldPacket } from 'mysql2/promise';

export interface QueryResult {
  fields: FieldPacket[];
  rows: RowDataPacket[] | OkPacket | OkPacket[] | ResultSetHeader;
  error?: string;
}

export interface TableStructure {
  columns: RowDataPacket[];
  primaryKeys: RowDataPacket[];
  foreignKeys: RowDataPacket[];
  indexes: RowDataPacket[];
}

// 类型守卫函数，用于检查rows是否为数组类型
export function isRowDataPacketArray(rows: RowDataPacket[] | OkPacket | OkPacket[] | ResultSetHeader): rows is RowDataPacket[] {
  return Array.isArray(rows);
}

export function isOkPacketArray(rows: RowDataPacket[] | OkPacket | OkPacket[] | ResultSetHeader): rows is OkPacket[] {
  return Array.isArray(rows);
}

export class QueryManager {
  private connectionManager: ConnectionManager;

  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;
  }

  public async executeQuery(query: string): Promise<QueryResult> {
    const activeConnection = this.connectionManager.getActiveConnection();
    if (!activeConnection || !activeConnection.isConnected) {
      throw new Error('No active connection. Please connect to a database first.');
    }

    try {
      const connection = activeConnection.connection;
      if (!connection) {
        throw new Error('Connection is not established');
      }

      const [rows, fields] = await connection.execute<RowDataPacket[]>(query);
      return { fields: fields as FieldPacket[], rows: rows };
    } catch (error) {
      vscode.window.showErrorMessage(`Query execution failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  public async showTableData(connection: MySQLConnection, tableName: string): Promise<QueryResult> {
    if (!connection || !connection.isConnected) {
      throw new Error('Connection is not active');
    }

    try {
      const conn = connection.connection;
      if (!conn) {
        throw new Error('Connection is not established');
      }

      // First get the table structure
      const [fields] = await conn.execute<RowDataPacket[]>(`DESCRIBE \`${tableName}\``);

      // Then get the data
      const [rows] = await conn.execute<RowDataPacket[]>(`SELECT * FROM \`${tableName}\` LIMIT 100`);

      return { fields: fields as unknown as FieldPacket[], rows: rows };
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to fetch table data: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  public async getTables(connection: MySQLConnection, database?: string): Promise<string[]> {
    if (!connection || !connection.isConnected) {
      throw new Error('Connection is not active');
    }

    try {
      const conn = connection.connection;
      if (!conn) {
        throw new Error('Connection is not established');
      }

      const [rows] = await conn.execute<RowDataPacket[]>(
`SELECT 
  TABLE_NAME,
  TABLE_TYPE,
  ENGINE,
  CREATE_TIME
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = '${database}';`
      );
      if (Array.isArray(rows)) {
        return rows.map((row: RowDataPacket) => Object.values(row)[0] as string);
      }
      return [];
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to fetch tables: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  public async getDatabases(connection: MySQLConnection): Promise<string[]> {
    if (!connection || !connection.isConnected) {
      throw new Error('Connection is not active');
    }

    try {
      const conn = connection.connection;
      if (!conn) {
        throw new Error('Connection is not established');
      }

      const [rows] = await conn.execute<RowDataPacket[]>('SHOW DATABASES');
      if (Array.isArray(rows)) {
        return rows.map((row: RowDataPacket) => Object.values(row)[0] as string);
      }
      return [];
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to fetch databases: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  public async getTableStructure(connection: MySQLConnection, database: string, tableName: string): Promise<TableStructure> {
    if (!connection || !connection.isConnected) {
      throw new Error('Connection is not active');
    }

    try {
      const conn = connection.connection;
      if (!conn) {
        throw new Error('Connection is not established');
      }

      // Get columns information using INFORMATION_SCHEMA.COLUMNS
      const [columns] = await conn.execute<RowDataPacket[]>(
        `SELECT 
           COLUMN_NAME, 
           COLUMN_TYPE, 
           IS_NULLABLE, 
           COLUMN_KEY, 
           COLUMN_DEFAULT, 
           EXTRA,
           COLUMN_COMMENT,
           DATA_TYPE,
           CHARACTER_MAXIMUM_LENGTH,
           NUMERIC_PRECISION,
           NUMERIC_SCALE
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = '${database}' 
         AND TABLE_NAME = '${tableName}'
         ORDER BY ORDINAL_POSITION`
      );

      // Get primary keys
      const [primaryKeys] = await conn.execute<RowDataPacket[]>(
        `SELECT 
           k.COLUMN_NAME,
           k.ORDINAL_POSITION,
           t.CONSTRAINT_NAME
         FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS t
         JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
         USING(CONSTRAINT_NAME,TABLE_SCHEMA,TABLE_NAME)
         WHERE t.CONSTRAINT_TYPE='PRIMARY KEY'
         AND t.TABLE_SCHEMA='${database}'
         AND t.TABLE_NAME='${tableName}'
         ORDER BY k.ORDINAL_POSITION`
      );

      // Get foreign keys
      const [foreignKeys] = await conn.execute<RowDataPacket[]>(
        `SELECT 
           k.COLUMN_NAME, 
           k.REFERENCED_TABLE_NAME, 
           k.REFERENCED_COLUMN_NAME,
           k.CONSTRAINT_NAME,
           k.ORDINAL_POSITION,
           r.UPDATE_RULE,
           r.DELETE_RULE
         FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
         JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS r
         ON k.CONSTRAINT_NAME = r.CONSTRAINT_NAME AND k.TABLE_SCHEMA = r.CONSTRAINT_SCHEMA
         WHERE k.TABLE_SCHEMA='${database}'
         AND k.TABLE_NAME='${tableName}'
         AND k.REFERENCED_TABLE_NAME IS NOT NULL
         ORDER BY k.CONSTRAINT_NAME, k.ORDINAL_POSITION`
      );

      // Get indexes using INFORMATION_SCHEMA.STATISTICS
      const [indexes] = await conn.execute<RowDataPacket[]>(
        `SELECT 
           INDEX_NAME,
           COLUMN_NAME,
           NON_UNIQUE,
           SEQ_IN_INDEX,
           NULLABLE,
           INDEX_TYPE,
           COMMENT,
           SUB_PART
         FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = '${database}'
         AND TABLE_NAME = '${tableName}'
         ORDER BY INDEX_NAME, SEQ_IN_INDEX`
      );

      return {
        columns,
        primaryKeys,
        foreignKeys,
        indexes
      };
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to fetch table structure: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}