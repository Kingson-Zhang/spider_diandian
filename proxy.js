const request = require('request');
const crypto = require('crypto');
// 1 申请通道
// let timestamp = parseInt(new Date().getTime()/1000);
// let params = {
//     "count":1
// };
// let token = createSign(params);
// applyChannel(timestamp,token,params);

// 2 拨号
//getDynamicIP('DD202151721004ZGHml','8b601802aef311eb9a8f7cd30abda612');

// 4 退出全部
// let timestamp = parseInt(new Date().getTime()/1000);
// let params = {};
// let token =createSign(params);
// logOutAll(timestamp,token);

//申请通道
const applyChannel = (timestamp,token,params) => {
    return new Promise(function (resolve, reject) {
        const options = {
            url: 'http://api.xdaili.cn/xdaili-api/spider/applyChannels',
            json: true,
            headers: {
                'Accept':'*/*',
                'timestamp': timestamp,
                'token':token,
                'spiderId':'c19e326a4e234fcda8db85f1938945d3'//讯代理个人信息获取唯一标志码
            },
            body:params
        };
        request(options, function(error, response, body) {
            if (error) {
                reject(error);
                return;
            }
            if (!error && response.statusCode == 200) {
                resolve(body);
            }
        });
    });
};

// 拨号
const getDynamicIP = (order_no,proxyId) => {
    return new Promise(function (resolve, reject) {
        const url = 'http://api.xdaili.cn/xdaili-api/privateProxy/getDynamicIP/'+order_no+'/'+proxyId;
        const options = {
            url: url
        };
        request(options, function(error, response, body) {
            if (error) {
                reject(error);
                return;
            }
            if (!error && response.statusCode == 200) {
                resolve(JSON.parse(body));
            }
        });
    });
};

// 退出全部
const logOutAll = (timestamp,token) => {
    return new Promise(function (resolve, reject) {
        const options = {
            url: 'http://api.xdaili.cn/xdaili-api/spider/logOutAll',
            json: true,
            headers: {
                'Accept':'*/*',
                'timestamp': timestamp,
                'token':token,
                'spiderId':'c19e326a4e234fcda8db85f1938945d3'//讯代理个人信息获取唯一标志码
            }
        };
        request(options, function(error, response, body) {
            if (error) {
                reject(error);
                return;
            }
            if (!error && response.statusCode == 200) {
                resolve(body);
            }
        });
    });
};

// 申请通道
// function applyChannel(timestamp,token,params){
//     // 5 header添加时间戳和token 请求接口
//     const options = {
//         url: 'http://api.xdaili.cn/xdaili-api/spider/applyChannels',
//         json: true,
//         headers: {
//             'Accept':'*/*',
//             'timestamp': timestamp,
//             'token':token,
//             'spiderId':'c19e326a4e234fcda8db85f1938945d3'//讯代理个人信息获取唯一标志码
//         },
//         body:params
//     };
//     request(options, callback);
// }

// function getDynamicIP(order_no,proxyId){
//     const url = 'http://api.xdaili.cn/xdaili-api/privateProxy/getDynamicIP/'+order_no+'/'+proxyId;
//     const options = {
//         url: url
//     };
//     request(options, callback);
// }

// 注销
function logOut(timestamp,token,params){
    const options = {
        url: 'http://api.xdaili.cn/xdaili-api/spider/logOut',
        json: true,
        headers: {
            'Accept':'*/*',
            'timestamp': timestamp,
            'token':token,
            'spiderId':'c19e326a4e234fcda8db85f1938945d3'//讯代理个人信息获取唯一标志码
        },
        body:params
    };
    request(options, callback);
}

// // 退出全部
// function logOutAll(timestamp,token){
//     const options = {
//         url: 'http://api.xdaili.cn/xdaili-api/spider/logOutAll',
//         json: true,
//         headers: {
//             'Accept':'*/*',
//             'timestamp': timestamp,
//             'token':token,
//             'spiderId':'c19e326a4e234fcda8db85f1938945d3'//讯代理个人信息获取唯一标志码
//         }
//     };
//     request(options, callback);
// }

function keys(params){
    let arr = [];
    for(let i in params){
        arr.push(i + params[i])
    }
    return arr.sort().join('')
}

// 生成签名
function createSign(timestamp,params){
    // 3 计算参数的sign(使用SHA1生成签名）
    let shasum = crypto.createHash('sha1');
    shasum.update(keys(params));
    let sign = shasum.digest('hex');
    sign = sign.toUpperCase();
    // 4 混合计算MD5(timestamp时间戳 + secret密钥 + sign签名）
    let secret = 'f8d84b67ce8d4a88ba0f886fd512654f';//讯代理个人信息获取secret
    let md5 = crypto.createHash('md5');
    md5.update(timestamp + secret + sign);
    let token = md5.digest('hex');
    return token;
}

function callback(error, response, body) {
    if (!error && response.statusCode == 200) {
        console.log(body)
    }
}

//模块导出
module.exports = {
    applyChannel: applyChannel,
    createSign:createSign,
    getDynamicIP:getDynamicIP,
    logOutAll:logOutAll
}
