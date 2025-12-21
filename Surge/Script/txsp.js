const [type] = $request.url.match(/vv|iacc/);
if (type === "iacc") {
   const size = $request.headers["content-length"] || $request.headers["Content-Length"];
   size > 1200 ? $done() : $done({});
} else if (type === "vv") {
   const body = $request.body
      。split("&")
      。filter((param) => !["spadseg", "adversion", "adchid", "adpass"].includes(param.split("=")[0]))
      。join("&");
   $done({ body: body });
}
