// 引用地址：https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/ems.js
let obj = JSON.parse($response.body);
obj.info.moduleJson = JSON.stringify(JSON.parse(obj.info.moduleJson).filter(item => !item.moduleName.includes("广告")));
$done({body: JSON.stringify(obj)});