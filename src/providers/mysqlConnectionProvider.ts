import * as vscode from 'vscode';
import { ConnectionManager, MySQLConnection } from '../managers/connectionManager';

export class MySQLConnectionProvider {
  private connectionManager: ConnectionManager;

  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;
  }

  public getConnections(): MySQLConnection[] {
    return this.connectionManager.getConnections();
  }

  public async addConnection(): Promise<MySQLConnection | undefined> {
    return this.connectionManager.addConnection();
  }

  public async editConnection(connection: MySQLConnection): Promise<void> {
    return this.connectionManager.editConnection(connection);
  }

  public deleteConnection(connection: MySQLConnection): void {
    this.connectionManager.deleteConnection(connection);
  }

  public async connect(connection: MySQLConnection): Promise<void> {
    return this.connectionManager.connect(connection);
  }

  public disconnect(connection: MySQLConnection): void {
    this.connectionManager.disconnect(connection);
  }
}