var body = $response.body
    .replace(/<head>/, '<head><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Jard1n/VPN_Tool@main/Scripts/WebAdBlock/Html/18comic.css" type="text/css">');
$done({ body });
