// 引用地址：https://raw.githubusercontent.com/Maasea/surgeModule/master/Script/Keep/my.js
let obj = JSON.parse($response.body);
obj.data.floatingInfo = {};
$done({ body: JSON.stringify(obj) });
