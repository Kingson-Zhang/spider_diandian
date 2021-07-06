const chalk = require('chalk');
const common = require('./common.js');

// 异步前往IOS游戏列表
async function getIosPage(page, url, platform, c_id,time_type) {
    await page.goto(url, {waitUntil: 'networkidle0', timeout: 0})
    console.log(chalk.blue('前往游戏列表'));
    if(time_type=='today'){
        // 模拟点击今天
        //await page.mouse.click(1116, 266);
    }else{
        // 模拟点击昨天
        await page.mouse.click(1130, 266);
    }
    // 模拟滚动到底部
    await common.autoScroll(page);
    // 等待元素加载完毕
    await page.waitForSelector('.table-list .loading-wrap .release-wrap .search-wrap .title-text');
    const title_text = await page.evaluate(() => document.querySelector('.table-list .loading-wrap .release-wrap .search-wrap .title-text').innerText);
    const app_num = title_text.substring(0, title_text.length - 3)
    console.log("列表应用数：" + app_num)
    if (app_num != 0) {
        // 获取列表数据
        const data = await page.$$eval('.dd-hover-row', data => {
            return data.map(a => {
                return {
                    'game_id': a.children[1].children[0].children[0].children[0].href,
                    'game_name': a.children[1].children[0].children[0].children[1].children[0].children[0].children[0].innerText,
                    'dev_info': a.children[1].children[0].children[0].children[1].children[1].innerText,
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
        // 获取游戏列表对应的明细数据
        for (let i = 0; i < data.length; i++) {
            if (data[i].game_src) {
                const rank_url = data[i].game_src;
                // 获取实时排名
                const rank_return = await getIosRank(page, rank_url);
                console.log(rank_return);
                const menu_list = rank_return.menu_list;
                data[i].app_id = rank_return.app_id;
                data[i].app_store_url = rank_return.app_store_url;
                data[i].rank_pointer = rank_return.dd_pointer;
                data[i].img = rank_return.img;
                data[i].platform = platform;
                data[i].c_id = c_id;
                if (data[i].game_name == '') {
                    data[i].game_name = rank_return.game_name;
                }
                if (data[i].dev_info == '') {
                    data[i].dev_info = rank_return.dev_info;
                }
                console.log(menu_list[0])
                // 获取游戏应用总览
                let detail_url = menu_list[0];
                console.log(detail_url);
                const ios_return = await getIos(page, detail_url);
                data[i].bundle_id = ios_return.bundle_id;
                data[i].country = ios_return.country;
                data[i].img_list = ios_return.img_list;
                //获取游戏评分
                let review_url = menu_list[2];
                const review_return = await getReview(page, review_url)
                data[i].score_star = review_return;
                // 获取游戏下载量
                let download_url = menu_list[11];
                const download_return = await getEstimateDownload(page, download_url)
                data[i].download = download_return;
            }
            console.log("列表+明细数据：", data[i]);
            //数据清洗完毕
            if (i == (data.length - 1)) {
                await common.batchGameOpt(data,time_type);
            }
        }
    } else {
        console.log("列表数据：" + title_text)
    }
}

// 异步获取基础信息及排名
async function getIosRank(page, url, platform) {
    let rank_return = {
        "app_id": "",
        "app_store_url": "",
        "dd_pointer": "99999",
        "dev_info": "",
        "game_name": "",
        "img": "",
        "menu_list": []
    }
    await page.goto(url, {waitUntil: 'networkidle0', timeout: 0})
    // 获取游戏基础信息-开发者、app_id、AppStore链接
    //await page.waitForSelector('.dd-hover-row');
    rank_return.img = await page.evaluate(() => document.querySelector('.dd-app .dd-app-logo').src);
    rank_return.dev_info = await page.evaluate(() => document.querySelector('.app-info .app-info-main .auther .value').innerText);
    rank_return.game_name = await page.evaluate(() => document.querySelector('.app-name .name').innerText);
    rank_return.app_id = await page.evaluate(() => document.querySelector('.app-info .app-info-main .apple-id .value').innerText);
    rank_return.app_store_url = await page.evaluate(() => document.querySelector('.app-info .app-info-main .app-store a').href);
    // 获取总榜免费排名
    const rank_header_list = await page.$$eval(".app-rank-ranking .dd-table-head-item", data => {
        return data.map(a => a.innerText);
    });
    let rank_key = ''
    for (r_key in rank_header_list) {
        if (rank_header_list[r_key] == '总榜(免费)'||rank_header_list[r_key] == '总榜(付费)') {
            rank_key = r_key
        }
    }
    const rank_list = await page.$$eval(".app-rank-ranking .application", data => {
        return data.map(a => a.innerText);
    });
    if (rank_key) {
        if(rank_list[0]=='iPhone实时排名'){
            rank_return.dd_pointer = (rank_list[rank_key] == '-' || rank_list[rank_key] == "-\n-") ? '99999' : common.getCaption(rank_list[rank_key].replace("刚刚更新", ""))
        }else{
            rank_return.dd_pointer = '99999';
        }
    }
    console.log(rank_header_list, rank_list)
    // 获取导航栏菜单
    rank_return.menu_list = await page.$$eval(".menu-item a", data => {
        return data.map(a => a.href);
    });
    console.log(rank_return)
    return rank_return
}

// 异步获取应用总览
async function getIos(page, url) {
    const ios_return = {
        "img_list": "",
        "bundle_id": "",
        "country": ""
    };
    await page.goto(url, {waitUntil: 'networkidle0', timeout: 0});
    await page.waitForSelector(".screen-list");
    // 获取游戏截图
    const screen_list = await page.$$eval(".screen-img", data => {
        return data.map(a => a.children[0].src);
    });
    console.log(screen_list)
    if (screen_list.length != 0) {
        ios_return.img_list = common.getShortUrl(screen_list, "-ssl.mzstatic.com/image/thumb/")
    } else {
        ios_return.img_list = ''
    }
    // 获取游戏bundle_id，发行国家
    const base_header_list = await page.$$eval(".app-base-info-wrap .el-row .dd-text-right.dd-second-font-color", data => {
        return data.map(a =>  a.innerText);
    });
    console.log(base_header_list)
    let bundle_key = ''
    let country_key = ''
    for (base_key in base_header_list){
        if(base_header_list[base_key]=='Bundle ID'){
            bundle_key = base_key
        }
        if(base_header_list[base_key]=='发行国家/地区'){
            country_key = base_key
        }
    }
    // 获取游戏bundle_id，发行国家
    const base_list = await page.$$eval(".app-base-info-wrap .el-row .el-col.el-col-20", data => {
        return data.map(a => a.innerText);
    });
    console.log(base_list)
    ios_return.bundle_id = base_list[bundle_key];
    ios_return.country = common.getCaption(base_list[country_key].replace('\n','').replace('更多',''));
    console.log(ios_return)
    return ios_return
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

// 异步获取下载量
async function getEstimateDownload(page, url) {
    await page.goto(url, {waitUntil: 'networkidle0', timeout: 0})
    const download_list = await page.$$eval(".foreacast-table .dd-text-center", data => {
        return data.map(a => a.innerText);
    });
    if(download_list[1]=="undefined"){
        download_list[1]=-1;
    }
    let download_num = common.StrToNumber(download_list[1] == '¥ 500' ? '0' : download_list[1]);
    console.log(download_num)
    return download_num;
}

// 异步登录方法
async function login(page,user){
    let mobile = '';
    let password = '';
    switch (user){
        case 1:
            mobile = '15378124836';
            password = 'qwerty123';
            break;
        case 2:
            mobile = '15608199379';
            password = 'yanglei123';
            break;
        case 3:
            mobile = '15228996287';
            password = 'kxigg901230';
            break;
        case 4:
            mobile = '15711188211';
            password = 'ZRzhaorui0089';
            break;
        default:
            mobile = '15559079670';
            password = 'xy520.';
            break;
    }
    // 跳转登录界面
    await page.goto('https://app.diandian.com/login', {timeout: 0,waitUntil: 'networkidle0'});
    await page.waitForSelector('.login-footer .other-login');
    // 切换登录方式
    await page.click('.login-footer .other-login');
    // 切换密码登录
    await page.mouse.click(1063,325);
    // 输入账号，密码
    await page.type('input[type=text]',mobile);
    await page.type('input[type=password]',password);
    // 点击登录
    await page.click('.login-btn');
}

module.exports = {
    getIosPage,
    login
}
