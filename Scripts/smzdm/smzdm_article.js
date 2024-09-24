// 引用地址：https://raw.githubusercontent.com/linuszlx/JS/main/Smzdm/smzdm-sq.js
let body = JSON.parse($response.body);
 if (body.data.hasOwnProperty("rows") == true) {body['data']['rows']['0'] = [];};
$done({body: JSON.stringify(body)});
