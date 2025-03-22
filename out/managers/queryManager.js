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
exports.QueryManager = void 0;
exports.isRowDataPacketArray = isRowDataPacketArray;
exports.isOkPacketArray = isOkPacketArray;
const vscode = __importStar(require("vscode"));
// 类型守卫函数，用于检查rows是否为数组类型
function isRowDataPacketArray(rows) {
    return Array.isArray(rows);
}
function isOkPacketArray(rows) {
    return Array.isArray(rows);
}
class QueryManager {
    constructor(connectionManager) {
        this.connectionManager = connectionManager;
    }
    async executeQuery(query) {
        const activeConnection = this.connectionManager.getActiveConnection();
        if (!activeConnection || !activeConnection.isConnected) {
            throw new Error('No active connection. Please connect to a database first.');
        }
        try {
            const connection = activeConnection.connection;
            if (!connection) {
                throw new Error('Connection is not established');
            }
            const [rows, fields] = await connection.execute(query);
            return { fields: fields, rows: rows };
        }
        catch (error) {
            vscode.window.showErrorMessage(`Query execution failed: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
    async showTableData(connection, tableName) {
        if (!connection || !connection.isConnected) {
            throw new Error('Connection is not active');
        }
        try {
            const conn = connection.connection;
            if (!conn) {
                throw new Error('Connection is not established');
            }
            // First get the table structure
            const [fields] = await conn.execute(`DESCRIBE \`${tableName}\``);
            // Then get the data
            const [rows] = await conn.execute(`SELECT * FROM \`${tableName}\` LIMIT 100`);
            return { fields: fields, rows: rows };
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to fetch table data: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
    async getTables(connection) {
        if (!connection || !connection.isConnected) {
            throw new Error('Connection is not active');
        }
        try {
            const conn = connection.connection;
            if (!conn) {
                throw new Error('Connection is not established');
            }
            const [rows] = await conn.execute('SHOW TABLES');
            if (Array.isArray(rows)) {
                return rows.map((row) => Object.values(row)[0]);
            }
            return [];
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to fetch tables: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
    async getDatabases(connection) {
        if (!connection || !connection.isConnected) {
            throw new Error('Connection is not active');
        }
        try {
            const conn = connection.connection;
            if (!conn) {
                throw new Error('Connection is not established');
            }
            const [rows] = await conn.execute('SHOW DATABASES');
            if (Array.isArray(rows)) {
                return rows.map((row) => Object.values(row)[0]);
            }
            return [];
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to fetch databases: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
}
exports.QueryManager = QueryManager;
//# sourceMappingURL=queryManager.js.map