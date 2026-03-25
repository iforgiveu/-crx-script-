// -*- coding: utf-8 -*-
// inject.js - 脚本拦截器核心
(function () {
    'use strict';
    console.log('[脚本拦截器] 🚀 已注入到页面', performance.now());
	//let code = EventTarget.prototype.addEventListener.toString();
	//console.log(code.substring(0, 900));
    // ==================优先执行：保护F12可用====================
    (function () {
		const antiF12Keywords = [
            'keyCode==123',
            'e.keyCode==123',
            'e.key==="F12"',
            'Key==123',
            '.keyCode==123',
            'disableDevTools',
            'debugger',
			'touch"!==t.pointerType',
			'touch"!==e.pointerType',
			'||e.event).keyCode',
			'.event).keyCode||',
			'(e.ctrlKey) && (e.keyCode',
			'非法调试',
            'setInterval(function(){(debug',
            'setInterval(function() {(debug'
        ];
	(()=>{//视口变化检测伪装，原生函数伪装
	Object.defineProperty(window, 'outerWidth', {
        get: function() { return window.innerWidth; },
        configurable: false
    });
    Object.defineProperty(window, 'outerHeight', {
        get: function() { return window.innerHeight; },
        configurable: false
    });
	/* const originalConstructor=Function.prototype.constructor;Object.defineProperty(Function.prototype,'constructor',{value:function(){if(arguments[0]==='debugger'){return function(){};}return originalConstructor.apply(this,arguments);},writable:true,configurable:true}); */
	const originalFunctionConstructor=Function.prototype.constructor;Function.prototype.constructor=function(){if(arguments.length===0){return originalFunctionConstructor.apply(this,arguments);}const args=Array.from(arguments);const lastArg=args[args.length-1];if(typeof lastArg==='string'){if(/\bdebugger\b/.test(lastArg)){args[args.length-1]=lastArg.replace(/\bdebugger\b/g,';');
	//console.log('[脚本拦截器] 🔪 已移除 debugger 语句部分');
	}}return originalFunctionConstructor.apply(this,args);};
	
	Object.defineProperty(Function.prototype.constructor,'toString',{value:function(){return'function Function() { [native code] }';}});
	Object.defineProperty(window,'Firebug',{value:{chrome:{isInitialized:false}},writable:false,configurable:false});
	Object.defineProperty(window.history,'go',{value:function(){},writable:false,configurable:false});
	Object.defineProperty(window.history,'back',{value:function(){},writable:false,configurable:false});
	Object.defineProperty(window,'close',{value:function(){},writable:false,configurable:false});
	//Object.defineProperty(Date.prototype,'getTime',{value:function(){return 0;},writable:false,configurable:false});
	})()

        // 1. 立即禁用现有的监听器
        document.onkeydown = null;
        document.oncontextmenu = null;
        window.onkeydown = null;
        window.oncontextmenu = null;
		//window.endebug = function() {};
        //window.setInterval = null
        for (let i = 1; i < 100; i++) {
            clearInterval(i); // 直接清除
        }

        // 2. 阻止未来的事件监听器添加
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function (type, listener, options) {
            // 阻止keydown和contextmenu事件
            if (type === 'keydown' || type === 'contextmenu' || type === 'keyup') {
                const listenerStr = listener.toString();
                //console.log(`[脚本拦截器] 🔒 排查: ${type} ${listenerStr}`);
				for (const kw of antiF12Keywords) {
                    if (listenerStr.includes(kw)) {
                        console.log(`[脚本拦截器] 🔪 阻止反F12事件:【 ${type}:	${kw}】\n${listenerStr}`);
                        return; // 不添加这个监听器
                    }
                }
            }
            return originalAddEventListener.call(this, type, listener, options);
        };

        // 3. 阻止直接赋值
        Object.defineProperty(document, 'onkeydown', {
            set: function (value) {
                if (value) {
                    const fnStr = value.toString();
                    for (const kw of antiF12Keywords) {
                        if (fnStr.includes(kw)) {
                            console.log('[脚本拦截器] 🔒 阻止 document.onkeydown', kw, '\n', fnStr);
                            return;
                        }
                    }
                }
                this._onkeydown = value;
            },
            get: function () {
                return this._onkeydown || null;
            },
			configurable: false
        });

        Object.defineProperty(document, 'oncontextmenu', {
            set: function (value) {
                if (value) {
                    const fnStr = value.toString();
                    for (const kw of antiF12Keywords) {
                        if (fnStr.includes(kw)) {
                            console.log('[脚本拦截器] 🔒 阻止 document.oncontextmenu');
                            return;
                        }
                    }
                }
                this._oncontextmenu = value;
            },
            get: function () {
                return this._oncontextmenu || null;
            },
			configurable: false
        });

        // 保存原始的 clearInterval
        const originalClearInterval = window.clearInterval;

    })();

    // ==================== 正常的规则获取和初始化 ====================
function waitForConfig(timeout=100){return new Promise((resolve,reject)=>{const selector='html > meta[name="script-blocker-status"]';const existing=document.querySelector(selector);if(existing){const status=existing.content;if(status==='ready'){resolve({status:'ready',meta:existing});return;}else if(status==='error'){reject({status:'error',message:'配置为空'});return;}}
let timeoutId=setTimeout(()=>{observer.disconnect();reject({status:'timeout',message:'等待配置超时'});},timeout);const observer=new MutationObserver((mutations)=>{for(const mutation of mutations){for(const node of mutation.addedNodes){if(node.nodeName==='META'&&node.getAttribute('name')==='script-blocker-status'){const status=node.content;if(status==='ready'){observer.disconnect();clearTimeout(timeoutId);resolve({status:'ready',meta:node});return;}else if(status==='error'){observer.disconnect();clearTimeout(timeoutId);reject({status:'error',message:'配置为空'});return;}else{observer.disconnect();clearTimeout(timeoutId);reject({status:'unknown',message:`未知状态: ${status}`});return;}}}}});observer.observe(document.documentElement,{childList:true,subtree:false,attributes:true,attributeFilter:['content']});});}
    // 从 meta 标签获取规则和白名单
    (async function() {
	let quit
	const startTime=performance.now();await waitForConfig(500).then(({status,meta})=>{quit=0
	console.log('[脚本拦截器] ✅ 配置已就绪，等待耗时:',performance.now()-startTime,'ms  ',performance.now());}).catch(({status,message})=>{if(status==='error'){console.warn('[脚本拦截器] ❌ 配置为空:',message);}else if(status==='timeout'){console.warn('[脚本拦截器] ⏰ 等待配置超时:',message);}else{console.warn('[脚本拦截器] ⚠️ 未知状态:',message);}
	quit=1});if(quit)return;
	function getConfigFromMeta() {
        // 获取规则（原有代码）
        const rulesMeta = document.querySelector('meta[name="script-blocker-rules"]');
        let rules = [];
        if (rulesMeta) {
            try {
                rules = JSON.parse(rulesMeta.getAttribute('content') || '[]');
            } catch (e) {}
        }
        // 获取全局白名单
        const globalMeta = document.querySelector('meta[name="script-blocker-global"]');
        let globalWhitelist = [];
        if (globalMeta) {
            try {
                globalWhitelist = JSON.parse(globalMeta.getAttribute('content') || '[]');
            } catch (e) {}
        }
        // 获取次级白名单
        const secondaryMeta = document.querySelector('meta[name="script-blocker-secondary"]');
        let secondaryWhitelist = [];
        if (secondaryMeta) {
            try {
                secondaryWhitelist = JSON.parse(secondaryMeta.getAttribute('content') || '[]');
            } catch (e) {}
        }
        return {
            rules,
            globalWhitelist,
            secondaryWhitelist
        };
    }

    // 使用
    const config = getConfigFromMeta();
    const rules = config.rules;
    const globalWhitelist0 = config.globalWhitelist;
    const secondaryWhitelist0 = config.secondaryWhitelist;

    // 通配符匹配函数
    function wildcardMatch(text, pattern) {
        const regexPattern = pattern
            .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*');
        const regex = new RegExp(`^${regexPattern}$`, 'i');
        const partialRegex = new RegExp(regexPattern, 'i');
        return regex.test(text) || partialRegex.test(text);
    }

    // 检查当前网站是否匹配规则
    const currentUrl = window.location.href;
    const currentHost = window.location.hostname;

    const extrasecwhitelist = ['bilibili', 'deepseek.com', 'douyin']//额外指定的白名单
    const extraglowhitelist = ['index.m3u8']//额外指定的白名单
    // 合并去重
    const globalWhitelist = [...new Set([...extraglowhitelist, ...globalWhitelist0])];
    const secondaryWhitelist = [...new Set([...extrasecwhitelist, ...secondaryWhitelist0])];

    console.log('[脚本拦截器] 🌐 当前网站:', currentHost);
    console.log('[脚本拦截器] 📍 完整地址:', currentUrl);
    console.log('[脚本拦截器] 📋 加载的规则数:', rules.length);

    // 全局白名单检查
    const inGlobalWhitelist = globalWhitelist.some(pattern =>
            wildcardMatch(currentHost, pattern) || wildcardMatch(currentUrl, pattern));
    if (inGlobalWhitelist) {
        console.log('🙄\n一级白名单网站:', currentUrl, ",退出拦截");
        return;
    }
    // 次级白名单检查
    const inSecondaryWhitelist = secondaryWhitelist.some(pattern =>
            wildcardMatch(currentHost, pattern) || wildcardMatch(currentUrl, pattern));
    if (inSecondaryWhitelist) {
        console.log('🙄\n次级白名单网站:', currentUrl, ",仅部分拦截");
    }

    let keywordsToBlock = [];

    // 检查网站是否匹配单个规则
    function matchSite(rule) {
        const matchType = rule.matchType || 'simple';
        const sitePatterns = rule.sitePatterns || [];

        for (const pattern of sitePatterns) { //每个匹配的网址
            if (!pattern)
                continue;

            if (matchType === 'simple') {
                if (wildcardMatch(currentUrl, pattern) || wildcardMatch(currentHost, pattern)) {
                    console.log(`[脚本拦截器] ✅ 通配符匹配: "${pattern}"`);
                    return true;
                }
            } else if (matchType === 'contains') {
                if (currentUrl.includes(pattern) || currentHost.includes(pattern)) {
                    console.log(`[脚本拦截器] ✅ 包含匹配: "${pattern}"`);
                    return true;
                }
            } else if (matchType === 'regex') {
                try {
                    const regex = new RegExp(pattern, 'i');
                    if (regex.test(currentUrl) || regex.test(currentHost)) {
                        console.log(`[脚本拦截器] ✅ 正则匹配: "${pattern}"`);
                        return true;
                    }
                } catch (e) {}
            }
        }
        return false;
    }

    // 合并所有匹配规则的关键词
    let matchedRules = [];
    for (const rule of rules) {
        if (!rule.enabled)
            continue;
        if (matchSite(rule)) {
            matchedRules.push(rule);
        }
    }

    if (matchedRules.length > 0) {
        const allKeywords = [];
        matchedRules.forEach(rule => {
            console.log(`[脚本拦截器] 📋 匹配规则: ${rule.name || '未命名规则'}`);
            if (rule.keywords && rule.keywords.length > 0) {
                allKeywords.push(...rule.keywords);
            }
        });
        keywordsToBlock = [...new Set(allKeywords)];
        console.log('[脚本拦截器] 🔑 合并后的拦截关键词:', keywordsToBlock.join('、'));
    } else {
        console.log('[脚本拦截器] ⏭️ 当前网站无匹配规则，退出');
        return;
    }
    // 保存原始方法
    const originalSetTimeout = window.setTimeout;
    const originalSetInterval = window.setInterval;
    const originalEval = window.eval;
    const originalFunction = window.Function;
    const originalCreateElement = document.createElement;
    const originalAppendChild = Node.prototype.appendChild;
    const originalInsertBefore = Node.prototype.insertBefore;
    const originalReplaceChild = Node.prototype.replaceChild;
    const originalWrite = document.write;
    const originalWriteln = document.writeln;


    // ==================== 工具函数 ====================
    const processedNodes = new WeakSet();
    const blockedScripts = new Set();
    function getSafeSrc(node) {
        return node.src && typeof node.src === 'string' ? node.src : '';
    }

    function truncateContent(content, maxLength = 666) { //截断
        if (!content)
            return '';
        if (content.length <= maxLength)
            return content;
        return content.substring(0, maxLength) + '...';
    }

    // 获取元素的DOM路径
    function getElementPath(element) {
        if (!element)
            return 'none';
        const path = [];
        let current = element;
        let level = 0;

        while (current && current.nodeType === 1 && level < 5) {
            let desc = current.nodeName.toLowerCase();
            if (current.id)
                desc += `#${current.id}`;
            if (current.className) {
                const classes = current.className.split(' ').slice(0, 3).join('.');
                if (classes)
                    desc += `.${classes}`;
            }
            if (current.src && current.src.length < 50) {
                const srcShort = current.src.split('/').pop();
                if (srcShort)
                    desc += `[src:${srcShort}]`;
            }
            path.unshift(desc);
            current = current.parentElement;
            level++;
        }
        return path.join(' > ');
    }

    // 获取调用栈
    function getCallStack() {
        try {
            throw new Error();
        } catch (e) {
            return e.stack.split('\n').slice(2).join('\n    ');
        }
    }

    // 详细日志函数
    function logBlock(interceptor, keyword, content, source = '', element = null) {
        const key = `${interceptor}:${keyword}:${Date.now()}:${Math.random()}`;
        if (blockedScripts.has(key))
            return;
        blockedScripts.add(key);
        console.group(`[脚本拦截器] 🚫 ${interceptor} 拦截:		${keyword}		`, performance.now());
        console.log(`   于: ${window.location.href}`);
        console.log(`   关键词: "${keyword}"`);
        console.log(`   来源类型: ${source || '未知'}`);

        if (element) {
            console.log(`   元素类型: ${element.nodeName}`);
            if (element.id)
                console.log(`   元素ID: ${element.id}`);
            if (element.className)
                console.log(`   元素类名: ${element.className}`);

            if (source.includes('内联事件')) {
                const match = source.match(/内联事件: (\w+)/);
                if (match)
                    console.log(`   事件名称: ${match[1]}`);
            }

            if (element.src)
                console.log(`   元素src: ${truncateContent(element.src, 100)}`);
            if (element.href)
                console.log(`   元素href: ${truncateContent(element.href, 100)}`);
            if (element.data)
                console.log(`   元素data: ${truncateContent(element.data, 200)}`);
            //if (element.data) console.log(`   元素data: ${element.data}`);

            console.log(`   DOM位置: ${getElementPath(element)}`);
        }

        const stack = getCallStack();
        if (stack)
            console.log(`   调用栈:\n    ${stack}`);
        //console.trace(`   调用栈:\n`);

        console.log(`   内容预览: ${truncateContent(content)}`);
        console.groupEnd();
    }

    // ==================== 完整的 checkNode 函数 ====================
    function checkNode(node) {
        if (!node || processedNodes.has(node))
            return null;

        // 1. textContent 和 src
        let content = node.textContent || '';
        let src = getSafeSrc(node);
        for (const kw of keywordsToBlock) {
            if (content.includes(kw)) {
                return {
                    kw,
                    content,
                    type: 'content',
                    source: '文本内容'
                };
            }
            if (src.includes(kw)) {
                return {
                    kw,
                    content: src,
                    type: 'src',
                    source: 'src属性'
                };
            }
        }

        // 2. 检查内联事件属性
        if (node.nodeType === 1) {
            const eventAttrs = [
                'onclick', 'ondblclick', 'onmousedown', 'onmouseup', 'onmouseover',
                'onmousemove', 'onmouseout', 'onmouseenter', 'onmouseleave',
                'onload', 'onunload', 'onerror', 'onresize', 'onscroll',
                'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset',
                'onselect', 'oninput', 'onkeydown', 'onkeypress', 'onkeyup',
                'oncontextmenu', 'onpaste', 'oncopy', 'oncut', 'ondrag',
                'ondrop', 'ontouchstart', 'ontouchmove', 'ontouchend',
                'onanimationstart', 'onanimationend', 'onanimationiteration',
                'ontransitionstart', 'ontransitionend', 'ontransitionrun',
                'onwheel', 'onauxclick', 'ongotpointercapture', 'onlostpointercapture',
                'onpointerdown', 'onpointermove', 'onpointerup', 'onpointercancel',
                'onpointerover', 'onpointerout', 'onpointerenter', 'onpointerleave'
            ];

            for (const attr of eventAttrs) {
                const attrValue = node.getAttribute(attr);
                if (attrValue && typeof attrValue === 'string') {
                    for (const kw of keywordsToBlock) {
                        if (attrValue.includes(kw)) {
                            return {
                                kw,
                                content: attrValue,
                                type: 'event',
                                source: `内联事件: ${attr}`,
                                attr: attr
                            };
                        }
                    }
                }
            }
        }

        // 3. 检查 data: 和 javascript: 伪协议
        if (node.nodeType === 1) {
            if (node.href && typeof node.href === 'string' && node.href.startsWith('javascript:')) {
                const jsCode = node.href.substring(11);
                for (const kw of keywordsToBlock) {
                    if (jsCode.includes(kw)) {
                        return {
                            kw,
                            content: jsCode,
                            type: 'pseudo',
                            source: 'javascript:伪协议'
                        };
                    }
                }
            }

            if (node.src && typeof node.src === 'string' && node.src.startsWith('javascript:')) {
                const jsCode = node.src.substring(11);
                for (const kw of keywordsToBlock) {
                    if (jsCode.includes(kw)) {
                        return {
                            kw,
                            content: jsCode,
                            type: 'pseudo',
                            source: 'iframe javascript:伪协议'
                        };
                    }
                }
            }

            if (node.src && typeof node.src === 'string' && node.src.startsWith('data:text/javascript')) {
                const jsCode = decodeURIComponent(node.src.split(',')[1] || '');
                for (const kw of keywordsToBlock) {
                    if (jsCode.includes(kw)) {
                        return {
                            kw,
                            content: jsCode,
                            type: 'data',
                            source: 'data:javascript协议'
                        };
                    }
                }
            }
        }

        // 4. 检查 <object> 和 <embed> 标签
        if (node.nodeName === 'OBJECT' || node.nodeName === 'EMBED') {

            const data = node.data || getSafeSrc(node) || '';
            if (data.match(/\.js$/i)) {
                for (const kw of keywordsToBlock) {
                    if (data.includes(kw)) {
                        return {
                            kw,
                            content: data,
                            type: 'plugin',
                            source: `${node.nodeName} 插件`
                        };
                    }
                }
            }
        }

        // 5. 检查 <meta> 刷新/重定向
        if (node.nodeName === 'META') {
            const httpEquiv = node.getAttribute('http-equiv');
            const metaContent = node.getAttribute('content');
            if (httpEquiv && httpEquiv.toLowerCase() === 'refresh' && metaContent) {
                if (metaContent.includes('javascript:')) {
                    for (const kw of keywordsToBlock) {
                        if (metaContent.includes(kw)) {
                            return {
                                kw,
                                content: metaContent,
                                type: 'meta',
                                source: 'meta refresh'
                            };
                        }
                    }
                }
            }
        }

        // 6. 检查 <base> 标签
        if (node.nodeName === 'BASE') {
            const href = node.href || '';
            for (const kw of keywordsToBlock) {
                if (href.includes(kw)) {
                    return {
                        kw,
                        content: href,
                        type: 'base',
                        source: 'base href'
                    };
                }
            }
        }

        return null;
    }
    // ==================== 1. createElement ====================
	(function(){
	//return//废弃
	if(inSecondaryWhitelist)return;
	console.log('[脚本拦截器] 🍧 部署 createElement 拦截器');document.createElement=function(tagName){
	//if(tagName&&tagName.toLowerCase()==='script'){console.log('%c[createElement] 监测到创建 script 标签','color: #9932CC; font-weight: bold;');}
	const element=originalCreateElement.call(document,tagName);if(tagName.toLowerCase()==='script'){Object.defineProperty(element,'src',{set:function(value){
	//console.log('%c[createElement] 正在赋值 src:','color: #9932CC; font-weight: bold;',value);
	for(const kw of keywordsToBlock){if(value&&value.includes(kw)){logBlock('createElement',kw,value,'createElement(Src拦截)');return;}}
	element.setAttribute('src',value);},get:function(){return element.getAttribute('src');},configurable:true});let currentText='';Object.defineProperty(element,'text',{set:function(code){
	//console.log('%c[createElement] 正在赋值 text:','color: #9932CC; font-weight: bold;',code);
	for(const kw of keywordsToBlock){if(code&&code.includes(kw)){logBlock('createElement',kw,code,'createElement(Text拦截)');return;}}
	currentText=code;element.textContent=code;},get:function(){return currentText;},configurable:true});}
return element;};})();



    // ==================== 2. MutationObserver ====================
/*     (()=>{
	return; */
	console.log('[脚本拦截器] 👁️ 部署 MutationObserver 拦截器');
	const observer = new MutationObserver(function (mutations) {

        mutations.forEach(function (mutation) {
            mutation.addedNodes.forEach(function (node) {
                if (processedNodes.has(node))
                    return;
                const named = node.nodeName;
                if (named === "BODY" || named === "HEAD" || named === "HTML")
                    return;

                const result = checkNode(node);
                if (result) {
                    let sourceDesc = '';
                    if (result.type === 'event') {
                        sourceDesc = `内联事件: ${result.attr}`;
                    } else if (result.type === 'pseudo') {
                        sourceDesc = result.source;
                    } else if (result.type === 'data') {
                        sourceDesc = result.source;
                    } else if (result.type === 'plugin') {
                        sourceDesc = result.source;
                    } else if (result.type === 'meta') {
                        sourceDesc = result.source;
                    } else if (result.type === 'base') {
                        sourceDesc = result.source;
                    } else {
                        sourceDesc = result.type === 'src' ? '外部脚本节点' : '内联脚本节点';
                    }
					node.remove();
                    processedNodes.add(node);
					logBlock('MutationObserver', result.kw, result.content, sourceDesc, node);
                    return;
                }

                if (node.nodeName === 'SCRIPT') {
                    let src = getSafeSrc(node)
                        let text = node.textContent || '';
                    for (const kw of keywordsToBlock) {
                        if (src.includes(kw)) {
							node.remove();
                            processedNodes.add(node);
							logBlock('MutationObserver', kw, src, '外部脚本标签', node);
                            break;
                        }
                        if (text.includes(kw)) {
                            node.remove();
                            processedNodes.add(node);
							logBlock('MutationObserver', kw, text, '内联脚本标签', node);
                            break;
                        }
                    }
                }

                processedNodes.add(node);
            });
        });
    });
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    }); //})();

    // ==================== 3. appendChild ====================

	console.log('[脚本拦截器] 📦 部署 appendChild 拦截器');
    Node.prototype.appendChild = function (node) {
        // 1. 先检查 node 是否为空
        if (!node)
            return originalAppendChild.call(this, node);
        // 2. 检查 node 是否是真正的节点对象
        if (typeof node !== 'object' || !node.nodeName) {
            // 如果不是节点，直接调用原生方法
            return originalAppendChild.call(this, node);
        }
        // 3. 检查是否已处理
        if (processedNodes.has(node))
            return originalAppendChild.call(this, node);
        // 4. 安全检查后再调用 checkNode
        const result = checkNode(node);
        if (result) {
            logBlock('appendChild', result.kw, result.content,
                result.type === 'src' ? 'appendChild添加的外部脚本' : 'appendChild添加的内联脚本', node);
            processedNodes.add(node);
            return document.createComment(`blocked by script blocker: ${result.kw}`);
        }
        //console.log('少时诵诗书',node);
        return originalAppendChild.call(this, node);
    }; 

    // ==================== 4. insertBefore ====================
	console.log('[脚本拦截器] 🥨 部署 insertBefore 拦截器');
	Node.prototype.insertBefore = function (newNode, referenceNode) {
        if (!newNode)
            return originalInsertBefore.call(this, newNode, referenceNode);
        if (typeof newNode !== 'object' || !newNode.nodeName) {
            return originalInsertBefore.call(this, newNode, referenceNode);
        }
        if (processedNodes.has(newNode))
            return originalInsertBefore.call(this, newNode, referenceNode);

        const result = checkNode(newNode);
        if (result) {
            logBlock('insertBefore', result.kw, result.content,
                result.type === 'src' ? 'insertBefore添加的外部脚本' : 'insertBefore添加的内联脚本', newNode);
            processedNodes.add(newNode);
            //return newNode;
            // ✅ 返回一个注释节点，位置和 referenceNode 相同
            let comment = document.createComment(`blocked by script blocker: ${result.kw}`);
            return originalInsertBefore.call(this, comment, referenceNode);

        }
        return originalInsertBefore.call(this, newNode, referenceNode);
    };

    // ==================== 5. replaceChild ====================
	console.log('[脚本拦截器] 🧀 部署 replaceChild 拦截器');
	Node.prototype.replaceChild = function (newChild, oldChild) {
        if (!newChild)
            return originalReplaceChild.call(this, newChild, oldChild);
        if (typeof newChild !== 'object' || !newChild.nodeName) {
            return originalReplaceChild.call(this, newChild, oldChild);
        }
        if (processedNodes.has(newChild))
            return originalReplaceChild.call(this, newChild, oldChild);

        const result = checkNode(newChild);
        if (result) {
            logBlock('replaceChild', result.kw, result.content,
                result.type === 'src' ? 'replaceChild添加的外部脚本' : 'replaceChild添加的内联脚本', newChild);
            processedNodes.add(newChild);
            // ✅ 用注释节点替换，返回 oldChild 符合预期
            let comment = document.createComment(`blocked by script blocker: ${result.kw}`);
            return originalReplaceChild.call(this, comment, oldChild);
        }
        return originalReplaceChild.call(this, newChild, oldChild);
    }; 

    // ==================== 6. document.write ====================
    console.log('[脚本拦截器] ✍️ 部署 document.write 拦截器');
    document.write = function (str) {
        if (typeof str === 'string') {
            for (const kw of keywordsToBlock) {
                if (str.includes(kw) && str.includes('<script')) {
                    logBlock('document.write', kw, str, 'document.write写入');
                    return;
                }
            }
        }
        originalWrite.call(document, str);
    };

    document.writeln = function (str) {
        console.trace('writeln检查：', str);
        if (typeof str === 'string') {
            for (const kw of keywordsToBlock) {
                if (str.includes(kw) && str.includes('<script')) {
                    logBlock('document.writeln', kw, str, 'document.writeln写入');
                    return;
                }
            }
        }
        originalWriteln.call(document, str);
    };

// 工具函数：解析十六进制和Unicode转义
function decodeString(str) {
    try {
        // 处理 \x4d 这类十六进制转义，还原成明文
        return str.replace(/\\x([0-9a-fA-F]{2})|\\u([0-9a-fA-F]{4})/g, (match, hex, unicode) => {
            return String.fromCharCode(parseInt(hex || unicode, 16));
        });
    } catch (e) {
        return str;
    }
}
	// ==================== 7. eval ====================
    (()=>{
	let evalwhitelist=["map.baidu.com"]
	if (evalwhitelist.some(host => currentHost === host))return;
	let evaldeblacklist=["window",'Window','self.window','window ',' window'];
	console.log('[脚本拦截器] 🧠 部署 eval 拦截器');
    window.eval = function (code) {
        //console.trace('[脚本拦截器] 🧠eval类型',typeof code,'\n',code);
        if (typeof code === 'string') {
            let coded = decodeString(code)
			if (evaldeblacklist.some(host => coded === host)){//完整匹配到任意一个则拦截
				logBlock('eval', coded, code, 'eval执行(字符串)');
                    return;}
			for (const kw of keywordsToBlock) {
                if (coded.includes(kw)) {
                    logBlock('eval', kw, code, 'eval执行(字符串)');
                    return;
                }
            }
        }
        if (typeof code === 'function') {
            const funcStr = code.toString();
			//console.log('[eval]',funcStr);
			for (const kw of keywordsToBlock) {
                if (funcStr.includes(kw)) {
                    logBlock('eval', kw, funcStr, 'eval执行(函数)');
                    return;
                }
            }
        }
        return originalEval.call(this, code);
    };

    Object.defineProperty(window, 'eval', { 
        value: window.eval,
        writable: false, // 禁止修改
        configurable: false // 禁止重新配置
    });})();

    // ==================== 8. Function ====================
	(function () {
		if (inSecondaryWhitelist)return; 
		console.log('[脚本拦截器] 💦 部署 Function 拦截器');
		const proxyFunction = function (...args) {
			const code = args[args.length - 1] || '';
				if (typeof code === 'string') {
					for (const kw of keywordsToBlock) {
						if (code.includes(kw)) {
							logBlock('Function', kw, code, 'new Function构造函数');
							return function () {};}}}
			// 放行
			//console.log('[脚本拦截器] 💦 Function 拦截：无害：',args);
			return originalFunction.apply(this, args);};
		// 修复身份认证
		proxyFunction.prototype = originalFunction.prototype;
		Object.defineProperty(proxyFunction, Symbol.hasInstance, {
			value: function (instance) {
				return instance instanceof originalFunction;
			},
			configurable: true
		});
		//window.Function = proxyFunction;
		// 锁定：
		Object.defineProperty(window, 'Function', {
			value: proxyFunction,
			writable: false,      // 禁止修改
			configurable: false,  // 禁止删除和重新配置！
		});
	})();
	

    // ==================== 9. setTimeout ====================
    (()=>{
	console.log('[脚本拦截器] 🍛 部署 setTimeout 拦截器');
    window.setTimeout = function (handler, timeout, ...args) {
        if (typeof handler === 'string') {
            for (const kw of keywordsToBlock) {
                if (handler.includes(kw)) {
                    logBlock('setTimeout', kw, handler, '字符串形式setTimeout');
                    return 0;
                }
            }
        }

        if (typeof handler === 'function') {
			const handlerStr = handler.toString();
			//console.trace(handlerStr,timeout)
/* 			if (timeout>=10000){
			logBlock('setTimeout', timeout, handlerStr, '等待时间过长');
                    return 0;} */
			
            let defaultbl=['detectLoop()','404','devtool','502','location.href="about:blank"',"location.href='about:blank'",
			'baidu.com','{return t.apply(this,s)}catch(e){throw e','!e||e&&!1!==e.deep','setInterval(function()','setInterval(()=>']
			let whitel=['devtools&&','.emit("init",']
			let isnormal = (whitel.every(kw=>handlerStr.includes(kw))); 
			//console.log('[setTimeout]:',handlerStr,timeout);
			const keywordsToBlocks = [...new Set([...defaultbl, ...keywordsToBlock])];
			for (let kw of keywordsToBlocks) {
                if (isnormal)break;
				if (handlerStr.includes(kw)) {
                    logBlock('setTimeout', kw, handlerStr, '函数形式setTimeout');
                    return 0;
                }
            }
        }

        return originalSetTimeout.call(this, handler, timeout, ...args);
    }; })();

    // ==================== 10. setInterval====================
    (() => {
        console.log('[脚本拦截器] ⏱️ 部署 setInterval 拦截器', performance.now());
        // 存储定时器状态：{ hits: 慢执行次数, lastTime: 上次执行时间 }
        
		const timerStates = new Map();
        // 配置参数
        const SLOW_THRESHOLD = 100;      // 超过多少毫秒算“慢执行”
        const MAX_SLOW_HITS = 2;         // 连续多少次慢执行触发清理
        window.setInterval = function (handler, interval, ...args) {            
            // --- 第一阶段：静态特征扫描 --- 
            if (typeof handler === 'string') {
                for (const kw of keywordsToBlock) {
                    if (handler.includes(kw)) {
                        logBlock('setInterval', kw, handler, '字符串形式恶意代码');
                        return 0;
                    }
                }
            }
            if (typeof handler === 'function') {
                const handlerStr = handler.toString();
                let defaultbl = ['setTimeout(function(', 'setTimeout(()=>', 'debugger', 'devtool', 'clearLog', 'console.clear', 'if (!(e.isSuspend||'];
				
				//对部分网站放行部分关键词
				let timeoutwhitelist=["map.baidu.com"]
				if (timeoutwhitelist.some(host => currentHost === host)){
				let toRemove=['setTimeout(function(', 'setTimeout(()=>'];//移除setTimeout关键词的检测
				defaultbl = defaultbl.filter(item => !toRemove.includes(item));};
				
				// 合并默认黑名单与用户自定义黑名单
                const keywordsToBlocks = [...new Set([...defaultbl, ...keywordsToBlock])];
				//console.log('[setInterval]:',handlerStr,interval)};
                for (const kw of keywordsToBlocks) {
					if (handlerStr.includes(kw)) {
                        logBlock('setInterval', kw, handlerStr, '函数形式恶意代码');
                        return 0;
                    }
                }
            };
            // --- 第二阶段：动态性能监控包装 ---
            const wrappedHandler = function() {
                const startTime = performance.now();
                // 执行原始函数
                try {
                    if (typeof handler === 'function') {
                        handler.apply(this, arguments);
                    } else if (typeof handler === 'string') {
                        // 字符串形式的 handler 通常是 eval，较少见但也兼容
                        eval(handler);
                    }
                } catch (e) {
                    console.error('[脚本拦截器] 定时器执行出错:', e);
                }
                const duration = performance.now() - startTime;
                // 检查是否超时（模拟控制台警告）
                if (duration > SLOW_THRESHOLD) {
                    console.warn(`[智能拦截] ⚠️ 定时器耗时过长: ${duration.toFixed(2)}ms (阈值: ${SLOW_THRESHOLD}ms)`);
                    // 获取或初始化状态
                    if (!timerStates.has(timerId)) {
                        timerStates.set(timerId, { hits: 0 });
                    }
                    const state = timerStates.get(timerId);
                    
                    state.hits++; // 累计慢执行次数
                    console.log(`[智能拦截] 当前累计卡顿次数: ${state.hits}/${MAX_SLOW_HITS}`);

                    // 如果连续卡顿次数达标，执行清除
                    if (state.hits >= MAX_SLOW_HITS) {
                        console.log(`[智能拦截] 🔥 连续 ${state.hits} 次卡顿，强制清除定时器 ID: ${timerId}`);
                        clearInterval(timerId);
                        timerStates.delete(timerId);
                    }
                } else {
                    // 如果这次执行很快，重置计数器（避免偶尔卡顿导致的误杀）
                    if (timerStates.has(timerId)) {
                        timerStates.get(timerId).hits = 0;
                    }
                }
            };
            // 注册包装后的函数
            const timerId = originalSetInterval.call(this, wrappedHandler, interval, ...args);
            // 初始化状态记录
            timerStates.set(timerId, { hits: 0 });
            return timerId;
        }; for (let i = 1; i < 100; i++) {clearInterval(i);}
    })();
    // ==================== script标签清理 ====================
    console.log('[脚本拦截器] 🧹 部署script标签清理\n(只是清理标签，一般来说该项没法直接拦截标签内的js执行)');
    // 多次清理，确保捕获延迟加载的脚本
    const cleanTimes = [0, 200, 400];
    cleanTimes.forEach(timeout => {
        return;
        setTimeout(function () {
            document.querySelectorAll('script').forEach(function (script) {
                const content = script.textContent || '';
                const src = script.src || '';
                for (const kw of keywordsToBlock) {
                    if (content.includes(kw)) {
                        logBlock('script标签清理', kw, content, '已存在的内联脚本', script);
                        script.remove();
                        break;
                    }
                    if (src.includes(kw)) {
                        logBlock('script标签清理', kw, src, '已存在的外部脚本', script);
                        script.remove();
                        break;
                    }
                }
            });
            document.querySelectorAll('div[style*="display: none"]').forEach(function (div) {
                const content = div.textContent || '';
                for (const kw of keywordsToBlock) {
                    if (content.includes(kw)) {
                        logBlock('script标签清理', kw, content, '隐藏div', div);
                        div.remove();
                        break;
                    }
                }
            });
        }, timeout);
    });
	
    console.log('[脚本拦截器] ✅ 所有拦截器部署完成，共 ' + keywordsToBlock.length + ' 个关键词',performance.now());
})();
})();
