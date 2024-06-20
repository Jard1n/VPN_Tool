// 引用地址：https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/didi/didi.js
let obj = JSON.parse($response.body);
obj.data.sections = obj.data.sections.filter(item => ["center_v2", "head_v2", "core_function"].includes(item.sectionId));
$done({body: JSON.stringify(obj)});
