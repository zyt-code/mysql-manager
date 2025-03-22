"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultViewProvider = void 0;
class ResultViewProvider {
    constructor(extensionUri) {
        this._extensionUri = extensionUri;
    }
    setWebviewPanel(panel) {
        this._webviewPanel = panel;
        this._webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        this._webviewPanel.webview.html = this._getHtmlForWebview();
        // Handle panel dispose
        this._webviewPanel.onDidDispose(() => {
            this._webviewPanel = undefined;
        });
    }
    updateResults(results) {
        if (!this._webviewPanel) {
            return;
        }
        this._webviewPanel.webview.postMessage({
            command: 'updateResults',
            results
        });
    }
    _getHtmlForWebview() {
        return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MySQL Results</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            padding: 0;
            margin: 0;
          }
          .container {
            padding: 15px;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin-top: 10px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
            position: sticky;
            top: 0;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .error {
            color: red;
            margin-top: 10px;
          }
          .info {
            margin-top: 10px;
            margin-bottom: 10px;
            font-style: italic;
          }
          .no-results {
            margin-top: 20px;
            font-style: italic;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>MySQL Results</h2>
          <div id="info" class="info">No query executed yet</div>
          <div id="error" class="error"></div>
          <div id="results"></div>
        </div>

        <script>
          const vscode = acquireVsCodeApi();
          
          window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
              case 'updateResults':
                updateResults(message.results);
                break;
            }
          });
          
          function updateResults(results) {
            const resultsContainer = document.getElementById('results');
            const infoContainer = document.getElementById('info');
            const errorContainer = document.getElementById('error');
            
            // Clear previous results
            resultsContainer.innerHTML = '';
            errorContainer.innerHTML = '';
            
            if (results.error) {
              errorContainer.textContent = results.error;
              infoContainer.textContent = 'Query execution failed';
              return;
            }
            
            if (!results.rows || results.rows.length === 0) {
              infoContainer.textContent = 'Query executed successfully. No results to display.';
              resultsContainer.innerHTML = '<div class="no-results">No results returned</div>';
              return;
            }
            
            // Display results count
            infoContainer.textContent = `;
        Showing;
        $;
        {
            results.rows.length;
        }
        rows `;
            
            // Create table
            const table = document.createElement('table');
            const thead = document.createElement('thead');
            const tbody = document.createElement('tbody');
            
            // Create header row
            const headerRow = document.createElement('tr');
            const fields = results.fields;
            
            // If fields is an array of objects with name property
            if (fields && fields.length > 0) {
              if (typeof fields[0] === 'object' && fields[0].name) {
                fields.forEach(field => {
                  const th = document.createElement('th');
                  th.textContent =;
    }
}
exports.ResultViewProvider = ResultViewProvider;
//# sourceMappingURL=resultViewProvider.js.map