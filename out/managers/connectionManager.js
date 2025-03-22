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
exports.ConnectionManager = void 0;
const vscode = __importStar(require("vscode"));
const mysql = __importStar(require("mysql2/promise"));
class ConnectionManager {
    constructor(context) {
        this.connections = [];
        this.context = context;
        this.loadConnections();
    }
    loadConnections() {
        const config = vscode.workspace.getConfiguration('mysqlManager');
        const savedConnections = config.get('connections') || [];
        this.connections = savedConnections.map(conn => ({
            ...conn,
            isConnected: false,
            connection: undefined
        }));
    }
    saveConnections() {
        const config = vscode.workspace.getConfiguration('mysqlManager');
        // Save connections without the actual connection objects
        const connectionsToSave = this.connections.map(({ id, name, host, port, user, password, database }) => ({ id, name, host, port, user, password, database, isConnected: false }));
        config.update('connections', connectionsToSave, vscode.ConfigurationTarget.Global);
    }
    getConnections() {
        return this.connections;
    }
    async addConnection() {
        const name = await vscode.window.showInputBox({ prompt: 'Connection name' });
        if (!name) {
            return;
        }
        const host = await vscode.window.showInputBox({ prompt: 'Host', value: 'localhost' });
        if (!host) {
            return;
        }
        const portStr = await vscode.window.showInputBox({ prompt: 'Port', value: '3306' });
        if (!portStr) {
            return;
        }
        const port = parseInt(portStr, 10);
        const user = await vscode.window.showInputBox({ prompt: 'Username', value: 'root' });
        if (!user) {
            return;
        }
        const password = await vscode.window.showInputBox({ prompt: 'Password', password: true });
        if (password === undefined) {
            return;
        }
        const database = await vscode.window.showInputBox({ prompt: 'Database (optional)' });
        const newConnection = {
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
    async editConnection(connection) {
        if (connection.isConnected) {
            vscode.window.showErrorMessage('Disconnect before editing the connection');
            return;
        }
        const name = await vscode.window.showInputBox({ prompt: 'Connection name', value: connection.name });
        if (!name) {
            return;
        }
        const host = await vscode.window.showInputBox({ prompt: 'Host', value: connection.host });
        if (!host) {
            return;
        }
        const portStr = await vscode.window.showInputBox({ prompt: 'Port', value: connection.port.toString() });
        if (!portStr) {
            return;
        }
        const port = parseInt(portStr, 10);
        const user = await vscode.window.showInputBox({ prompt: 'Username', value: connection.user });
        if (!user) {
            return;
        }
        const password = await vscode.window.showInputBox({
            prompt: 'Password (leave empty to keep current)',
            password: true
        });
        if (password === undefined) {
            return;
        }
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
    deleteConnection(connection) {
        if (connection.isConnected) {
            this.disconnect(connection);
        }
        const index = this.connections.findIndex(conn => conn.id === connection.id);
        if (index !== -1) {
            this.connections.splice(index, 1);
            this.saveConnections();
        }
    }
    async connect(connection) {
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
        }
        catch (error) {
            vscode.window.showErrorMessage(`Connection failed: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
    disconnect(connection) {
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
    getActiveConnection() {
        return this.connections.find(conn => conn.isConnected);
    }
}
exports.ConnectionManager = ConnectionManager;
//# sourceMappingURL=connectionManager.js.map