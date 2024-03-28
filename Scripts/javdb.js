// 引用地址：https://raw.githubusercontent.com/RuCu6/QuanX/main/Scripts/break/javdb.js
// 2023-07-30 18:35

const url = $request.url;
let header = $request.headers;

if (url.includes("/api/v1/movies/") && url.includes("/play?")) {
  header.authorization =
    "Bearer eyJhbGciOiJIUzI1NiJ9.eyJpZCI6OTc1NDMwLCJ1c2VybmFtZSI6IndlaWd1YW5naHQifQ.lyfGvtZcz0SjiKNx-k9Aoe_UgcMyxwG4Xqq3lzvbIao";
  $done({ headers: header });
} else {
  $done({});
}
