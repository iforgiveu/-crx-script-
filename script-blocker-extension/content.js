// content.js - 在 ISOLATED world 运行，负责注入真正的拦截代码
console.log('[Content] 已启动于',window.location.href,performance.now());

const metaTemplate = {
    rules: Object.assign(document.createElement('meta'), { name: 'script-blocker-rules' }),
    global: Object.assign(document.createElement('meta'), { name: 'script-blocker-global' }),
    secondary: Object.assign(document.createElement('meta'), { name: 'script-blocker-secondary' })
};
// 注入配置和脚本
function injectConfig(rules, globalWhitelist, secondaryWhitelist) {
    // 优先使用 head，如果没有才用 html
	const head = document.head;
    //const container = head || document.documentElement;
	
	Promise.resolve().then(() => {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inject.js');
    script.onload = () => script.remove();
    head.appendChild(script);
});
	// 克隆预创建的 meta 标签（比创建新元素快）
    const rulesMeta = metaTemplate.rules.cloneNode(false);
    const globalMeta = metaTemplate.global.cloneNode(false);
    const secondaryMeta = metaTemplate.secondary.cloneNode(false);
    
    // 设置内容
    rulesMeta.content = JSON.stringify(rules);
    globalMeta.content = JSON.stringify(globalWhitelist);
    secondaryMeta.content = JSON.stringify(secondaryWhitelist);
    
    // 批量插入
    if (head.firstChild) {
        head.prepend(rulesMeta, globalMeta, secondaryMeta);
		console.log('[Content] 添加Metas',performance.now());
    } else {
        head.append(rulesMeta, globalMeta, secondaryMeta);
    }
    
	  
}

// 获取配置，带重试机制
function getConfigWithRetry(retries = 5, 
    normalInterval = 50,    // 重试间隔1
    errorInterval = 200      // 重试间隔2
	) {
    chrome.runtime.sendMessage({ type: 'GET_CONFIG' }, function(response) {
        // 检查是否有运行时错误
        if (chrome.runtime.lastError) {
            console.error('[Content] 发送消息失败:', chrome.runtime.lastError);
            if (retries > 0) {
                console.log(`[Content] 剩余重试次数: ${retries}，${normalInterval}ms后重试`);
                setTimeout(() => getConfigWithRetry(retries - 1), normalInterval);
                return;
            }
            console.log('[Content] 重试耗尽，使用空配置');
            injectConfig([], [], []);
            return;
        }
        
        // 检查响应是否有效
        if (response && response.rules !== undefined) {
            console.log('[Content] 于第',retries,'次尝试收到有效配置:\n', response);
            injectConfig(
                response.rules || [],
                response.globalWhitelist || [],
                response.secondaryWhitelist || []
            );
        } else if (retries > 0) {
            console.log(`[Content] 配置无效，剩余重试次数: ${retries}，${normalInterval}ms后重试`);
            setTimeout(() => getConfigWithRetry(retries - 1), normalInterval);
        } else {
            console.log('[Content] 获取配置失败，使用空配置');
            injectConfig([], [], []);
        }
    });
}

// 开始获取配置
getConfigWithRetry(1);

// 监听配置更新
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === 'UPDATE_CONFIG') {
        console.log('[Content] 配置更新:', request);
        
        // 更新规则 meta
        const rulesMeta = document.querySelector('meta[name="script-blocker-rules"]');
        if (rulesMeta) {
            rulesMeta.content = JSON.stringify(request.rules || []);
        } else {
            const newMeta = document.createElement('meta');
            newMeta.name = 'script-blocker-rules';
            newMeta.content = JSON.stringify(request.rules || []);
            document.documentElement.appendChild(newMeta);
        }
        
        // 更新全局白名单 meta
        const globalMeta = document.querySelector('meta[name="script-blocker-global"]');
        if (globalMeta) {
            globalMeta.content = JSON.stringify(request.globalWhitelist || []);
        } else {
            const newMeta = document.createElement('meta');
            newMeta.name = 'script-blocker-global';
            newMeta.content = JSON.stringify(request.globalWhitelist || []);
            document.documentElement.appendChild(newMeta);
        }
        
        // 更新次级白名单 meta
        const secondaryMeta = document.querySelector('meta[name="script-blocker-secondary"]');
        if (secondaryMeta) {
            secondaryMeta.content = JSON.stringify(request.secondaryWhitelist || []);
        } else {
            const newMeta = document.createElement('meta');
            newMeta.name = 'script-blocker-secondary';
            newMeta.content = JSON.stringify(request.secondaryWhitelist || []);
            document.documentElement.appendChild(newMeta);
        }
    }
});