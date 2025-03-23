import * as vscode from 'vscode';
import { QueryResult, isRowDataPacketArray } from '../managers/queryManager';
import { RowDataPacket } from 'mysql2/promise';

export class ResultTableDataProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private _results?: QueryResult;
    private _pageSize: number = 50;
    private _currentPage: number = 0;
    private _totalPages: number = 0;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'sortColumn':
                    await this._handleSort(data.column, data.direction);
                    break;
                case 'filterColumn':
                    await this._handleFilter(data.column, data.value);
                    break;
                case 'copyCell':
                    await vscode.env.clipboard.writeText(data.value);
                    break;
                case 'nextPage':
                    this.nextPage();
                    break;
                case 'previousPage':
                    this.previousPage();
                    break;
            }
        });
    }

    public updateResults(results: QueryResult): void {
        this._results = results;
        this._currentPage = 0;
        if (results.rows && isRowDataPacketArray(results.rows) && results.rows.length > 0) {
            this._totalPages = Math.ceil(results.rows.length / this._pageSize);
        } else {
            this._totalPages = 0;
        }
        this._updateView();
    }

    private _updateView(): void {
        if (!this._view) return;

        const message = {
            type: 'update',
            data: this._getTableData()
        };

        this._view.webview.postMessage(message);
    }

    private _getTableData(): any {
        if (!this._results || !isRowDataPacketArray(this._results.rows)) {
            return {
                columns: [],
                rows: [],
                pagination: {
                    currentPage: 0,
                    totalPages: 0,
                    totalRows: 0
                }
            };
        }

        const columns = this._results.fields.map(field => ({
            name: field.name,
            type: field.type,
            length: field.length
        }));

        const startIndex = this._currentPage * this._pageSize;
        const endIndex = Math.min(startIndex + this._pageSize, this._results.rows.length);
        const pageRows = this._results.rows.slice(startIndex, endIndex);

        return {
            columns,
            rows: pageRows,
            pagination: {
                currentPage: this._currentPage + 1,
                totalPages: this._totalPages,
                totalRows: this._results.rows.length
            }
        };
    }

    private async _handleSort(column: string, direction: 'asc' | 'desc'): Promise<void> {
        if (!this._results || !isRowDataPacketArray(this._results.rows)) return;

        this._results.rows.sort((a, b) => {
            const aVal = a[column];
            const bVal = b[column];

            if (aVal === null) return direction === 'asc' ? -1 : 1;
            if (bVal === null) return direction === 'asc' ? 1 : -1;

            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });

        this._updateView();
    }

    private async _handleFilter(column: string, value: string): Promise<void> {
        // TODO: Implement filtering logic
    }

    private nextPage(): void {
        if (this._currentPage < this._totalPages - 1) {
            this._currentPage++;
            this._updateView();
        }
    }

    private previousPage(): void {
        if (this._currentPage > 0) {
            this._currentPage--;
            this._updateView();
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const toolkitUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@vscode', 'webview-ui-toolkit', 'dist', 'toolkit.js'));
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Query Results</title>
                <script type="module" src="${toolkitUri}"></script>
                <style>
                    body {
                        padding: 16px;
                        margin: 0;
                    }
                    .container {
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                    }
                    .pagination {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        justify-content: center;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <vscode-data-grid id="resultGrid" aria-label="Query Results" grid-template-columns="1fr"></vscode-data-grid>
                    <div class="pagination">
                        <vscode-button id="prevPage" appearance="secondary" disabled>Previous</vscode-button>
                        <span id="pageInfo"></span>
                        <vscode-button id="nextPage" appearance="secondary" disabled>Next</vscode-button>
                    </div>
                </div>
                <script>
                    (function() {
                        const vscode = acquireVsCodeApi();
                        let currentData = null;

                        window.addEventListener('message', event => {
                            const message = event.data;
                            switch (message.type) {
                                case 'update':
                                    currentData = message.data;
                                    updateGrid(currentData);
                                    break;
                            }
                        });

                        function updateGrid(data) {
                            const grid = document.getElementById('resultGrid');
                            const { columns, rows, pagination } = data;

                            // Set up columns
                            grid.columnDefinitions = columns.map(col => ({
                                columnId: col.name,
                                title: col.name,
                                sortable: true
                            }));

                            // Set up rows
                            grid.rowsData = rows.map(row => {
                                const rowData = {};
                                columns.forEach(col => {
                                    const value = row[col.name];
                                    rowData[col.name] = value === null ? 'NULL' : value;
                                });
                                return rowData;
                            });

                            // Update pagination
                            const prevButton = document.getElementById('prevPage');
                            const nextButton = document.getElementById('nextPage');
                            const pageInfo = document.getElementById('pageInfo');

                            prevButton.disabled = pagination.currentPage <= 1;
                            nextButton.disabled = pagination.currentPage >= pagination.totalPages;
                            pageInfo.textContent = \`Page \${pagination.currentPage} of \${pagination.totalPages} (\${pagination.totalRows} rows)\`;

                            // Add event listeners
                            grid.addEventListener('columnsort', (e) => {
                                const column = e.detail.columnId;
                                const direction = e.detail.sortDirection;
                                vscode.postMessage({
                                    type: 'sortColumn',
                                    column,
                                    direction
                                });
                            });

                            grid.addEventListener('celldblclick', (e) => {
                                const value = e.detail.cellValue;
                                vscode.postMessage({
                                    type: 'copyCell',
                                    value: value
                                });
                            });

                            prevButton.onclick = () => {
                                vscode.postMessage({ type: 'previousPage' });
                            };

                            nextButton.onclick = () => {
                                vscode.postMessage({ type: 'nextPage' });
                            };
                        }
                    }());
                </script>
            </body>
            </html>
        `;
    }
}