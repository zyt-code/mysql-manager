import * as vscode from 'vscode';
import * as mysql from 'mysql2/promise';

export interface MySQLConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string;
  isConnected: boolean;
  connection?: mysql.Connection;
}

export class ConnectionManager {
  private context: vscode.ExtensionContext;
  private connections: MySQLConnection[] = [];

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.loadConnections();
  }

  private loadConnections() {
    const config = vscode.workspace.getConfiguration('mysqlManager');
    const savedConnections = config.get<MySQLConnection[]>('connections') || [];
    this.connections = savedConnections.map(conn => ({
      ...conn,
      isConnected: false,
      connection: undefined
    }));
  }

  private saveConnections() {
    const config = vscode.workspace.getConfiguration('mysqlManager');
    // Save connections without the actual connection objects
    const connectionsToSave = this.connections.map(({ id, name, host, port, user, password, database }) => (
      { id, name, host, port, user, password, database, isConnected: false }
    ));
    config.update('connections', connectionsToSave, vscode.ConfigurationTarget.Global);
  }

  public getConnections(): MySQLConnection[] {
    return this.connections;
  }

  public async addConnection() {
    const name = await vscode.window.showInputBox({ prompt: 'Connection name' });
    if (!name) { return; }

    const host = await vscode.window.showInputBox({ prompt: 'Host', value: 'localhost' });
    if (!host) { return; }

    const portStr = await vscode.window.showInputBox({ prompt: 'Port', value: '3306' });
    if (!portStr) { return; }
    const port = parseInt(portStr, 10);

    const user = await vscode.window.showInputBox({ prompt: 'Username', value: 'root' });
    if (!user) { return; }

    const password = await vscode.window.showInputBox({ prompt: 'Password', password: true });
    if (password === undefined) { return; }

    const database = await vscode.window.showInputBox({ prompt: 'Database (optional)' });

    const newConnection: MySQLConnection = {
      id: Date.now().toString(),
      name,
      host,
      port,
      user,
      password,
      database: database || undefined,
      isConnected: false
    };

    this.connections.push(newConnection);
    this.saveConnections();
    return newConnection;
  }

  public async editConnection(connection: MySQLConnection) {
    if (connection.isConnected) {
      vscode.window.showErrorMessage('Disconnect before editing the connection');
      return;
    }

    const name = await vscode.window.showInputBox({ prompt: 'Connection name', value: connection.name });
    if (!name) { return; }

    const host = await vscode.window.showInputBox({ prompt: 'Host', value: connection.host });
    if (!host) { return; }

    const portStr = await vscode.window.showInputBox({ prompt: 'Port', value: connection.port.toString() });
    if (!portStr) { return; }
    const port = parseInt(portStr, 10);

    const user = await vscode.window.showInputBox({ prompt: 'Username', value: connection.user });
    if (!user) { return; }

    const password = await vscode.window.showInputBox({
      prompt: 'Password (leave empty to keep current)',
      password: true
    });
    if (password === undefined) { return; }

    const database = await vscode.window.showInputBox({
      prompt: 'Database (optional)',
      value: connection.database
    });

    const index = this.connections.findIndex(conn => conn.id === connection.id);
    if (index !== -1) {
      this.connections[index] = {
        ...connection,
        name,
        host,
        port,
        user,
        password: password || connection.password,
        database: database || undefined
      };
      this.saveConnections();
    }
  }

  public async deleteConnection(connection: MySQLConnection) {
    const answer = await vscode.window.showWarningMessage(
      `确定要删除连接 "${connection.name}" 吗？`,
      { modal: true },
      '确定',
      '取消'
    );

    if (answer === '确定') {
      if (connection.isConnected) {
        this.disconnect(connection);
      }

      const index = this.connections.findIndex(conn => conn.id === connection.id);
      if (index !== -1) {
        this.connections.splice(index, 1);
        this.saveConnections();
      }
    }
  }

  public async connect(connection: MySQLConnection): Promise<void> {
    try {
      const conn = await mysql.createConnection({
        host: connection.host,
        port: connection.port,
        user: connection.user,
        password: connection.password,
        database: connection.database
      });

      const index = this.connections.findIndex(c => c.id === connection.id);
      if (index !== -1) {
        this.connections[index].connection = conn;
        this.connections[index].isConnected = true;
      }

      vscode.window.showInformationMessage(`Connected to ${connection.name}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Connection failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  public disconnect(connection: MySQLConnection) {
    const index = this.connections.findIndex(c => c.id === connection.id);
    if (index !== -1 && this.connections[index].isConnected) {
      const conn = this.connections[index].connection;
      if (conn) {
        conn.end().catch(err => {
          vscode.window.showErrorMessage(`Error disconnecting: ${err.message}`);
        });
      }
      this.connections[index].connection = undefined;
      this.connections[index].isConnected = false;
      vscode.window.showInformationMessage(`Disconnected from ${connection.name}`);
    }
  }

  public getActiveConnection(): MySQLConnection | undefined {
    return this.connections.find(conn => conn.isConnected);
  }
}