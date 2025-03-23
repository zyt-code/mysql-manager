import * as vscode from 'vscode';
import { MySQLConnectionProvider } from './providers/mysqlConnectionProvider';
import { ConnectionManager } from './managers/connectionManager';
import { QueryManager } from './managers/queryManager';
import { MySQLConnectionTreeDataProvider } from './providers/mysqlConnectionTreeDataProvider';
import { ResultTableDataProvider } from './providers/resultTableDataProvider';

export function activate(context: vscode.ExtensionContext) {
  // Initialize managers
  const connectionManager = new ConnectionManager(context);
  const queryManager = new QueryManager(connectionManager);
  
  // Initialize providers
  const connectionProvider = new MySQLConnectionProvider(connectionManager);
  const treeDataProvider = new MySQLConnectionTreeDataProvider(connectionManager);
  const resultTableDataProvider = new ResultTableDataProvider(context.extensionUri);
  
  // Register tree view
  const treeView = vscode.window.createTreeView('mysqlConnectionsView', {
    treeDataProvider: treeDataProvider,
    showCollapseAll: true
  });
  
  // Register result view as webview
  const resultWebView = vscode.window.registerWebviewViewProvider(
    'mysqlResultView',
    resultTableDataProvider,
    {
      webviewOptions: {
        retainContextWhenHidden: true
      }
    }
  );
  
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
    
    vscode.commands.registerCommand('mysql-manager.newQuery', async (node) => {
      // 确保有连接节点
      if (!node || !node.connection || !node.connection.isConnected) {
        vscode.window.showErrorMessage('请先连接到数据库');
        return;
      }
      
      try {
        // 获取当前连接的数据库列表
        const databases = await queryManager.getDatabases(node.connection);
        if (!databases || databases.length === 0) {
          vscode.window.showErrorMessage('无法获取数据库列表');
          return;
        }
        
        // 创建新的SQL编辑器文档
        const tempFile = vscode.Uri.parse(`untitled:query-${new Date().getTime()}.sql`);
        const doc = await vscode.workspace.openTextDocument(tempFile);
        const editor = await vscode.window.showTextDocument(doc);
        
        // 添加初始SQL注释，包含数据库选择信息
        await editor.edit(editBuilder => {
          // 添加注释，包含当前连接信息和数据库选择提示
          const header = `-- 连接: ${node.connection.name}\n-- 数据库: ${node.connection.database || '请选择数据库'}\n-- 使用右下角下拉菜单选择数据库\n\n`;
          editBuilder.insert(new vscode.Position(0, 0), header);
        });
        
        // 创建数据库选择状态栏项
        const databasePicker = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        databasePicker.text = `$(database) ${node.connection.database || '选择数据库'}`;
        databasePicker.tooltip = '点击选择数据库';
        databasePicker.command = {
          title: '选择数据库',
          command: 'mysql-manager._selectDatabase',
          arguments: [node.connection, databases, databasePicker]
        };
        databasePicker.show();
        
        // 当编辑器关闭时，移除状态栏项
        const disposable = vscode.window.onDidChangeActiveTextEditor(e => {
          if (!e || e.document.uri.toString() !== doc.uri.toString()) {
            databasePicker.dispose();
            disposable.dispose();
          }
        });
      } catch (error) {
        vscode.window.showErrorMessage(`创建查询失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),
    
    // 注册数据库选择命令（内部使用）
    vscode.commands.registerCommand('mysql-manager._selectDatabase', async (connection, databases, statusBarItem) => {
      const selected = await vscode.window.showQuickPick(databases, {
        placeHolder: '选择数据库'
      });
      
      if (selected) {
        // 更新连接的当前数据库
        connection.database = selected;
        statusBarItem.text = `$(database) ${selected}`;
        
        // 更新编辑器中的数据库注释
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const document = editor.document;
          const text = document.getText();
          const lines = text.split('\n');
          
          // 查找并更新数据库注释行
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('-- 数据库:')) {
              await editor.edit(editBuilder => {
                const range = new vscode.Range(
                  new vscode.Position(i, 0),
                  new vscode.Position(i, lines[i].length)
                );
                editBuilder.replace(range, `-- 数据库: ${selected}`);
              });
              break;
            }
          }
        }
      }
    }),
    
    vscode.commands.registerCommand('mysql-manager.executeQuery', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === 'sql') {
        const query = editor.document.getText();
        queryManager.executeQuery(query)
          .then((results) => {
            resultTableDataProvider.updateResults(results);
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
          resultTableDataProvider.updateResults(results);
          vscode.commands.executeCommand('workbench.view.extension.mysqlResultView');
        })
        .catch((err) => {
          vscode.window.showErrorMessage(`Failed to fetch table data: ${err.message}`);
        });
    }),

    
    vscode.commands.registerCommand('mysql-manager.showTableStructure', (node) => {
      // 这个命令将在点击表结构节点时触发，但实际上我们已经在树视图中实现了结构展示
      // 所以这里只是一个占位，未来可以扩展为打开一个专门的表结构视图
    }),
    
    
    treeView
  );
}

export function deactivate() {
  // Clean up resources when extension is deactivated
}