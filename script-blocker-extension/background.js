// background.js - 服务工作线程
//console.log('[Background] 启动',performance.now());

// 获取配置的 Promise 函数 - 每次都从 storage 读
function getConfigFromStorage() {
    return new Promise((resolve) => {
        chrome.storage.local.get([
            'scriptBlockerRules',
            'globalWhitelist',
            'secondaryWhitelist'
        ], function(result) {
            // 处理可能的 chrome.runtime.lastError
            if (chrome.runtime.lastError) {
                console.error('[Background] 读取storage失败:', chrome.runtime.lastError);
                resolve({
                    rules: [],
                    globalWhitelist: [],
                    secondaryWhitelist: []
                });
                return;
            }
            
            resolve({
                rules: result.scriptBlockerRules || [],
                globalWhitelist: result.globalWhitelist || [],
                secondaryWhitelist: result.secondaryWhitelist || []
            });
        });
    });
}

// 监听消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === 'GET_CONFIG') {
        getConfigFromStorage().then(sendResponse);
        return true;  // 异步响应
    }
    
    if (request.type === 'SAVE_RULES') {
        chrome.storage.local.set({ scriptBlockerRules: request.rules }, function() {
            sendResponse({ success: true });
        });
        return true;
    }
    
    if (request.type === 'SAVE_WHITELIST') {
        let updates = {};
        if (request.globalWhitelist !== undefined) {
            updates.globalWhitelist = request.globalWhitelist;
        }
        if (request.secondaryWhitelist !== undefined) {
            updates.secondaryWhitelist = request.secondaryWhitelist;
        }
        chrome.storage.local.set(updates, function() {
            sendResponse({ success: true });
        });
        return true;
    }
});

// 配置更新时广播
chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'local') {
        console.log('[Background] 配置变化:', Object.keys(changes));
        // 重新从 storage 获取最新配置再广播
        getConfigFromStorage().then(config => {
            chrome.tabs.query({}, function(tabs) {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, {
                        type: 'UPDATE_CONFIG',
                        rules: config.rules,
                        globalWhitelist: config.globalWhitelist,
                        secondaryWhitelist: config.secondaryWhitelist
                    }).catch(() => {});
                });
            });
        });
    }
});

console.log('[Background] 已就绪');