<<<<<<< HEAD
let mysql = require("mysql");
let pool = mysql.createPool({
  host: "127.0.0.1", //本地地址
  user: "root", //数据库名字
  password: "root", //密码
  database: "tj", //连接数据库
  connectionLimit: "0", //最大连接数
  charset: "UTF8MB4_GENERAL_CI",
});
module.exports = pool;
=======
let mysql = require('mysql')
let pool = mysql.createPool({
    host: "127.0.0.1", //本地地址
    user: "root", //数据库名字
    password: "root", //密码
    database: "qq", //连接数据库
    connectionLimit:'0'//最大连接数
})
module.exports=pool
>>>>>>> 502a09d967bc2e9560a3dc7714a87c5fff68d7e8
