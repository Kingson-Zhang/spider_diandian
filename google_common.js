const chalk = require('chalk');
const common = require('./common');

// 获取google详情页
async function getGooglePage(page, url, platform, country, time_type) {
    await page.goto(url, {waitUntil: 'networkidle0', timeout: 0});
    console.log(chalk.blue('前往游戏列表'));
    if(time_type=='today'){
        // 模拟点击今天
        await page.mouse.click(1116, 266);
    }else{
        // 模拟点击昨天
        await page.mouse.click(1130, 266);
        await page.mouse.click(1443, 266);
    }
    // 模拟滚动到底部
    await common.autoScroll(page);
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
                    'game_name': a.children[1].children[0].children[0].children[1].children[0].children[0].children[0].children[0].children[0].innerText,
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
                    await common.batchGameOpt(data,time_type);
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
            rank_return.dd_pointer = (rank_list[rank_key] == '-' || rank_list[rank_key] == "-\n-" || rank_list[rank_key] == '0' || rank_list[rank_key] == '' ) ? '99999' : common.getCaption(rank_list[rank_key].replace("刚刚更新", ""))
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
        google_return.img_list = common.getShortUrl(screen_list, "https://google-play.cdn.diandian.com");
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

module.exports = {
    getGooglePage
}