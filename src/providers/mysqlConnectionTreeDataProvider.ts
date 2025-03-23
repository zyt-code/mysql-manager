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
    public readonly table?: string,
    public readonly structureType?: string,
    public readonly columnData?: any
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
        // 不再需要在这里执行USE语句，因为我们会在getTables方法中处理
        // 直接传递数据库名称到getTables方法
        const tables = await this.queryManager.getTables(element.connection, element.database);
        return tables.map(table => {
          const item = new MySQLConnectionTreeItem(
            table,
            vscode.TreeItemCollapsibleState.Collapsed,
            element.connection,
            'table',
            element.database,
            table
          );
          item.iconPath = new vscode.ThemeIcon('table');
          return item;
        });
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to get tables: ${error instanceof Error ? error.message : String(error)}`);
        return [];
      }
    }

    // 表级别 - 直接显示表结构相关节点（平级展示）
    if (element.connection && element.database && element.table && !element.structureType) {
      try {
        const items: MySQLConnectionTreeItem[] = [];

        // 添加列节点
        const columnsItem = new MySQLConnectionTreeItem(
          'Columns',
          vscode.TreeItemCollapsibleState.Collapsed,
          element.connection,
          'table-columns',
          element.database,
          element.table,
          'columns'
        );
        columnsItem.iconPath = new vscode.ThemeIcon('symbol-field');
        items.push(columnsItem);

        // 添加键节点（包含主键和外键）
        const keysItem = new MySQLConnectionTreeItem(
          'Keys',
          vscode.TreeItemCollapsibleState.Collapsed,
          element.connection,
          'table-keys',
          element.database,
          element.table,
          'keys'
        );
        keysItem.iconPath = new vscode.ThemeIcon('key');
        items.push(keysItem);

        // 添加索引节点
        const indexesItem = new MySQLConnectionTreeItem(
          'Indexes',
          vscode.TreeItemCollapsibleState.Collapsed,
          element.connection,
          'table-indexes',
          element.database,
          element.table,
          'indexes'
        );
        indexesItem.iconPath = new vscode.ThemeIcon('list-tree');
        items.push(indexesItem);

        return items;
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to get table structure: ${error instanceof Error ? error.message : String(error)}`);
        return [];
      }
    }

    // 表结构详细信息级别 - 显示具体的列、键或索引信息
    if (element.structureType && ['columns', 'primaryKeys', 'foreignKeys', 'indexes', 'keys'].includes(element.structureType)) {
      try {
        // 获取表结构信息
        const tableStructure = await this.queryManager.getTableStructure(
          element.connection!,
          element.database!,
          element.table!
        );

        // 处理特殊情况：keys 结构类型（直接显示主键和外键）
        if (element.structureType === 'keys') {
          try {
            // 获取主键信息
            const primaryKeys = tableStructure.primaryKeys;
            // 获取外键信息
            const foreignKeys = tableStructure.foreignKeys;
            
            const items: MySQLConnectionTreeItem[] = [];
            
            // 添加主键信息
            if (Array.isArray(primaryKeys) && primaryKeys.length > 0) {
              primaryKeys.forEach((key: any) => {
                const item = new MySQLConnectionTreeItem(
                  `PK: ${key.COLUMN_NAME}`,
                  vscode.TreeItemCollapsibleState.None,
                  element.connection,
                  'primary-key-detail',
                  element.database,
                  element.table
                );
                if (key.CONSTRAINT_NAME) {
                  item.description = `Constraint: ${key.CONSTRAINT_NAME}, Seq: ${key.ORDINAL_POSITION}`;
                }
                item.iconPath = new vscode.ThemeIcon('key');
                items.push(item);
              });
            } else {
              // 如果没有主键，显示提示信息
              const noPkItem = new MySQLConnectionTreeItem(
                'No Primary Keys',
                vscode.TreeItemCollapsibleState.None,
                element.connection,
                'no-primary-keys'
              );
              noPkItem.iconPath = new vscode.ThemeIcon('info');
              items.push(noPkItem);
            }
            
            // 添加外键信息
            if (Array.isArray(foreignKeys) && foreignKeys.length > 0) {
              foreignKeys.forEach((key: any) => {
                const item = new MySQLConnectionTreeItem(
                  `FK: ${key.COLUMN_NAME} → ${key.REFERENCED_TABLE_NAME}.${key.REFERENCED_COLUMN_NAME}`,
                  vscode.TreeItemCollapsibleState.None,
                  element.connection,
                  'foreign-key-detail',
                  element.database,
                  element.table
                );
                item.description = `Constraint: ${key.CONSTRAINT_NAME}, Update: ${key.UPDATE_RULE}, Delete: ${key.DELETE_RULE}`;
                item.iconPath = new vscode.ThemeIcon('references');
                items.push(item);
              });
            } else {
              // 如果没有外键，显示提示信息
              const noFkItem = new MySQLConnectionTreeItem(
                'No Foreign Keys',
                vscode.TreeItemCollapsibleState.None,
                element.connection,
                'no-foreign-keys'
              );
              noFkItem.iconPath = new vscode.ThemeIcon('info');
              items.push(noFkItem);
            }
            
            return items;
          } catch (error) {
            vscode.window.showErrorMessage(`Failed to get keys information: ${error instanceof Error ? error.message : String(error)}`);
            return [new MySQLConnectionTreeItem(
              'Failed to load keys information',
              vscode.TreeItemCollapsibleState.None
            )];
          }
        }

        // 根据结构类型返回相应的信息
        const structureData = tableStructure[element.structureType as keyof typeof tableStructure];

        if (!Array.isArray(structureData) || structureData.length === 0) {
          return [new MySQLConnectionTreeItem(
            'No information available',
            vscode.TreeItemCollapsibleState.None
          )];
        }

        // 根据不同的结构类型，显示不同的信息
        switch (element.structureType) {
          case 'columns':
            return structureData.map((column: any) => {
              // 构建列的显示信息，包含更多的列属性
              let description = column.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
              if (column.COLUMN_DEFAULT !== null) {
                description += `, Default: ${column.COLUMN_DEFAULT}`;
              }
              if (column.EXTRA) {
                description += `, ${column.EXTRA}`;
              }
              if (column.COLUMN_COMMENT) {
                description += `, ${column.COLUMN_COMMENT}`;
              }

              const item = new MySQLConnectionTreeItem(
                `${column.COLUMN_NAME} (${column.COLUMN_TYPE})`,
                vscode.TreeItemCollapsibleState.None,
                element.connection,
                'column-detail',
                element.database,
                element.table,
                undefined,
                column
              );
              item.description = description;
              item.iconPath = new vscode.ThemeIcon('symbol-field');
              return item;
            });


          case 'primaryKeys':
            return structureData.map((key: any) => {
              // 显示主键的更多信息
              const item = new MySQLConnectionTreeItem(
                key.COLUMN_NAME,
                vscode.TreeItemCollapsibleState.None,
                element.connection,
                'primary-key-detail',
                element.database,
                element.table
              );
              if (key.PK_NAME) {
                item.description = `Constraint: ${key.PK_NAME}, Seq: ${key.KEY_SEQ}`;
              }
              item.iconPath = new vscode.ThemeIcon('key');
              return item;
            });

          case 'foreignKeys':
            return structureData.map((key: any) => {
              // 显示外键的更多信息，包括更新和删除规则
              const item = new MySQLConnectionTreeItem(
                `${key.COLUMN_NAME} → ${key.REFERENCED_TABLE_NAME}.${key.REFERENCED_COLUMN_NAME}`,
                vscode.TreeItemCollapsibleState.None,
                element.connection,
                'foreign-key-detail',
                element.database,
                element.table
              );
              item.description = `Constraint: ${key.CONSTRAINT_NAME}, Update: ${key.UPDATE_RULE}, Delete: ${key.DELETE_RULE}`;
              item.iconPath = new vscode.ThemeIcon('references');
              return item;
            });

          case 'indexes':
            return structureData.map((index: any) => {
              // 显示索引的更多信息，包括索引类型和唯一性
              const uniqueStr = index.NON_UNIQUE === 0 ? 'UNIQUE' : 'NON-UNIQUE';
              const item = new MySQLConnectionTreeItem(
                `${index.INDEX_NAME}: ${index.COLUMN_NAME}`,
                vscode.TreeItemCollapsibleState.None,
                element.connection,
                'index-detail',
                element.database,
                element.table
              );
              item.description = `Type: ${index.INDEX_TYPE}, ${uniqueStr}, Seq: ${index.SEQ_IN_INDEX}`;
              item.iconPath = new vscode.ThemeIcon('list-tree');
              return item;
            });
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to get table structure: ${error instanceof Error ? error.message : String(error)}`);
        return [];
      }
    }

    return [];
  }
}