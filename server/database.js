const sql = require("mssql");


class DataBase {

    constructor() {
        this.config = {
            user: 'sa',
            password: 'Qz0966lb',
            server: 'localhost',
            database: 'CIPJuninActual',
            port: 1433
        }
    }

    connect() {
        return sql.connect(this.config);
    }

    disconnect() {
        sql.close();
    }

    getConnect() {
        return sql;
    }

}

module.exports = DataBase;