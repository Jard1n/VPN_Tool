// 引用地址：https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/coco.js
let obj=JSON.parse($response.body);
delete obj.data.top_background_url ;
delete obj.data.bottom_banner_list ;
$done({body: JSON.stringify(obj)});
