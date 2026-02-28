# 脚本执行拦截器
一个基于关键词而拦截特定脚本执行的浏览器扩展。
可拦截通过script标签，eval、new Function、document.write等等方式注入的脚本或代码片段。
支持正则通配符，支持多条规则，每条规则均可匹配多网站多关键词。

起初是因为看某些网站时被某些基于内联脚本生成的随机id/匿名小广告烦到，
这类小广告由于是随机id或没有id加之是用的匿名函数创建导致ub，adb等无法始终屏蔽结果屏蔽了一茬刷新又出一茬，
于是随手搓了个插件来拦截这些有特定特征的script标签的执行。既然都不执行了那这部分广告自然不生成了，
此后又优化改良了一下变成现在模样。

# 📘安装方法：
源码安装：
Git Clone 代码。
扩展管理页面 打开 "开发者模式"。
点击 "加载已解压的扩展程序" 选中扩展文件夹即可。

crx安装：
Releases 右键另存为下载crx文件。
扩展管理页面 打开 "开发者模式"。
将crx文件拖入扩展程序页面即可。

# 🔍界面
<img width="849" height="568" alt="image" src="https://github.com/user-attachments/assets/aa53670b-cdd1-4484-9b24-ed90cc2b6383" />
<img width="1524" height="1191" alt="image" src="https://github.com/user-attachments/assets/ab7f46f5-e9f0-43c9-b12c-e6b15ad6eaa7" />
<img width="2229" height="1224" alt="image" src="https://github.com/user-attachments/assets/6c6708eb-c765-49ea-9ba4-28825a3a9f62" />



