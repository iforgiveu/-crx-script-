// -*- coding: utf-8 -*-
// inject.js - 脚本拦截器核心
(function() {
    'use strict';
    
    console.log('[脚本拦截器] 🚀 已注入到页面',performance.now());


    // ==================== 优先执行：F12保护====================
    (function() {
        // 立即执行的F12保护
		const antiF12Keywords = [
            'keyCode == 123',
			'e.keyCode == 123',
			'e.key === "F12"',
			'.keyCode==123',
			'disableDevTools',
			'setInterval(function() {(debugger',
			'setInterval(function(){(debugger',
			'setInterval(function(){(debug',
			'setInterval(function() {(debug'
        ];

        
        // 1. 立即禁用现有的监听器
        document.onkeydown = null;
        document.oncontextmenu = null;
        window.onkeydown = null;
        window.oncontextmenu = null;
		//window.setInterval = null
		for (let i = 1; i < 10; i++) {
    clearInterval(i);  // 直接清除，不管是谁的
}

        
        // 2. 阻止未来的事件监听器添加
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            // 阻止keydown和contextmenu事件
            if (type === 'keydown' || type === 'contextmenu' || type === 'keyup') {
                const listenerStr = listener.toString();
                for (const kw of antiF12Keywords) {
                    if (listenerStr.includes(kw)) {
                        console.log(`[脚本拦截器] 🔒 阻止反F12事件: ${type}`);
                        return; // 不添加这个监听器
                    }
                }
            }
            return originalAddEventListener.call(this, type, listener, options);
        };
        
        // 3. 阻止直接赋值
        Object.defineProperty(document, 'onkeydown', {
            set: function(value) {
                if (value) {
                    const fnStr = value.toString();
                    for (const kw of antiF12Keywords) {
                        if (fnStr.includes(kw)) {
                            console.log('[脚本拦截器] 🔒 阻止 document.onkeydown');
                            return;
                        }
                    }
                }
                this._onkeydown = value;
            },
            get: function() { return this._onkeydown; }
        });
        
        Object.defineProperty(document, 'oncontextmenu', {
            set: function(value) {
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
            get: function() { return this._oncontextmenu; }
        });
		
        
        // 保存原始的 clearInterval
        const originalClearInterval = window.clearInterval;

    })();


    // ==================== 正常的规则获取和初始化 ====================
    
    // 从 meta 标签获取规则和白名单
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
		return { rules, globalWhitelist, secondaryWhitelist };
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
	
	const extrasecwhitelist=['bilibili','deepseek.com','douyin']//额外指定的白名单
	const extraglowhitelist=['index.m3u8']//额外指定的白名单
	// 合并去重
	const globalWhitelist=[...new Set([...extraglowhitelist, ...globalWhitelist0])];
	const secondaryWhitelist = [...new Set([...extrasecwhitelist, ...secondaryWhitelist0])];
	
    
    console.log('[脚本拦截器] 🌐 当前网站:', currentHost);
    console.log('[脚本拦截器] 📍 完整地址:', currentUrl);
    console.log('[脚本拦截器] 📋 加载的规则数:', rules.length);
	
		// 全局白名单检查
	const inGlobalWhitelist = globalWhitelist.some(pattern => 
		wildcardMatch(currentHost, pattern) || wildcardMatch(currentUrl, pattern)
	);
	if(inGlobalWhitelist){
	console.log('🙄\n一级白名单网站:',currentUrl,",退出拦截");return;}
	// 次级白名单检查  
	const inSecondaryWhitelist = secondaryWhitelist.some(pattern => 
		wildcardMatch(currentHost, pattern) || wildcardMatch(currentUrl, pattern)
	);
	if(inSecondaryWhitelist){
	console.log('🙄\n次级白名单网站:',currentUrl,",仅部分拦截");}

	let keywordsToBlock = [];
    
    

    // 检查网站是否匹配单个规则
    function matchSite(rule) {
        const matchType = rule.matchType || 'simple';
        const sitePatterns = rule.sitePatterns || [];
        
        for (const pattern of sitePatterns) {//每个匹配的网址
            if (!pattern) continue;
            
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
        if (!rule.enabled) continue;
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
    const originalWorker = window.Worker;
    const originalSharedWorker = window.SharedWorker;
    const originalRegister = navigator.serviceWorker?.register;

    // ==================== 工具函数 ====================
    const processedNodes = new WeakSet();
    const blockedScripts = new Set();

    function truncateContent(content, maxLength = 666) {//截断
        if (!content) return '';
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength) + '...';
    }

    // 获取元素的DOM路径
    function getElementPath(element) {
        if (!element) return 'none';
        const path = [];
        let current = element;
        let level = 0;
        
        while (current && current.nodeType === 1 && level < 5) {
            let desc = current.nodeName.toLowerCase();
            if (current.id) desc += `#${current.id}`;
            if (current.className) {
                const classes = current.className.split(' ').slice(0, 3).join('.');
                if (classes) desc += `.${classes}`;
            }
            if (current.src && current.src.length < 50) {
                const srcShort = current.src.split('/').pop();
                if (srcShort) desc += `[src:${srcShort}]`;
            }
            path.unshift(desc);
            current = current.parentElement;
            level++;
        }
        return path.join(' > ');
    }

    // 获取调用栈
    function getCallStack(){try{throw new Error();}catch(e){return e.stack.split('\n').slice(2).join('\n    ');}}

    // 详细日志函数
    function logBlock(interceptor, keyword, content, source = '', element = null) {
        const key = `${interceptor}:${keyword}:${Date.now()}:${Math.random()}`;
        if (blockedScripts.has(key)) return;
        blockedScripts.add(key);
        
        console.group(`[脚本拦截器] 🚫 ${interceptor} 拦截`,performance.now());
        console.log(`   关键词: "${keyword}"`);
        console.log(`   来源类型: ${source || '未知'}`);
        
        if (element) {
            console.log(`   元素类型: ${element.nodeName}`);
            if (element.id) console.log(`   元素ID: ${element.id}`);
            if (element.className) console.log(`   元素类名: ${element.className}`);
            
            if (source.includes('内联事件')) {
                const match = source.match(/内联事件: (\w+)/);
                if (match) console.log(`   事件名称: ${match[1]}`);
            }
            
            if (element.src) console.log(`   元素src: ${truncateContent(element.src, 100)}`);
            if (element.href) console.log(`   元素href: ${truncateContent(element.href, 100)}`);
            if (element.data) console.log(`   元素data: ${truncateContent(element.data, 200)}`);
            //if (element.data) console.log(`   元素data: ${element.data}`);
            
            console.log(`   DOM位置: ${getElementPath(element)}`);
        }
        
        const stack = getCallStack();
        if (stack) console.log(`   调用栈:\n    ${stack}`);
        //console.trace(`   调用栈:\n`);
        
        console.log(`   内容预览: ${truncateContent(content)}`);
        console.groupEnd();
    }

    // ==================== 完整的 checkNode 函数 ====================
    function checkNode(node) {
        if (!node || processedNodes.has(node)) return null;
        
        // 1. textContent 和 src
        const content = node.textContent || '';
        const src = node.src || '';
        for (const kw of keywordsToBlock) {
            if (content.includes(kw)) return { kw, content, type: 'content', source: '文本内容' };
            if (src.includes(kw)) return { kw, content: src, type: 'src', source: 'src属性' };
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
                        return { kw, content: jsCode, type: 'pseudo', source: 'javascript:伪协议' };
                    }
                }
            }
            
            if (node.src && typeof node.src === 'string' && node.src.startsWith('javascript:')) {
                const jsCode = node.src.substring(11);
                for (const kw of keywordsToBlock) {
                    if (jsCode.includes(kw)) {
                        return { kw, content: jsCode, type: 'pseudo', source: 'iframe javascript:伪协议' };
                    }
                }
            }
            
            if (node.src && typeof node.src === 'string' && node.src.startsWith('data:text/javascript')) {
                const jsCode = decodeURIComponent(node.src.split(',')[1] || '');
                for (const kw of keywordsToBlock) {
                    if (jsCode.includes(kw)) {
                        return { kw, content: jsCode, type: 'data', source: 'data:javascript协议' };
                    }
                }
            }
        }
        
        // 4. 检查 <object> 和 <embed> 标签
        if (node.nodeName === 'OBJECT' || node.nodeName === 'EMBED') {
            const data = node.data || node.src || '';
            if (data.match(/\.js$/i)) {
                for (const kw of keywordsToBlock) {
                    if (data.includes(kw)) {
                        return { kw, content: data, type: 'plugin', source: `${node.nodeName} 插件` };
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
                            return { kw, content: metaContent, type: 'meta', source: 'meta refresh' };
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
                    return { kw, content: href, type: 'base', source: 'base href' };
                }
            }
        }
        
        return null;
    }

        
	// ==================== 1. createElement ====================
    (function() {
	if (inSecondaryWhitelist) return;
	
	console.log('[脚本拦截器] 🛡️ 部署 createElement 拦截器');
    document.createElement = function(tagName, options) {
        //return
		const element = originalCreateElement.call(document, tagName, options);
        if (tagName !== 'script') return element;
        
        let blocked = false;
        const scriptElement = element;
        
        Object.defineProperty(scriptElement, 'src', {
            set: function(value) {
                if (typeof value !== 'string' || blocked) {
                    this._src = value;
                    return;
                }
                for (const kw of keywordsToBlock) {
                    if (value.includes(kw)) {
                        logBlock('createElement.src', kw, value, '动态创建的外部脚本', scriptElement);
                        blocked = true;
                        return;
                    }
                }
                this._src = value;
            },
            get: function() { return this._src; }
        });
        
        Object.defineProperty(scriptElement, 'innerHTML', {
            set: function(value) {
                if (typeof value !== 'string' || blocked) {
                    this._inner = value;
                    return;
                }
                for (const kw of keywordsToBlock) {
                    if (value.includes(kw)) {
                        logBlock('createElement.innerHTML', kw, value, '动态创建的内联脚本', scriptElement);
                        this._inner = '/* 被脚本拦截器拦截 */';
                        blocked = true;
                        return;
                    }
                }
                this._inner = value;
            },
            get: function() { return this._inner; }
        });
        
        Object.defineProperty(scriptElement, 'textContent', {
            set: function(value) {
                if (typeof value !== 'string' || blocked) {
                    this._text = value;
                    return;
                }
                for (const kw of keywordsToBlock) {
                    if (value.includes(kw)) {
                        logBlock('createElement.textContent', kw, value, '动态创建的内联脚本', scriptElement);
                        this._text = '/* 被脚本拦截器拦截 */';
                        blocked = true;
                        return;
                    }
                }
                this._text = value;
            },
            get: function() { return this._text; }
        });
        
        return scriptElement;
    };
	})();

    // ==================== 2. MutationObserver ====================
    console.log('[脚本拦截器] 👁️ 部署 MutationObserver拦截器');
    const observer = new MutationObserver(function(mutations) {
        
		mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (processedNodes.has(node)) return;
				const named=node.nodeName;
				if(named==="BODY" || named==="HEAD" || named==="HTML") return;

                
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
                    
                    logBlock('MutationObserver', result.kw, result.content, sourceDesc, node);
                    node.remove();
                    processedNodes.add(node);
                    return;
                }
                
                if (node.nodeName === 'SCRIPT') {
                    const src = node.src || '';
                    const text = node.textContent || '';
                    for (const kw of keywordsToBlock) {
                        if (src.includes(kw)) {
                            logBlock('MutationObserver', kw, src, '外部脚本标签', node);
                            node.remove();
                            processedNodes.add(node);
                            break;
                        }
                        if (text.includes(kw)) {
                            logBlock('MutationObserver', kw, text, '内联脚本标签', node);
                            node.remove();
                            processedNodes.add(node);
                            break;
                        }
                    }
                }
                
                processedNodes.add(node);
            });
        });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // ==================== 3. appendChild ====================
	console.log('[脚本拦截器] 📦 部署 appendChild 拦截器');
	Node.prototype.appendChild = function(node) {
		// 1. 先检查 node 是否为空
		if (!node) return originalAppendChild.call(this, node);
		// 2. 检查 node 是否是真正的节点对象
		if (typeof node !== 'object' || !node.nodeName) {
			// 如果不是节点，直接调用原生方法
			return originalAppendChild.call(this, node);
		}
		// 3. 检查是否已处理
		if (processedNodes.has(node)) return originalAppendChild.call(this, node);
		// 4. 安全检查后再调用 checkNode
		const result = checkNode(node);
		if (result) {
			logBlock('appendChild', result.kw, result.content, 
				result.type === 'src' ? 'appendChild添加的外部脚本' : 'appendChild添加的内联脚本', node);
			processedNodes.add(node);
			return node;
		}
		return originalAppendChild.call(this, node);
	};

    // ==================== 4. insertBefore ====================
	Node.prototype.insertBefore = function(newNode, referenceNode) {
		if (!newNode) return originalInsertBefore.call(this, newNode, referenceNode);
		if (typeof newNode !== 'object' || !newNode.nodeName) {
			return originalInsertBefore.call(this, newNode, referenceNode);
		}
		if (processedNodes.has(newNode)) return originalInsertBefore.call(this, newNode, referenceNode);
		
		const result = checkNode(newNode);
		if (result) {
			logBlock('insertBefore', result.kw, result.content, 
				result.type === 'src' ? 'insertBefore添加的外部脚本' : 'insertBefore添加的内联脚本', newNode);
			processedNodes.add(newNode);
			return newNode;
		}
		return originalInsertBefore.call(this, newNode, referenceNode);
	};

// ==================== 5. replaceChild ====================
	Node.prototype.replaceChild = function(newChild, oldChild) {
		if (!newChild) return originalReplaceChild.call(this, newChild, oldChild);
		if (typeof newChild !== 'object' || !newChild.nodeName) {
			return originalReplaceChild.call(this, newChild, oldChild);
		}
		if (processedNodes.has(newChild)) return originalReplaceChild.call(this, newChild, oldChild);
		
		const result = checkNode(newChild);
		if (result) {
			logBlock('replaceChild', result.kw, result.content, 
				result.type === 'src' ? 'replaceChild添加的外部脚本' : 'replaceChild添加的内联脚本', newChild);
			processedNodes.add(newChild);
			return oldChild;
		}
		return originalReplaceChild.call(this, newChild, oldChild);
	};

    // ==================== 6. document.write ====================
    console.log('[脚本拦截器] ✍️ 部署 document.write 拦截器');
    
    document.write = function(str) {
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
    
    document.writeln = function(str) {
        console.trace('writeln检查：',str);
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

    // ==================== 7. eval ====================
	console.log('[脚本拦截器] 🧠 部署 eval 拦截器');
	window.eval=function(code){
	//console.trace('[脚本拦截器] 🧠eval类型',typeof code,'\n',code);
	if(typeof code==='string'){for(const kw of keywordsToBlock){if(code.includes(kw)){logBlock('eval',kw,code,'eval执行(字符串)');return;}}}
	if(typeof code==='function'){const funcStr=code.toString();for(const kw of keywordsToBlock){if(funcStr.includes(kw)){logBlock('eval',kw,funcStr,'eval执行(函数)');return;}}}
	return originalEval.call(this,code);};

	Object.defineProperty(window, 'eval', {// 防止通过别名绕过
		value: window.eval,
		writable: false,      // 禁止修改
		configurable: false    // 禁止重新配置
	});

    // ==================== 8. Function ====================
    (function() {
	if (inSecondaryWhitelist) return;
	console.log('[脚本拦截器] 🧠 部署 Function 拦截器');
	window.Function = function(...args) {
        const code = args[args.length - 1] || '';
        
		if (typeof code === 'string') {
            for (const kw of keywordsToBlock) {
                if (code.includes(kw)) {
                    logBlock('Function', kw, code, 'new Function构造函数');
                    return function() {};
                    //return originalFunction.apply(this, args);
                }}}
        return originalFunction.apply(this, args);
    };
    Object.setPrototypeOf(window.Function, originalFunction);
	})();

    // ==================== 9. setTimeout ====================
    console.log('[脚本拦截器] ⏱️ 部署 setTimeout 拦截器');
    window.setTimeout = function(handler, timeout, ...args) {
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
            for (const kw of keywordsToBlock) {
                if (handlerStr.includes(kw)) {
                    logBlock('setTimeout', kw, handlerStr, '函数形式setTimeout');
                    return 0;
                }
            }
        }
        
        return originalSetTimeout.call(this, handler, timeout, ...args);
    };

// ==================== 10. setInterval ====================
    console.log('[脚本拦截器] ⏱️ 部署 setInterval 拦截器',
	performance.now()
	);
    window.setInterval = function(handler, interval, ...args) {
        // const kk=handler.toString()
		// const  jj = typeof handler
		// console.log('[脚本拦截器] ⏱️类型:',jj,'\n', kk);
		if (typeof handler === 'string') {
            for (const kw of keywordsToBlock) {
                if (handler.includes(kw)) {
                    logBlock('setInterval', kw, handler, '字符串形式setInterval');
                    return 0;
                }
            }
        }
        if (typeof handler === 'function') {
            const handlerStr = handler.toString();
            for (const kw of keywordsToBlock) {
                if (handlerStr.includes(kw)) {
                    logBlock('setInterval', kw, handlerStr, '函数形式setInterval');
                    //console.log('间隔',interval,'\n',...args,performance.now());
					return 0;
                }
            }
        }
        
        return originalSetInterval.call(this, handler, interval, ...args);
    };
	
	// ==================== 11. web Worker ====================
    console.log('[脚本拦截器] 👷 部署 web Worker 拦截器');
    if (originalWorker) {
        window.Worker = function(url, options) {
            const urlStr = typeof url === 'string' ? url : url.href || '';
            for (const kw of keywordsToBlock) {
                if (urlStr.includes(kw)) {
                    logBlock('web Worker', kw, urlStr, 'web Worker线程创建');
                    return {
                        postMessage(){},
                        terminate(){},
                        addEventListener(){},
                        removeEventListener(){},
                        dispatchEvent(){return true},
                        onmessage: null,
                        onerror: null
                    };
                }
            }
            return new originalWorker(url, options);
        };
        window.Worker.prototype = originalWorker.prototype;
    }

    // ==================== 12. SharedWorker ====================
    console.log('[脚本拦截器] 👥 部署 Shared Worker 拦截器');
    if (originalSharedWorker) {
        window.SharedWorker = function(url, options) {
            const urlStr = typeof url === 'string' ? url : url.href || '';
            for (const kw of keywordsToBlock) {
                if (urlStr.includes(kw)) {
                    logBlock('Shared Worker', kw, urlStr, 'Shared Worker线程创建');
                    return {
                        port: {
                            postMessage(){},
                            close(){},
                            start(){},
                            addEventListener(){},
                            removeEventListener(){}
                        },
                        onerror: null
                    };
                }
            }
            return new originalSharedWorker(url, options);
        };
        window.SharedWorker.prototype = originalSharedWorker.prototype;
    }

    // ==================== 13. Service Worker ====================
    console.log('[脚本拦截器] 🔧 部署 Service Worker 拦截器');
    if (navigator.serviceWorker && originalRegister) {
        navigator.serviceWorker.register = function(scriptURL, options) {
            const urlStr = typeof scriptURL === 'string' ? scriptURL : scriptURL.href || '';
            for (const kw of keywordsToBlock) {
                if (urlStr.includes(kw)) {
                    logBlock('Service Worker', kw, urlStr, 'Service Worker注册');
                    return Promise.reject(new Error('Blocked by Script Blocker'));
                }
            }
            return originalRegister.call(this, scriptURL, options);
        };
    }

    // ==================== 14. module 脚本 ====================
    console.log('[脚本拦截器] 📦 部署 module 脚本拦截器');
    const moduleObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeName === 'SCRIPT' && node.type === 'module') {
                    if (node.src) {
                        for (const kw of keywordsToBlock) {
                            if (node.src.includes(kw)) {
                                logBlock('module脚本', kw, node.src, 'module外部脚本', node);
                                node.remove();
                                break;
                            }
                        }
                    }
                    if (node.textContent) {
                        for (const kw of keywordsToBlock) {
                            if (node.textContent.includes(kw)) {
                                logBlock('module脚本', kw, node.textContent, 'module内联脚本', node);
                                node.remove();
                                break;
                            }
                        }
                    }
                }
            });
        });
    });
    moduleObserver.observe(document.documentElement, { childList: true, subtree: true });
	


    // ==================== 15. data URI 脚本 ====================
    console.log('[脚本拦截器] 📊 部署 data URI 脚本拦截器');
    const dataURIObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeName === 'SCRIPT' && node.src && node.src.startsWith('data:')) {
                    const content = decodeURIComponent(node.src.split(',')[1] || '');
                    for (const kw of keywordsToBlock) {
                        if (content.includes(kw)) {
                            logBlock('data URI', kw, content, 'data URI脚本', node);
                            node.remove();
                            break;
                        }
                    }
                }
            });
        });
    });
    dataURIObserver.observe(document.documentElement, { childList: true, subtree: true });
	
	//===网络请求部分拦截===待测试
	// (function() {
	// const originalFetch = window.fetch;// 拦截包含 dmwps.alpha 的网络请求
	// window.fetch = function(...args) {
		// const url = args[0];
		// if (typeof url === 'string' ) {
			// for (const kw of keywordsToBlock) {
				// if (url.includes(kw)) {
				// console.log('[拦截器] 🚫 拦截Fetch:', url);// 返回一个空响应
				// return Promise.resolve(new Response('', {
				// status: 200,
				// statusText: 'OK',
				// headers: new Headers({'Content-Type': 'application/javascript'})}));
		// }}}
		// return originalFetch.apply(this, args);
	// };
	// const XHR = XMLHttpRequest;// 拦截 XMLHttpRequest
	// XMLHttpRequest = function() {
		// const xhr = new XHR();
		// const originalOpen = xhr.open;
		// xhr.open = function(method, url) {
			// if (typeof url === 'string' ) {
				// for (const kw of keywordsToBlock) {
					// if (url.includes(kw)) {
					// console.log('[拦截器] 🚫 拦截 XHR 请求:', url);
					// url = 'about:blank';// 修改请求到一个不存在的地址或空文件
			// }}}
			// return originalOpen.apply(this, arguments);
		// };
		// return xhr;
	// };
	// })();
	


    // ==================== script标签清理 ====================
    console.log('[脚本拦截器] 🧹 部署script标签清理\n(只是清理标签，一般来说该项没法直接拦截标签内的js执行)');
    
    // 多次清理，确保捕获延迟加载的脚本
    const cleanTimes = [0, 200, 400, 600, 800, 1000];
    
    cleanTimes.forEach(timeout => {return;
        setTimeout(function() {
            document.querySelectorAll('script').forEach(function(script) {
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
            
            document.querySelectorAll('div[style*="display: none"]').forEach(function(div) {
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
	

    // ===================额外：持续监控反F12脚本 ====================
    const antiF12Keywords = [
        'keyCode == 123',
        'e.keyCode == 123',
        'e.key === "F12"',
        '.keyCode==123',
        'disableDevTools',
        'setInterval(function() {(debugger',
		'setInterval(function(){(debugger',
		'setInterval(function(){(debug',
		'setInterval(function() {(debug'
    ];
	//const antiF12inter = ['setInterval'];
	
    
    const antiF12Observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeName === 'SCRIPT') {
					const content = node.textContent || '';
                    for (const kw of antiF12Keywords) {
                        if (content.includes(kw) ) {
                            console.log(`[脚本拦截器] 🔒 延迟检测到反F12脚本，已移除`,node);
                            node.remove();
                            break;
                        }
                    }
                }
            });
        });
    });
    	
    antiF12Observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
	

    console.log('[脚本拦截器] ✅ 所有拦截器部署完成，共 ' + keywordsToBlock.length + ' 个关键词');
	
})();
