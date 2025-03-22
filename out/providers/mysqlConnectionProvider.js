"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MySQLConnectionProvider = void 0;
class MySQLConnectionProvider {
    constructor(connectionManager) {
        this.connectionManager = connectionManager;
    }
    getConnections() {
        return this.connectionManager.getConnections();
    }
    async addConnection() {
        return this.connectionManager.addConnection();
    }
    async editConnection(connection) {
        return this.connectionManager.editConnection(connection);
    }
    deleteConnection(connection) {
        this.connectionManager.deleteConnection(connection);
    }
    async connect(connection) {
        return this.connectionManager.connect(connection);
    }
    disconnect(connection) {
        this.connectionManager.disconnect(connection);
    }
}
exports.MySQLConnectionProvider = MySQLConnectionProvider;
//# sourceMappingURL=mysqlConnectionProvider.js.map