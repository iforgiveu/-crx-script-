// content.js - 在 ISOLATED world 运行，负责注入真正的拦截代码
console.log('[Content] 已启动');

// 获取规则并注入
function injectScriptWithRules(rules) {
    // 将规则转换为 JSON 字符串
    const rulesJson = JSON.stringify(rules);
    
    // 创建一个 meta 标签来传递规则
    const meta = document.createElement('meta');
    meta.name = 'script-blocker-rules';
    meta.content = rulesJson;
    document.documentElement.appendChild(meta);
    
    // 注入 inject.js
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inject.js');
    script.onload = function() {
        console.log('[Content] inject.js 已加载');
        this.remove(); // 加载后移除 script 标签
    };
    
    // 在 document_start 阶段注入
    if (document.documentElement) {
        document.documentElement.appendChild(script);
    }
}

// 从 background 获取规则
chrome.runtime.sendMessage({ type: 'GET_RULES' }, function(response) {
    if (response && response.rules) {
        console.log('[Content] 收到规则:', response.rules);
        injectScriptWithRules(response.rules);
    }
});

// 监听规则更新
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === 'UPDATE_RULES') {
        console.log('[Content] 规则更新:', request.rules);
        // 更新 meta 标签
        const meta = document.querySelector('meta[name="script-blocker-rules"]');
        if (meta) {
            meta.content = JSON.stringify(request.rules);
        }
    }
});