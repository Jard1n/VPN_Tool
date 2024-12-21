// 引用地址：https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/ming.js
let obj = JSON.parse($response.body);
obj.data = [];
$done({body: JSON.stringify(obj)});