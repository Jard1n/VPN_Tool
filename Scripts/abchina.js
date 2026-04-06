const url = $request.url;
const header = $request.headers;
const headopt = header["Operation-Type"] || header["operation-type"];

const blockList = [
    "com.bankabc.recommendcenter.homepage.gethpadverinfo",
    "com.bankabc.credit.welfareCenter.getadverinfo",
    "com.bankabc.credit.home.getCcocAdInfo",
    "com.bankabc.credit.query.custbillqry.getadv",
    "com.abchina.mbank.common.homepage.getStartParam",
    "alipay.client.updateVersion"
];

if (blockList?.includes(headopt)) {
  $done({ status: "HTTP/1.1 404 Not Found" });
} else {
  $done({});
}
