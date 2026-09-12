let url = $request.url;
let responseBody = $response.body;

try {
    responseBody = JSON.parse(responseBody);
    // 删除“测一测，你的手机能卖多少钱”
    delete responseBody.respData.bmNewInfo;

    responseBody.respData.itemGroupList = responseBody.respData.itemGroupList.map(itemGroup => {
        // 去掉“我的钱包”
        if (itemGroup.groupType === 15) {
            return null; // 将groupType为15的元素置为null
        } else if (itemGroup.groupType === 3) { // 推荐工具只保留4个
            itemGroup.itemList = itemGroup.itemList.slice(0, 4);
        }
        return itemGroup;
    }).filter(Boolean); // 过滤掉为null的元素
} catch (error) {
    // 错误处理
}

$done({body: JSON.stringify(responseBody)});
