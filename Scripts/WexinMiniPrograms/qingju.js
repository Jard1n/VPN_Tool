// 引用地址：https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/qingju.js
let obj=JSON.parse($response.body);
delete obj.data.bannerInfoConfig ;
$done({body: JSON.stringify(obj)});
