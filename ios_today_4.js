const puppeteer = require('puppeteer');
const moment = require('moment');
const country = require('./country_4.json');
const appType = require('./appType.json');
const iosCommon = require('./ios_common');
const sql_opt = require("./sql_opt");

(async () => {
    // 获取今天和当前的时间戳
    const time_type = "today";
    const begin = new Date(moment().format('yyyy-MM-DD 00:00:00')).getTime();
    const end = new Date(moment()).getTime() - 1;
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
    // 新建页面窗口
    const page = await browser.newPage();
    // 模拟登录
    await iosCommon.login(page,3);
    // 生成请求地址
    let request_url = "";
    let p_key = 1;

    for (c_key in country) {
        for (a_key in appType) {
            request_url = "https://app.diandian.com/rank/line-1-0-2-" + c_key + "-172-2-0?time=" + begin + "-" + end + "&timetype=today&order=1&upkind=" + a_key;
            console.log("列表地址:" + request_url);
            try {
                await iosCommon.getIosPage(page, request_url, p_key, country[c_key],time_type);
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
