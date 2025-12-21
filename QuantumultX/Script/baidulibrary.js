var Jard1n = JSON.parse($response.body);

if (Jard1n && Jard1n.data && Jard1n.data.vip) {
    Jard1n.data.vip.base_vip_info = {
        "uid": 12345678,
        "type": 2,
        "start_time": 1622222200,
        "end_time": 4622222200,
        "is_vip": 1,
        "remain_day": 999,
        "pro_total": 5,
        "normal_total": 5
    };
}

$done({ body: JSON.stringify(Jard1n) });
