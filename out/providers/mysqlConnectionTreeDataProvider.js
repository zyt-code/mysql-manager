"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MySQLConnectionTreeDataProvider = exports.MySQLConnectionTreeItem = void 0;
const vscode = __importStar(require("vscode"));
const queryManager_1 = require("../managers/queryManager");
class MySQLConnectionTreeItem extends vscode.TreeItem {
    constructor(label, collapsibleState, connection, contextValue, database, table) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.connection = connection;
        this.contextValue = contextValue;
        this.database = database;
        this.table = table;
        this.tooltip = label;
        this.contextValue = contextValue;
    }
}
exports.MySQLConnectionTreeItem = MySQLConnectionTreeItem;
class MySQLConnectionTreeDataProvider {
    constructor(connectionManager) {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.connectionManager = connectionManager;
        this.queryManager = new queryManager_1.QueryManager(connectionManager);
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (!element) {
            // Root level - show connections
            const connections = this.connectionManager.getConnections();
            return connections.map(connection => {
                const contextValue = connection.isConnected ? 'connection-connected' : 'connection-disconnected';
                const state = connection.isConnected ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed;
                const item = new MySQLConnectionTreeItem(connection.name, state, connection, contextValue);
                item.description = connection.isConnected ? 'Connected' : '';
                item.iconPath = new vscode.ThemeIcon(connection.isConnected ? 'database' : 'plug');
                return item;
            });
        }
        else if (element.connection && element.connection.isConnected && !element.database) {
            // Connection level - show databases
            try {
                const databases = await this.queryManager.getDatabases(element.connection);
                return databases.map(db => {
                    const item = new MySQLConnectionTreeItem(db, vscode.TreeItemCollapsibleState.Collapsed, element.connection, 'database', db);
                    item.iconPath = new vscode.ThemeIcon('database');
                    return item;
                });
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to get databases: ${error instanceof Error ? error.message : String(error)}`);
                return [];
            }
        }
        else if (element.connection && element.database && !element.table) {
            // Database level - show tables
            try {
                // First, we need to ensure we're connected to the right database
                const conn = element.connection.connection;
                if (conn) {
                    await conn.execute(`USE \`${element.database}\``);
                }
                const tables = await this.queryManager.getTables(element.connection);
                return tables.map(table => {
                    const item = new MySQLConnectionTreeItem(table, vscode.TreeItemCollapsibleState.None, element.connection, 'table', element.database, table);
                    item.iconPath = new vscode.ThemeIcon('table');
                    item.command = {
                        command: 'mysql-manager.showTableData',
                        title: 'Show Table Data',
                        arguments: [item]
                    };
                    return item;
                });
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to get tables: ${error instanceof Error ? error.message : String(error)}`);
                return [];
            }
        }
        return [];
    }
}
exports.MySQLConnectionTreeDataProvider = MySQLConnectionTreeDataProvider;
//# sourceMappingURL=mysqlConnectionTreeDataProvider.js.map