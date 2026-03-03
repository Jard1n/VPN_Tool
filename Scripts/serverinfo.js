(async () => {
  let params = getParams($argument);
  // 从参数读取重置日期，默认 1
  let resetDay = params.resetDay || 1;
  // 拼接 URL 告诉 VPS 重置日期
  let requestUrl = `${params.url}?reset_day=${resetDay}`;
  
  let stats = await httpAPI(requestUrl);
  const jsonData = JSON.parse(stats.body);

  const cpuUsage = `${jsonData.cpu_usage}%`;
  const memUsage = `${jsonData.mem_usage}%`;
  
  let panel = {};
  let shifts = { '1': '#06D6A0', '2': '#FFD166', '3': '#EF476F' };
  const col = Diydecide(0, 30, 70, parseInt(jsonData.mem_usage));

  panel.title = params.name || 'Server Info';
  panel.icon = params.icon || 'bolt.horizontal.icloud.fill';
  panel["icon-color"] = shifts[col];
  
  panel.content = `CPU: ${cpuUsage} | MEM: ${memUsage}\n` +
    `周期待续: ${bytesToSize(jsonData.bytes_total)} (起: ${jsonData.cycle_start})\n` +
    `下行: ${bytesToSize(jsonData.bytes_recv)} | 上行: ${bytesToSize(jsonData.bytes_sent)}\n` +
    `系统运行: ${formatUptime(jsonData.uptime)}\n` +
    `更新时间: ${jsonData.last_time}`;

  $done(panel);
})().catch((e) => {
  $done({ title: 'Error', content: `连接失败: ${e}`, icon: 'error' });
});

// -- 下面是辅助函数，保持不变 --
function httpAPI(path = '') {
  return new Promise((resolve, reject) => {
    $httpClient.get({ url: path }, (err, resp, body) => {
      if (err) reject(err); else resolve({ body });
    });
  });
}

function getParams(param) {
  return Object.fromEntries($argument.split('&').map((item) => item.split('=')).map(([k, v]) => [k, decodeURIComponent(v)]));
}

function formatUptime(seconds) {
  var d = Math.floor(seconds / (3600 * 24));
  var h = Math.floor((seconds % (3600 * 24)) / 3600);
  var m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

function bytesToSize(bytes) {
  if (bytes === 0) return '0 B';
  let k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'], i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function Diydecide(x, y, z, item) {
  let array = [x, y, z];
  array.push(item);
  return array.sort((a, b) => a - b).findIndex(i => i === item);
}
