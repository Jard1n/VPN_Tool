// 引用地址：https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/shunfeng/shunfeng.js

const url = $request.url;
if (url.includes("app/ad/queryInfoFlow")) {
  let new_body = JSON.parse($response.body);
  new_body.obj = Object.values(new_body.obj).filter((item) => item.adverId == 2833);
  $done({body: JSON.stringify(new_body)});
}