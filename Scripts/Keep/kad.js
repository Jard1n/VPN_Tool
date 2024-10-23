// 引用地址：https://raw.githubusercontent.com/Maasea/surgeModule/master/Script/Keep/kad.js
let obj = JSON.parse($response.body);

delete obj.data.creative;
obj.data.hasAd = 0;

$done({ body: JSON.stringify(obj) });
