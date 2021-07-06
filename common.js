const mysql = require('mysql');
const moment = require('moment');

//千分计数转数字
function StrToNumber(obj){
    const reg = /^[0-9]+.?[0-9]*$/;  //验证字符串是否是数字
    if (!(reg.test(obj))) {
        //为字符串 则判断是否存在','
        if((obj+"").replace(/^\s\s*/, '').replace(/\s\s*$/, '')==""){
            return 0;
        }
        if(obj== undefined){
            return -1;
        }
        if((obj || 0).toString().replace(/(\d)(?=(?:\d{3})+$)/g, '$1,')){
            obj=obj.replace(/,/gi,'');
            return obj;
        }
    }
    return obj;
}

// 通过地址获取游戏id
function getGameId(value){
    let result = '';
    if(value!==null && value !==''){//使用split 进行分割，一定要进行字符串判空
        const str = value.split("https://app.diandian.com/");
        const gameStr = str[1].split('/');
        result = gameStr[1];
    }
    return result;
}

// 通过执行域名截取，返回地址
function getShortUrl(url_list,url){
    let result = '';
    if(Array.isArray(url_list)&&url_list.length!=0){//使用split 进行分割，一定要进行字符串判空
        for(u_key in url_list){
            if(url_list[u_key]!=null && url_list[u_key] !==''){
                const str = url_list[u_key].split(url);
                url_list[u_key] = str[1];
            }
        }
        result = url_list.toString();
    }
    return result;
}

// 自动滚到到界面底部
async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 200);
        });
    });
}

// 批量操作游戏数据入库
async function batchGameOpt(data,time_type) {
    // 数据库信息
    const sqlInfo = {
        host: '10.0.3.174',
        user: 'other_data_crawler',
        password: 'LwglgZpcO55geDsu',
        database: 'other_data',
        port: 3306
    };
    // 创建mysql数据库连接
    const con = mysql.createConnection(sqlInfo);
    // 连接数据库
    con.connect();
    // 数据操作
    for (let i = 0; i < data.length; i++) {
        // 查询是否有旧数据
        let queryData = [];
        let querySql = "";
        let gain_date = "";
        let gain_month = "";
        if(time_type=="today"){
            gain_date = moment().format("yyyy-MM-DD");
            gain_month = moment().format("MM");
        }else{
            gain_date = moment().subtract(1, 'days').format("yyyy-MM-DD");
            gain_month = moment().subtract(1, 'days').format("MM");
        }
        queryData = [data[i].bundle_id];
        querySql = "select * from t_game where bundle_id = ?";
        con.query(querySql, queryData, (err, result) => {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
                console.log(err)
            } else {
                console.log(result);
                let now_time = parseInt(new Date(moment()).getTime() / 1000);
                if (result.length != 0) {
                    console.log(result[0].max_pointer, result[0].max_download);
                    //更新游戏基础数据
                    let updateSql = "update t_game set app_id = ?,country = ?,appstore_upload_time = ?,google_upload_time = ?,max_pointer = ?,max_download = ?,max_score = ?,update_time = ? where bundle_id = ?";
                    let new_max_pointer = '';
                    let new_max_download = '';
                    let new_max_score = '';
                    if (data[i].rank_pointer == 99999) {
                        new_max_pointer = result[0].max_pointer;
                    } else {
                        if (result[0].max_pointer != 99999 && result[0].max_pointer < data[i].rank_pointer) {
                            new_max_pointer = result[0].max_pointer;
                        } else {
                            new_max_pointer = data[i].rank_pointer;
                        }
                    }
                    if (result[0].max_download != '0' && result[0].max_download > data[i].download) {
                        new_max_download = result[0].max_download;
                    } else {
                        new_max_download = data[i].download;
                    }
                    if (result[0].max_score != '0.00' && result[0].max_score > data[i].score_star) {
                        new_max_score = result[0].max_score;
                    } else {
                        new_max_score = data[i].score_star;
                    }
                    let updateData = [
                        data[i].app_id != '' ? data[i].app_id : result[0].app_id,
                        data[i].app_id != '' ? data[i].country : (result[0].country != '' ? (result[0].country + ',' + data[i].country) : data[i].country),
                        result[0].appstore_upload_time != '' ? result[0].appstore_upload_time : (data[i].platform == 1 ? data[i].upload_time : ''),
                        result[0].google_upload_time != '' ? result[0].google_upload_time : (data[i].platform == 1 ? '' : data[i].upload_time),
                        new_max_pointer==0?99999:new_max_pointer,
                        new_max_download,
                        new_max_score,
                        now_time, data[i].bundle_id];
                    console.log(updateData)
                    con.query(updateSql, updateData, function (err, result) {
                        if (err) {
                            console.log('[UPDATE ERROR] - ', err.message);
                            return;
                        }
                        console.log('--------------------------UPDATE----------------------------');
                        console.log('UPDATE affectedRows', result.affectedRows);
                        console.log('-----------------------------------------------------------------\n\n');
                    });

                    //插入游戏数据
                    let insertSql = "insert into t_game_data_"+gain_month+" (g_id,platform,country,price,rank_pointer,download,score_star,download_url,img_list,gain_date,add_time,update_time)  value (?,?,?,?,?,?,?,?,?,?,?,?)";
                    let insertData = [result[0].id, data[i].platform, data[i].c_id, data[i].price == '免费' ? 0 : 1, data[i].rank_pointer==0?99999:data[i].rank_pointer, data[i].download, data[i].score_star, data[i].app_store_url, data[i].img_list, gain_date, now_time, now_time];
                    console.log('--------------------------INSERT----------------------------');
                    console.log('insertSql:', insertSql);
                    console.log('insertData:', insertData);
                    console.log('-----------------------------------------------------------------\n\n');
                    //插入平台游戏数据
                    con.query(insertSql, insertData, function (err, result) {
                        if (err) {
                            console.log('[INSERT ERROR] - ', err.message);
                            return;
                        }
                        //最后一个循环执行完毕
                        if (i == data.length - 1) {
                            con.end();
                        }
                        console.log('--------------------------INSERT----------------------------');
                        console.log('INSERT ID:', result.insertId);
                        console.log('-----------------------------------------------------------------\n\n');
                    });
                } else {
                    //插入数据
                    let insertSql = "insert into t_game (dd_id,app_id,bundle_id,game_name,icon,game_type,dev_info,country,price,appstore_upload_time,google_upload_time,game_src,max_pointer,max_download,max_score,gain_date,add_time,update_time)" +
                        " values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
                    let insertData = [
                        getGameId(data[i].game_id), data[i].app_id, data[i].bundle_id, data[i].game_name,
                        data[i].img, data[i].game_type, data[i].dev_info, data[i].country,
                        data[i].price == '免费' ? 0 : 1, data[i].platform == 1 ? data[i].upload_time : '', data[i].platform == 1 ? '' : data[i].upload_time, data[i].game_src,
                        data[i].rank_pointer==0?99999:data[i].rank_pointer, data[i].download, data[i].score_star, gain_date, now_time, now_time
                    ];
                    console.log(insertSql);
                    console.log(insertData);

                    con.query(insertSql, insertData, function (err, result) {
                        if (err) {
                            console.log('[INSERT ERROR] - ', err.message);
                            return;
                        }
                        console.log('--------------------------INSERT----------------------------');
                        console.log('INSERT ID:', result.insertId);
                        console.log('-----------------------------------------------------------------\n\n');
                        insertSql = "insert into t_game_data_"+gain_month+" (g_id,platform,country,price,rank_pointer,download,score_star,download_url,img_list,gain_date,add_time,update_time) " +
                            " value (?,?,?,?,?,?,?,?,?,?,?,?)";
                        insertData = [result.insertId, data[i].platform,data[i].c_id, data[i].price == '免费' ? 0 : 1, data[i].rank_pointer==0?99999:data[i].rank_pointer, data[i].download, data[i].score_star, data[i].app_store_url, data[i].img_list, gain_date, now_time, now_time];
                        console.log('--------------------------INSERT----------------------------');
                        console.log('insertSql:', insertSql);
                        console.log('insertData:', insertData);
                        console.log('-----------------------------------------------------------------\n\n');
                        //插入平台游戏数据
                        con.query(insertSql, insertData, function (err, result) {
                            if (err) {
                                console.log('[INSERT ERROR] - ', err.message);
                                return;
                            }
                            //最后一个循环执行完毕
                            if (i == data.length - 1) {
                                con.end();
                            }
                            console.log('--------------------------INSERT----------------------------');
                            console.log('INSERT ID:', result.insertId);
                            console.log('-----------------------------------------------------------------\n\n');
                        });
                    });
                }
            }
        })
    }
}

function getCaption(obj){
    if(obj.indexOf("\n") != -1){
        const index1 = obj.lastIndexOf("\n");
        obj=obj.substring(0,index1);
    }
    return obj;
}


module.exports = {
    StrToNumber,
    getShortUrl,
    autoScroll,
    batchGameOpt,
    getCaption
}


