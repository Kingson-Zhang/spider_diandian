const sql_opt = require('mysql'), pool = sql_opt.createPool({
    connectionLimit: 50,
    host: '10.0.3.174',
    user: 'other_data_crawler',
    password: 'LwglgZpcO55geDsu',
    database: 'other_data',
    port: 3306,
    multipleStatements: true  // 是否允许执行多条sql语句
}), row = (sql, ...params) => { // 将结果的对象数组返回
    return new Promise(function (resolve, reject) {
        pool.getConnection(function (err, connection) {
            if (err) {
                reject(err);
                return;
            }
            connection.query(sql, params, function (error, res) {
                connection.release();
                if (error) {
                    reject(error);
                    return;
                }
                resolve(res);
            });
        });
    });
}, first = (sql, ...params) => { //返回一个对象
    return new Promise(function (resolve, reject) {
        pool.getConnection(function (err, connection) {
            if (err) {
                reject(err);
                return;
            }
            connection.query(sql, params, function (error, res) {
                connection.release();
                if (error) {
                    reject(error);
                    return;
                }
                resolve(res[0] || null);
            });
        });
    });
}, single = (sql, ...params) => { //返回单个查询结果
    return new Promise(function (resolve, reject) {
        pool.getConnection(function (err, connection) {
            if (err) {
                reject(err);
                return;
            }
            connection.query(sql, params, function (error, res) {
                connection.release();
                if (error) {
                    reject(error);
                    return;
                }
                for (let i in res[0]) {
                    resolve(res[0][i] || null);
                    return;
                }
                resolve(null);
            });
        });
    });
}, execute = (sql, ...params) => { //执行代码，返回执行结果
    return new Promise(function (resolve, reject) {
        pool.getConnection(function (err, connection) {
            if (err) {
                reject(err);
                return;
            }
            connection.query(sql, params, function (error, res) {
                connection.release();
                if (error) {
                    reject(error);
                    return;
                }
                resolve(res);
            });
        });
    });
};

//模块导出
module.exports = {
    ROW: row,
    FIRST: first,
    SINGLE: single,
    EXECUTE: execute
};