// background.js
let rules = [];

// 初始化加载规则
chrome.storage.local.get(['scriptBlockerRules'], function(result) {
    if (result.scriptBlockerRules) {
        rules = result.scriptBlockerRules;
        console.log('[Background] 已加载规则:', rules);
    }
});

// 监听规则更新
chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'local' && changes.scriptBlockerRules) {
        rules = changes.scriptBlockerRules.newValue || [];
        console.log('[Background] 规则已更新:', rules);
        
        // 通知所有标签页
        chrome.tabs.query({}, function(tabs) {
            tabs.forEach(function(tab) {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'UPDATE_RULES',
                    rules: rules
                }).catch(() => {});
            });
        });
    }
});

// 监听消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === 'GET_RULES') {
        sendResponse({ rules: rules });
    } else if (request.type === 'SAVE_RULES') {
        rules = request.rules;
        chrome.storage.local.set({ scriptBlockerRules: rules }, function() {
            sendResponse({ success: true });
        });
        return true;
    }
});

// 新标签页创建时
chrome.tabs.onCreated.addListener(function(tab) {
    setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, {
            type: 'UPDATE_RULES',
            rules: rules
        }).catch(() => {});
    }, 500);
});

// 标签页更新时
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'loading') {
        setTimeout(() => {
            chrome.tabs.sendMessage(tabId, {
                type: 'UPDATE_RULES',
                rules: rules
            }).catch(() => {});
        }, 500);
    }
});