import * as vscode from 'vscode';
import { ConnectionManager, MySQLConnection } from '../managers/connectionManager';
import { QueryManager } from '../managers/queryManager';

export class MySQLConnectionTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly connection?: MySQLConnection,
    public readonly contextValue?: string,
    public readonly database?: string,
    public readonly table?: string
  ) {
    super(label, collapsibleState);
    this.tooltip = label;
    this.contextValue = contextValue;
  }
}

export class MySQLConnectionTreeDataProvider implements vscode.TreeDataProvider<MySQLConnectionTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<MySQLConnectionTreeItem | undefined | null | void> = new vscode.EventEmitter<MySQLConnectionTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<MySQLConnectionTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private connectionManager: ConnectionManager;
  private queryManager: QueryManager;

  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;
    this.queryManager = new QueryManager(connectionManager);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: MySQLConnectionTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: MySQLConnectionTreeItem): Promise<MySQLConnectionTreeItem[]> {
    if (!element) {
      // Root level - show connections
      const connections = this.connectionManager.getConnections();
      return connections.map(connection => {
        const contextValue = connection.isConnected ? 'connection-connected' : 'connection-disconnected';
        const state = connection.isConnected ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed;
        const item = new MySQLConnectionTreeItem(
          connection.name,
          state,
          connection,
          contextValue
        );
        item.description = connection.isConnected ? 'Connected' : '';
        item.iconPath = new vscode.ThemeIcon(connection.isConnected ? 'database' : 'plug');
        return item;
      });
    } else if (element.connection && element.connection.isConnected && !element.database) {
      // Connection level - show databases
      try {
        const databases = await this.queryManager.getDatabases(element.connection);
        return databases.map(db => {
          const item = new MySQLConnectionTreeItem(
            db,
            vscode.TreeItemCollapsibleState.Collapsed,
            element.connection,
            'database',
            db
          );
          item.iconPath = new vscode.ThemeIcon('database');
          return item;
        });
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to get databases: ${error instanceof Error ? error.message : String(error)}`);
        return [];
      }
    } else if (element.connection && element.database && !element.table) {
      // Database level - show tables
      try {
        // First, we need to ensure we're connected to the right database
        const conn = element.connection.connection;
        if (conn) {
          await conn.execute(`USE \`${element.database}\``);
        }
        
        const tables = await this.queryManager.getTables(element.connection);
        return tables.map(table => {
          const item = new MySQLConnectionTreeItem(
            table,
            vscode.TreeItemCollapsibleState.None,
            element.connection,
            'table',
            element.database,
            table
          );
          item.iconPath = new vscode.ThemeIcon('table');
          item.command = {
            command: 'mysql-manager.showTableData',
            title: 'Show Table Data',
            arguments: [item]
          };
          return item;
        });
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to get tables: ${error instanceof Error ? error.message : String(error)}`);
        return [];
      }
    }
    
    return [];
  }
}