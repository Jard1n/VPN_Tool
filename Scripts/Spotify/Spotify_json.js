// 引用地址：https://raw.githubusercontent.com/app2smile/rules/master/js/spotify-json.js
console.log(`spotify-json-2023.06.13`);
let url = $request.url;
// console.log(`原始url:${url}`);
if (url.includes('platform=iphone')) {
    url = url.replace(/platform=iphone/, 'platform=ipad');
    // console.log(`替换platform:${url}`);
} else {
    console.log('无需处理');
}
$done({
    url
});
