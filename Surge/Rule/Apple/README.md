
AppleRules 是与本地化息息相关的规则，比如地图、天气、查找、Facetime、Apple Pay ( iCloud 上传与下载也归于此规则集

AppleCDNRules 是苹果的全球 CDN

AppleNoChinaCDNRules 是大陆没有的 CDN 节点

AppleAPIRules 是苹果的 API 域名

请把 NoChinaCDN 和 APIRules 放在最前面

## 使用中国区账号（App Store + iCloud）

AppleRules 直连

AppleCDNRules 直连

AppleNoChinaCDNRules 代理

AppleAPIRules 直连

## 使用美国区账号（App Store + iCloud）

AppleRules 直连

AppleCDNRules 直连

AppleNoChinaCDNRules 代理

AppleAPIRules 代理

建议 AppleAPIRules 依然直连，请结合自身情况使用
