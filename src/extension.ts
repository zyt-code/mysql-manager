import * as vscode from 'vscode';
import { MySQLConnectionProvider } from './providers/mysqlConnectionProvider';
import { ResultTreeDataProvider } from './providers/resultTreeDataProvider';
import { ConnectionManager } from './managers/connectionManager';
import { QueryManager } from './managers/queryManager';
import { MySQLConnectionTreeDataProvider } from './providers/mysqlConnectionTreeDataProvider';

export function activate(context: vscode.ExtensionContext) {
  // Initialize managers
  const connectionManager = new ConnectionManager(context);
  const queryManager = new QueryManager(connectionManager);
  
  // Initialize providers
  const connectionProvider = new MySQLConnectionProvider(connectionManager);
  const treeDataProvider = new MySQLConnectionTreeDataProvider(connectionManager);
  const resultTreeDataProvider = new ResultTreeDataProvider();
  
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
  context.subscriptions.push(
    vscode.commands.registerCommand('mysql-manager.addConnection', () => {
      connectionManager.addConnection();
      treeDataProvider.refresh();
    }),
    
    vscode.commands.registerCommand('mysql-manager.editConnection', (node) => {
      connectionManager.editConnection(node.connection);
      treeDataProvider.refresh();
    }),
    
    vscode.commands.registerCommand('mysql-manager.deleteConnection', (node) => {
      connectionManager.deleteConnection(node.connection);
      treeDataProvider.refresh();
    }),
    
    vscode.commands.registerCommand('mysql-manager.connectToDatabase', (node) => {
      connectionManager.connect(node.connection)
        .then(() => {
          treeDataProvider.refresh();
        })
        .catch((err) => {
          vscode.window.showErrorMessage(`Failed to connect: ${err.message}`);
        });
    }),
    
    vscode.commands.registerCommand('mysql-manager.disconnectFromDatabase', (node) => {
      connectionManager.disconnect(node.connection);
      treeDataProvider.refresh();
    }),
    
    vscode.commands.registerCommand('mysql-manager.refreshConnection', () => {
      treeDataProvider.refresh();
    }),
    
    vscode.commands.registerCommand('mysql-manager.executeQuery', () => {
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
      } else {
        vscode.window.showInformationMessage('No SQL file is active');
      }
    }),
    
    vscode.commands.registerCommand('mysql-manager.showTableData', (node) => {
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
    }),
    
    vscode.commands.registerCommand('mysql-manager.previousPage', () => {
      resultTreeDataProvider.previousPage();
    }),
    
    vscode.commands.registerCommand('mysql-manager.showTableStructure', (node) => {
      // 这个命令将在点击表结构节点时触发，但实际上我们已经在树视图中实现了结构展示
      // 所以这里只是一个占位，未来可以扩展为打开一个专门的表结构视图
    }),
    
    vscode.commands.registerCommand('mysql-manager.exportToCsv', () => {
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
    }),
    
    treeView
  );
}

export function deactivate() {
  // Clean up resources when extension is deactivated
}