const puppeteer = require('puppeteer');
const mysql = require('mysql');
const chalk = require('chalk');
const moment = require('moment');
const country = require('./country.json');
const uploadType = require('./uploadType.json');
const platForm = require('./platForm.json');
const appType = require('./appType.json');
// 获取昨天和前天的时间戳
const begin = new Date(moment().subtract(1, 'days').format('yyyy-MM-DD 00:00:00')).getTime();
const end = new Date(moment().subtract(2, 'days').format('yyyy-MM-DD 00:00:00')).getTime() - 1;

(async () => {
    console.log("开始时间:" + moment());
    // 打开浏览器
    const browser = await puppeteer.launch({headless: false, timeout: 0,slowMo: 250, defaultViewport: {width: 1280, height: 800}},);
    // 新建页面窗口
    const page = await browser.newPage();
    // 生成请求地址
    const p_key = 2;
    let request_url = "";
    for (c_key in country) {
        for (u_key in uploadType) {
            request_url = "https://app.diandian.com/rank/line-11-0-2-" + c_key + "-33-2-0?time=" + begin + "-" + end + "&timetype=yesterday&order=1&upkind=" + u_key;
            console.log("列表地址:" + request_url);
            await getGooglePage(page, request_url, p_key, country[c_key]);
        }
    }
    // 关闭浏览器
    await browser.close();
})().catch(error => console.log('error: ', error.message));

// 获取google详情页
async function getGooglePage(page, url, platform, country) {
    await page.goto(url, {waitUntil: 'networkidle0', timeout: 0});
    console.log(chalk.blue('前往游戏列表'));
    // 模拟点击昨天
    await page.mouse.click(1130, 237);
    // 模拟滚动到底部
    await autoScroll(page);
    // 等待元素加载完毕
    await page.waitForSelector('.table-list .loading-wrap .release-wrap .search-wrap .title-text');
    const title_text = await page.evaluate(() => document.querySelector('.table-list .loading-wrap .release-wrap .search-wrap .title-text').innerText);
    const app_num = title_text.substring(0, title_text.length - 3)
    console.log("列表应用数：" + app_num)
    if (app_num != 0) {
        //获取列表游戏信息
        const data = await page.$$eval('.dd-hover-row', data => {
            return data.map(a => {
                return {
                    'game_id': a.children[1].children[0].children[0].children[0].href,
                    'game_name': a.children[1].children[0].children[0].children[1].children[1].innerText,
                    'dev_info': a.children[1].children[0].children[0].children[1].children[2].innerText,
                    'img': a.children[1].children[0].children[0].children[0].children[0].src,
                    'price': a.children[3].children[0].innerText,
                    'game_type': a.children[4].children[0].innerText,
                    'upload_time': a.children[5].children[0].innerText,
                    'game_src': a.children[1].children[0].children[0].children[0].href,
                    "download": "0",
                    "app_store_url": "",
                    'rank_pointer': '99999',
                    "app_id": '',
                    'bundle_id': '',
                    'country': '',
                    'c_id':'',
                    'platform': '',
                    'img_list': '',
                    'score_star': '0.00'
                }
            });
        });
        console.log("列表数据：" + JSON.stringify(data))
        // 获取游戏列表对应的明细数据
        for (let i = 0; i < data.length; i++) {
            if (data[i].game_src) {
                const rank_url = data[i].game_src;
                // 获取goole下载数、链接、实时排名
                const rank_return = await getGoogleRank(page, rank_url);
                console.log(rank_return);
                const menu_list = rank_return.menu_list;
                data[i].download = rank_return.download.replace("+","").replace(",","").replace(".","").replace(" ","");
                data[i].app_store_url = rank_return.app_store_url;
                data[i].rank_pointer = rank_return.dd_pointer;
                data[i].img = rank_return.img;
                data[i].platform = platform;
                data[i].c_id = country;
                if (data[i].game_name == '') {
                    data[i].game_name = rank_return.game_name;
                }
                if (data[i].dev_info == '') {
                    data[i].dev_info = rank_return.dev_info;
                }
                console.log(menu_list)
                // 获取游戏应用总览
                let detail_url = menu_list[0];
                const google_return = await getGoogle(page, detail_url);
                data[i].bundle_id = google_return.bundle_id;
                data[i].country = country;
                data[i].img_list = google_return.img_list;
                //获取游戏评分
                let review_url = menu_list[2];
                const review_return = await getReview(page, review_url)
                data[i].score_star = review_return;
                // 获取游戏下载量
                //let download_url = menu_list[11];
                //await getEstimateDownload(page,download_url)
                console.log("列表+明细数据：", data[i]);
                //数据清洗完毕
                if (i == (data.length - 1)) {
                    await batchGameOpt(data);
                }
            }
        }
        console.log("列表+明细数据：" + JSON.stringify(data))
    }
}


// 异步获取基础信息及排名
async function getGoogleRank(page, url) {
    let rank_return = {
        "download": "",
        "app_store_url": "",
        "dd_pointer": "99999",
        "dev_info": "",
        "game_name": "",
        "img": "",
        "menu_list": []
    }
    await page.goto(url, {waitUntil: 'networkidle0', timeout: 0})
    // 获取游戏基础信息-开发者、app_id、AppStore链接
    await page.waitForSelector('.dd-app .dd-app-logo');
    rank_return.dev_info = await page.evaluate(() => document.querySelector('.app-info .app-info-main .auther .value').innerText);
    rank_return.game_name = await page.evaluate(() => document.querySelector('.app-name .name').innerText);
    rank_return.download = await page.evaluate(() => document.querySelector('.app-info .app-info-main .download .value').innerText);
    rank_return.app_store_url = await page.evaluate(() => document.querySelector('.app-info .app-info-main .app-store a').href);
    rank_return.img = await page.evaluate(() => document.querySelector('.dd-app .dd-app-logo').src);
    // 获取总榜免费排名
    const rank_header_list = await page.$$eval(".app-rank-ranking .dd-table-head-main", data => {
        return data.map(a => a.innerText);
    });
    let rank_key = ''
    for (r_key in rank_header_list) {
        if (rank_header_list[r_key] == '总榜(免费)' || rank_header_list[r_key] == '总榜') {
            rank_key = r_key
        }
    }
    // 判断是否有排名数据
    const rank_info = await page.$$eval(".app-rank-ranking .el-col", data => {
        return data.map(a => a.innerText);
    });
    const rank_data_key = parseInt(rank_key) + 1;
    // 无排名直接返回0
    if (rank_info[rank_data_key] !== "未进入到当前地区榜单") {
        // 有排名获取排名信息
        const rank_list = await page.$$eval(".app-rank-ranking .application", data => {
            return data.map(a => a.innerText);
        });
        if (rank_key) {
            rank_return.dd_pointer = rank_list[rank_key] == '-' ? '99999' : rank_list[rank_key].replace("刚刚更新", "")
        } else {
            rank_return.dd_pointer = '99999';
        }
        console.log(rank_header_list, rank_list)
    } else {
        rank_return.dd_pointer = '99999';
    }
    // 获取导航栏菜单
    rank_return.menu_list = await page.$$eval(".menu-item a", data => {
        return data.map(a => a.href);
    });
    console.log(rank_return)
    return rank_return;
}

// 异步获取应用总览
async function getGoogle(page, url) {
    const google_return = {
        "img_list": "",
        "bundle_id": ""
    };
    await page.goto(url, {waitUntil: 'networkidle0', timeout: 0});
    await page.waitForSelector(".screen-list");
    // 获取游戏截图
    const screen_list = await page.$$eval(".screen-img", data => {
        return data.map(a => a.children[0].src);
    });
    if (screen_list.length != 0) {
        google_return.img_list = getShortUrl(screen_list, "https://google-play.cdn.diandian.com");
    } else {
        google_return.img_list = ''
    }
    console.log(screen_list)
    // 获取游戏bundle_id，发行国家
    const base_list = await page.$$eval(".app-base-info-wrap .el-row .el-col p", data => {
        return data.map(a => a.innerText);
    });
    //let word_main = await page.evaluate(() => document.querySelector('.word-main .content').innerText);
    console.log(base_list);
    google_return.bundle_id = base_list[0];
    return google_return;
}

// 异步获取评分
async function getReview(page, url) {
    await page.goto(url, {waitUntil: 'networkidle0', timeout: 0})
    //await page.waitForSelector('.app-mark-main .score-star .num');
    const star_list = await page.$$eval(".app-mark-main .score-star .num", data => {
        return data.map(a => a.innerText);
    });
    let score_star = star_list[1] ? star_list[1] : star_list[0];
    console.log(score_star)
    return score_star
}

// 批量操作游戏数据入库
async function batchGameOpt(data) {
    // 数据库信息
    const sqlInfo = {
        host: '10.0.2.217',
        user: 'eip',
        password: 'uL4ukMLN9YgqVV7A',
        database: 'other_data',
        port: 3307
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
        let gain_date = moment().subtract(1, 'days').format("yyyy-MM-DD");
        let gain_month = moment().subtract(1, 'days').format("MM");
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
                        new_max_pointer,
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
                    let insertData = [result[0].id, data[i].platform, data[i].c_id, data[i].price == '免费' ? 0 : 1, data[i].rank_pointer, data[i].download, data[i].score_star, data[i].app_store_url, data[i].img_list, gain_date, now_time, now_time];
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
                        data[i].rank_pointer, data[i].download, data[i].score_star, gain_date, now_time, now_time
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
                        insertData = [result.insertId, data[i].platform,data[i].c_id, data[i].price == '免费' ? 0 : 1, data[i].rank_pointer, data[i].download, data[i].score_star, data[i].app_store_url, data[i].img_list, gain_date, now_time, now_time];
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

//千分计数转数字
function StrToNumber(obj){
    const reg = /^[0-9]+.?[0-9]*$/;  //验证字符串是否是数字
    if (!(reg.test(obj))) {
        //为字符串 则判断是否存在','
        if((obj+"").replace(/^\s\s*/, '').replace(/\s\s*$/, '')==""){
            return 0;
        }
        if(obj== undefined){
            return 0;
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