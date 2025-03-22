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
exports.ResultTreeDataProvider = exports.ResultTreeItem = void 0;
const vscode = __importStar(require("vscode"));
const queryManager_1 = require("../managers/queryManager");
// 定义树节点类型
class ResultTreeItem extends vscode.TreeItem {
    constructor(label, collapsibleState, value, isHeader = false, columnIndex) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.value = value;
        this.isHeader = isHeader;
        this.columnIndex = columnIndex;
        // 设置不同类型节点的图标和样式
        if (isHeader) {
            this.iconPath = new vscode.ThemeIcon('symbol-field');
            this.contextValue = 'header';
        }
        else {
            this.contextValue = 'cell';
            // 为不同类型的值设置不同图标
            if (value === null) {
                this.iconPath = new vscode.ThemeIcon('circle-slash');
                this.description = 'NULL';
            }
            else if (typeof value === 'number') {
                this.iconPath = new vscode.ThemeIcon('symbol-number');
                this.description = String(value);
            }
            else if (value instanceof Date) {
                this.iconPath = new vscode.ThemeIcon('calendar');
                this.description = value.toISOString().slice(0, 19).replace('T', ' ');
            }
            else if (typeof value === 'boolean') {
                this.iconPath = new vscode.ThemeIcon(value ? 'check' : 'x');
                this.description = String(value);
            }
            else {
                this.iconPath = new vscode.ThemeIcon('symbol-string');
                this.description = String(value);
            }
        }
    }
}
exports.ResultTreeItem = ResultTreeItem;
// 定义结果树数据提供者
class ResultTreeDataProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this._pageSize = 50;
        this._currentPage = 0;
        this._totalPages = 0;
    }
    // 刷新树视图
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    // 更新查询结果
    updateResults(results) {
        this._results = results;
        this._currentPage = 0;
        if (results.rows && (0, queryManager_1.isRowDataPacketArray)(results.rows) && results.rows.length > 0) {
            this._totalPages = Math.ceil(results.rows.length / this._pageSize);
        }
        else {
            this._totalPages = 0;
        }
        this.refresh();
    }
    // 获取树项
    getTreeItem(element) {
        return element;
    }
    // 获取子项
    async getChildren(element) {
        if (!this._results) {
            return [new ResultTreeItem('No results', vscode.TreeItemCollapsibleState.None)];
        }
        if (this._results.error) {
            return [new ResultTreeItem(`Error: ${this._results.error}`, vscode.TreeItemCollapsibleState.None)];
        }
        // 根节点 - 显示分页信息和字段头
        if (!element) {
            const items = [];
            // 添加分页控制
            if (this._totalPages > 1) {
                const paginationItem = new ResultTreeItem(`Page ${this._currentPage + 1} of ${this._totalPages}`, vscode.TreeItemCollapsibleState.None);
                paginationItem.contextValue = 'pagination';
                items.push(paginationItem);
                // 添加分页导航命令
                const prevPageItem = new ResultTreeItem('Previous Page', vscode.TreeItemCollapsibleState.None);
                prevPageItem.command = {
                    command: 'mysql-manager.previousPage',
                    title: 'Previous Page'
                };
                prevPageItem.contextValue = 'navigation';
                prevPageItem.iconPath = new vscode.ThemeIcon('arrow-left');
                if (this._currentPage <= 0) {
                    prevPageItem.description = '(disabled)';
                }
                const nextPageItem = new ResultTreeItem('Next Page', vscode.TreeItemCollapsibleState.None);
                nextPageItem.command = {
                    command: 'mysql-manager.nextPage',
                    title: 'Next Page'
                };
                nextPageItem.contextValue = 'navigation';
                nextPageItem.iconPath = new vscode.ThemeIcon('arrow-right');
                if (this._currentPage >= this._totalPages - 1) {
                    nextPageItem.description = '(disabled)';
                }
                items.push(prevPageItem);
                items.push(nextPageItem);
            }
            // 添加导出命令
            const exportItem = new ResultTreeItem('Export to CSV', vscode.TreeItemCollapsibleState.None);
            exportItem.command = {
                command: 'mysql-manager.exportToCsv',
                title: 'Export to CSV'
            };
            exportItem.contextValue = 'export';
            exportItem.iconPath = new vscode.ThemeIcon('desktop-download');
            items.push(exportItem);
            // 添加结果信息
            const rowCount = (0, queryManager_1.isRowDataPacketArray)(this._results.rows) ? this._results.rows.length : 0;
            const resultInfoItem = new ResultTreeItem(`Results: ${rowCount} rows`, vscode.TreeItemCollapsibleState.None);
            resultInfoItem.contextValue = 'info';
            items.push(resultInfoItem);
            // 添加表头
            const headerItem = new ResultTreeItem('Columns', vscode.TreeItemCollapsibleState.Expanded);
            headerItem.contextValue = 'columns';
            items.push(headerItem);
            // 添加行数据根节点
            const rowsItem = new ResultTreeItem('Rows', vscode.TreeItemCollapsibleState.Expanded);
            rowsItem.contextValue = 'rows';
            items.push(rowsItem);
            return items;
        }
        // 列标题节点 - 显示所有字段名
        if (element.contextValue === 'columns') {
            return this._results.fields.map((field, index) => {
                return new ResultTreeItem(field.name || `Column ${index + 1}`, vscode.TreeItemCollapsibleState.None, undefined, true, index);
            });
        }
        // 行数据节点 - 显示当前页的行
        if (element.contextValue === 'rows') {
            if (!(0, queryManager_1.isRowDataPacketArray)(this._results.rows)) {
                return [new ResultTreeItem('No row data available', vscode.TreeItemCollapsibleState.None)];
            }
            const startIndex = this._currentPage * this._pageSize;
            const endIndex = Math.min(startIndex + this._pageSize, this._results.rows.length);
            const pageRows = this._results.rows.slice(startIndex, endIndex);
            return pageRows.map((row, rowIndex) => {
                const actualRowIndex = startIndex + rowIndex;
                const rowItem = new ResultTreeItem(`Row ${actualRowIndex + 1}`, vscode.TreeItemCollapsibleState.Collapsed);
                rowItem.contextValue = 'row';
                rowItem.id = `row-${actualRowIndex}`;
                return rowItem;
            });
        }
        // 单行节点 - 显示行中的所有单元格
        if (element.contextValue === 'row' && element.id) {
            if (!(0, queryManager_1.isRowDataPacketArray)(this._results.rows)) {
                return [new ResultTreeItem('No row data available', vscode.TreeItemCollapsibleState.None)];
            }
            const rowIndex = parseInt(element.id.split('-')[1]);
            const row = this._results.rows[rowIndex];
            return Object.entries(row).map(([key, value], index) => {
                const fieldName = this._results?.fields[index]?.name || key;
                const cellItem = new ResultTreeItem(fieldName, vscode.TreeItemCollapsibleState.None, value);
                return cellItem;
            });
        }
        return [];
    }
    // 分页控制方法
    nextPage() {
        if (this._currentPage < this._totalPages - 1) {
            this._currentPage++;
            this.refresh();
        }
    }
    previousPage() {
        if (this._currentPage > 0) {
            this._currentPage--;
            this.refresh();
        }
    }
    // 导出CSV方法
    exportToCsv() {
        if (!this._results || !this._results.rows || !(0, queryManager_1.isRowDataPacketArray)(this._results.rows) || this._results.rows.length === 0) {
            return '';
        }
        const headers = this._results.fields.map(f => f.name).join(',');
        const rows = this._results.rows.map((row) => Object.values(row).map(value => this.formatValueForCsv(value)).join(','));
        return [headers, ...rows].join('\n');
    }
    formatValueForCsv(value) {
        if (value === null || value === undefined) {
            return '';
        }
        if (value instanceof Date) {
            return value.toISOString().slice(0, 19).replace('T', ' ');
        }
        if (typeof value === 'number') {
            return value.toString();
        }
        if (typeof value === 'string') {
            // 如果字符串包含逗号、引号或换行符，需要用引号包裹并转义内部引号
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }
        return String(value);
    }
}
exports.ResultTreeDataProvider = ResultTreeDataProvider;
//# sourceMappingURL=resultTreeDataProvider.js.map