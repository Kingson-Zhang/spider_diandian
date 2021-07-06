const puppeteer = require('puppeteer');
const moment = require('moment');
const country = require('./country_2.json');
const uploadType = require('./uploadType.json');
const googleCommon = require('./google_common.js');
const sql_opt = require("./sql_opt");

// 获取今天和当前的时间戳
const time_type = "yesterday";
const begin = new Date(moment().format('yyyy-MM-DD 00:00:00')).getTime();
const end = new Date(moment()).getTime() - 1;

(async () => {
    console.log("开始时间:" + moment());
    //查询代理ip及端口
    const querySql = "select * from t_dynamic_ip order by id desc limit 1";
    const queryData = [];
    let queryResult = await sql_opt.ROW(querySql,queryData);
    console.log("获取代理:" + JSON.stringify(queryResult));
    // 打开浏览器
    const browser = await puppeteer.launch({
        headless: false,
        timeout: 0,
        slowMo: 250,
        defaultViewport: {width: 1280, height: 800},
        args:['--no-sandbox','--proxy-server=http://'+queryResult[0].ip+':'+queryResult[0].port]
    });
    // 新建页面窗口1
    const page1 = await browser.newPage();
    await page1.goto("https://app.diandian.com", {waitUntil: 'networkidle0', timeout: 0});
    // 新建页面窗口
    const page = await browser.newPage();
    await page.goto("https://app.diandian.com/rank/line-1-0-0-75-0-2-0", {waitUntil: 'networkidle0', timeout: 0});
    // 生成请求地址
    const p_key = 2;
    let request_url = "";

    for (c_key in country) {
        for (u_key in uploadType) {
            request_url = "https://app.diandian.com/rank/line-11-0-2-" + c_key + "-33-2-0?time=" + begin + "-" + end + "&timetype=yesterday&order=1&upkind=" + u_key;
            console.log("列表地址:" + request_url);
            try {
                await googleCommon.getGooglePage(page, request_url, p_key, country[c_key],time_type);
            }catch (e){
                console.log('error: ', e.message)
                console.log(request_url)
                await page.reload();
                continue;
            }
        }
    }

    // 关闭浏览器
    await browser.close();
})().catch(error => console.log('error: ', error.message));


