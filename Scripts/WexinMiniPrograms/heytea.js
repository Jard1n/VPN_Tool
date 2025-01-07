// 引用地址：https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/heytea.js
let obj=JSON.parse($response.body);
delete obj.data.ad ;
delete obj.data.brands ;
delete obj.data.info.infos ;
$done({body: JSON.stringify(obj)});
