# 脚本执行拦截器
一个用于拦截指定关键词的script标签执行的浏览器扩展。
支持正则通配符，支持多条规则，每条规则均可匹配多网站多关键词。

起因为看某些网站时被某些基于内联脚本生成的随机id/匿名小广告烦到，
这类小广告由于没有稳定的id或没有id导致ub，adb不能始终标记那么屏蔽了一茬刷新又出现一茬，
于是随手搓了个插件来拦截这些有特定特征的script标签的执行。既然都不执行了那自然没有这部分广告生成了。

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


