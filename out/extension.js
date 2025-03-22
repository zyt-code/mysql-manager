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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const mysqlConnectionProvider_1 = require("./providers/mysqlConnectionProvider");
const mysqlConnectionTreeDataProvider_1 = require("./providers/mysqlConnectionTreeDataProvider");
const resultTreeDataProvider_1 = require("./providers/resultTreeDataProvider");
const connectionManager_1 = require("./managers/connectionManager");
const queryManager_1 = require("./managers/queryManager");
function activate(context) {
    // Initialize managers
    const connectionManager = new connectionManager_1.ConnectionManager(context);
    const queryManager = new queryManager_1.QueryManager(connectionManager);
    // Initialize providers
    const connectionProvider = new mysqlConnectionProvider_1.MySQLConnectionProvider(connectionManager);
    const treeDataProvider = new mysqlConnectionTreeDataProvider_1.MySQLConnectionTreeDataProvider(connectionManager);
    const resultTreeDataProvider = new resultTreeDataProvider_1.ResultTreeDataProvider();
    // Register tree view
    const treeView = vscode.window.createTreeView('mysqlConnectionsView', {
        treeDataProvider: treeDataProvider,
        showCollapseAll: true
    });
    // Register result view as tree view
    const resultTreeView = vscode.window.createTreeView('mysqlResultView', {
        treeDataProvider: resultTreeDataProvider,
        showCollapseAll: true
    });
    // Register commands
    context.subscriptions.push(vscode.commands.registerCommand('mysql-manager.addConnection', () => {
        connectionManager.addConnection();
        treeDataProvider.refresh();
    }), vscode.commands.registerCommand('mysql-manager.editConnection', (node) => {
        connectionManager.editConnection(node.connection);
        treeDataProvider.refresh();
    }), vscode.commands.registerCommand('mysql-manager.deleteConnection', (node) => {
        connectionManager.deleteConnection(node.connection);
        treeDataProvider.refresh();
    }), vscode.commands.registerCommand('mysql-manager.connectToDatabase', (node) => {
        connectionManager.connect(node.connection)
            .then(() => {
            treeDataProvider.refresh();
        })
            .catch((err) => {
            vscode.window.showErrorMessage(`Failed to connect: ${err.message}`);
        });
    }), vscode.commands.registerCommand('mysql-manager.disconnectFromDatabase', (node) => {
        connectionManager.disconnect(node.connection);
        treeDataProvider.refresh();
    }), vscode.commands.registerCommand('mysql-manager.refreshConnection', () => {
        treeDataProvider.refresh();
    }), vscode.commands.registerCommand('mysql-manager.executeQuery', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === 'sql') {
            const query = editor.document.getText();
            queryManager.executeQuery(query)
                .then((results) => {
                resultTreeDataProvider.updateResults(results);
                vscode.commands.executeCommand('workbench.view.extension.mysqlResultView');
            })
                .catch((err) => {
                vscode.window.showErrorMessage(`Failed to execute query: ${err.message}`);
            });
        }
        else {
            vscode.window.showInformationMessage('No SQL file is active');
        }
    }), vscode.commands.registerCommand('mysql-manager.showTableData', (node) => {
        queryManager.showTableData(node.connection, node.table)
            .then((results) => {
            resultTreeDataProvider.updateResults(results);
            vscode.commands.executeCommand('workbench.view.extension.mysqlResultView');
        })
            .catch((err) => {
            vscode.window.showErrorMessage(`Failed to fetch table data: ${err.message}`);
        });
    }), 
    // 注册分页和导出命令
    vscode.commands.registerCommand('mysql-manager.nextPage', () => {
        resultTreeDataProvider.nextPage();
    }), vscode.commands.registerCommand('mysql-manager.previousPage', () => {
        resultTreeDataProvider.previousPage();
    }), vscode.commands.registerCommand('mysql-manager.exportToCsv', () => {
        const csvContent = resultTreeDataProvider.exportToCsv();
        if (!csvContent) {
            vscode.window.showInformationMessage('No data to export');
            return;
        }
        // 创建临时文件并打开
        const tempFile = vscode.Uri.parse(`untitled:results-${new Date().getTime()}.csv`);
        vscode.workspace.openTextDocument(tempFile).then(doc => {
            vscode.window.showTextDocument(doc).then(editor => {
                editor.edit(editBuilder => {
                    editBuilder.insert(new vscode.Position(0, 0), csvContent);
                });
            });
        });
    }), treeView);
}
function deactivate() {
    // Clean up resources when extension is deactivated
}
//# sourceMappingURL=extension.js.map