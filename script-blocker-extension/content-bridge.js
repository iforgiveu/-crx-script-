// content-bridge.js - 在扩展世界运行，负责与 MAIN world 通信
console.log('[Script Blocker Bridge] 已启动');

let rules = [];

// 从 background 获取规则
chrome.runtime.sendMessage({ type: 'GET_RULES' }, function(response) {
    if (response && response.rules) {
        rules = response.rules;
        console.log('[Bridge] 收到规则:', rules);
        sendRulesToMain();
    }
});

// 监听来自 background 的规则更新
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === 'UPDATE_RULES') {
        console.log('[Bridge] 规则已更新:', request.rules);
        rules = request.rules || [];
        sendRulesToMain();
    }
});

// 将规则发送到 MAIN world
function sendRulesToMain() {
    window.postMessage({
        type: 'SCRIPT_BLOCKER_RULES',
        rules: rules
    }, '*');
}

// 监听来自 MAIN world 的请求
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SCRIPT_BLOCKER_GET_RULES') {
        console.log('[Bridge] 收到规则请求');
        sendRulesToMain();
    }
});