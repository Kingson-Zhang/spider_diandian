const request = require('request');
const sql_opt = require("./sql_opt");
const proxy = require('./proxy')
const nowTime = new Date().getTime();

(async ()=>{
    // 注销主机
    let timestamp = parseInt(new Date().getTime()/1000);
    let params = {};
    let token = await proxy.createSign(timestamp,params);
    let outResult = await proxy.logOutAll(timestamp,token);
    console.log(outResult)

    // 申请渠道
    params = {
        "count":1
    };
    token = await proxy.createSign(timestamp,params);
    let applyResult = await proxy.applyChannel(timestamp,token,params);
    console.log(applyResult)
    let info = applyResult.RESULT;
    console.log(info);
    console.log(info[0].proxyId)

    // 获取ip
    const order_no = 'DD202151721004ZGHml';
    const proxyId = info[0].proxyId;
    const result = await proxy.getDynamicIP(order_no,proxyId);
    console.log(result)
    if(result.ERRORCODE == '0'){
        console.log("请求成功");
        let info = result.RESULT;
        console.log(info);
        const ip = info.wanIp;
        console.log(ip);
        const port = info.proxyport;
        const addTime = new Date().getTime()/1000;
        let insertSql = "insert into t_dynamic_ip (ip,port,add_time) values (?) ";
        let insertData = [ip,port,addTime];

        let res = sql_opt.EXECUTE(insertSql,insertData);
        console.log(res);
        console.log("操作成功!");
    }else{
        console.log("请求失败!");
        //再次调用获取ip
        const result = await proxy.getDynamicIP(order_no,proxyId);
        console.log(result)
        if(result.ERRORCODE == '0'){
            console.log("请求成功");
            let info = result.RESULT;
            console.log(info);
            const ip = info.wanIp;
            console.log(ip);
            const port = info.proxyport;
            const addTime = new Date().getTime()/1000;
            let insertSql = "insert into t_dynamic_ip (ip,port,add_time) values (?) ";
            let insertData = [ip,port,addTime];
            let res = sql_opt.EXECUTE(insertSql,insertData);
            console.log(res);
            console.log("操作成功!");
        }
    }
})().catch(error => console.log('error: ', error.message));
