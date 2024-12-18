// 引用地址：https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/lawson.js
let obj=JSON.parse($response.body);
delete obj.data.homeButtonList ;
delete obj.data.dysmorphismPictureList ;
$done({body: JSON.stringify(obj)});
