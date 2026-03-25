// background.js - 带缓存的版本

let cachedConfig = {
    rules: [],
    globalWhitelist: [],
    secondaryWhitelist: []
};
let configVersion = 0;  // 版本号，用于检测更新
let isInitialized = false;


// 读取配置并缓存
async function loadConfigToCache() {
    return new Promise((resolve) => {
        chrome.storage.local.get([
            'scriptBlockerRules',
            'globalWhitelist',
            'secondaryWhitelist'
        ], function(result) {
            if (chrome.runtime.lastError) {
                console.error('[Background] 读取storage失败:', chrome.runtime.lastError);
                resolve(false);
                return;
            }
            
            const newConfig = {
                rules: result.scriptBlockerRules || [],
                globalWhitelist: result.globalWhitelist || [],
                secondaryWhitelist: result.secondaryWhitelist || []
            };
            
            // 检查是否有变化
            const hasChanged = JSON.stringify(cachedConfig) !== JSON.stringify(newConfig);
            if (hasChanged) {
                cachedConfig = newConfig;
                configVersion++;
                console.log('[Background] 配置已更新，版本:', configVersion, '规则数:', cachedConfig.rules.length);
            }
            
            resolve(true);
        });
    });
}

// 启动时立即加载配置
(async function init() {
    console.log('[Background] 启动，开始加载配置...', performance.now());
    await loadConfigToCache();
    isInitialized = true;
    console.log('[Background] 配置加载完成，耗时:', performance.now(), '规则数:', cachedConfig.rules.length);
})();

// 定期检查更新（每30秒检查一次）
setInterval(async () => {
    await loadConfigToCache();
}, 30000);

// 监听 storage 变化（实时更新）
chrome.storage.onChanged.addListener(async function(changes, namespace) {
    if (namespace === 'local') {
        console.log('[Background] 检测到配置变化，重新加载');
        await loadConfigToCache();
        
        // 通知所有 content script 配置已更新
        chrome.tabs.query({}, function(tabs) {
            const updateMessage = {
                type: 'CONFIG_UPDATED',
                config: cachedConfig,
                version: configVersion
            };
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, updateMessage).catch(() => {});
            });
        });
    }
});

// 获取配置的接口 - 直接返回缓存，不再每次都读 storage
function getConfig() {
    return cachedConfig;
}

function getCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');

    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}
// 监听消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === 'GET_CONFIG') {
        // 直接返回缓存的配置，速度飞快
        sendResponse(getConfig());
        return true;
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

console.log('[Background] 已就绪');