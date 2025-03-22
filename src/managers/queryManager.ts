import * as vscode from 'vscode';
import { ConnectionManager, MySQLConnection } from './connectionManager';
import { RowDataPacket, OkPacket, ResultSetHeader, FieldPacket } from 'mysql2/promise';

export interface QueryResult {
  fields: FieldPacket[];
  rows: RowDataPacket[] | OkPacket | OkPacket[] | ResultSetHeader;
  error?: string;
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

  public async getTables(connection: MySQLConnection): Promise<string[]> {
    if (!connection || !connection.isConnected) {
      throw new Error('Connection is not active');
    }

    try {
      const conn = connection.connection;
      if (!conn) {
        throw new Error('Connection is not established');
      }

      const [rows] = await conn.execute<RowDataPacket[]>('SHOW TABLES');
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
}