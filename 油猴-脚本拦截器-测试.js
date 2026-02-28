// ==UserScript==
// @name         脚本拦截器
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  拦截包含特定关键词的脚本
// @author       You
// @match        *://m.shencou.com/*
// @include       *://*dm*
// @include       *://*dongman*
// @include       *://*acpc*
// @include       *://*ifana*/*
// @include       *://*yh*/*
// @include       *://*yinghua*
// @include       *://*tahiti-japan*
// @include       *//*www.qzsfjz.com*
// @grant        none
// @run-at       document-start

// ==/UserScript==

(function () {
    'use strict';
    console.log('[拦截器] 启动 gogogo',performance.now());

    // 规则配置，网站和关键词只写字符，sites的*表示匹配任意网站
    //提供了一些初始配置
    const RULES = [{
            sites: ['m.shencou.com', 'yhmana.cc'],
            keywords: [
                'new Function(',
                'var style="position:fixed; bottom',
                '__CF$cv$params',
                'adsbygoogle'
            ]
        }, {
            sites: ['*'],
            keywords: [
                'debugger',
                'sponsorAdDiv',
                'new Function(',
                'dmapv.alpha',
                'var style="position:fixed; bottom'
            ]
        }
    ];

    // 检查当前网站
    const currentUrl = location.href;
    if (currentUrl.includes('index.m3u8')
         || currentUrl.includes('loading.html')) {
        console.log('白名单网站，退出');
        return;
    }
    const currentHost = location.hostname;
    let keywordsToBlock = [];
	// 遍历所有规则
	for (const rule of RULES) {
		// 检查当前网站是否匹配该规则的站点列表
		let siteMatched = false;
		for (const site of rule.sites) {
			if (site === '*' || currentUrl.includes(site) || currentHost.includes(site)) {
				siteMatched = true;
				break;}}
			// 如果站点匹配，将该规则的所有关键词加入拦截列表
		if (siteMatched) {
			console.log(`[拦截器] 规则匹配成功，站点列表:`, rule.sites);
			console.log(`[拦截器] 添加关键词:`, rule.keywords);
			// 合并关键词（用Set去重）
			keywordsToBlock = [...new Set([...keywordsToBlock, ...rule.keywords])];}
	}
    if (keywordsToBlock.length === 0) {
        console.log('[拦截器] 无匹配规则');
        return;
    }
	console.log('[拦截器] 最终拦截关键词:', keywordsToBlock,performance.now());

    // ==================== 1. 拦截已存在的脚本标签 ====================
    function removeExistingScripts() {
        document.querySelectorAll('script').forEach(script => {
            const content = script.textContent || '';
            const src = script.src || '';

            for (const kw of keywordsToBlock) {
                if (content.includes(kw) || src.includes(kw)) {
                    console.log(`[拦截器] 🚫 移除已存在脚本 (关键词: ${kw})`);
                    script.remove();
                    break;
                }
            }
        });
    }

    // ==================== 2. 拦截 createElement 创建的脚本 ====================
    const originalCreateElement = document.createElement;
    document.createElement = function (tagName) {
        const element = originalCreateElement.call(this, tagName);

        if (tagName && tagName.toLowerCase() === 'script') {
            // 拦截 src 设置
            Object.defineProperty(element, 'src', {
                set: function (value) {
                    for (const kw of keywordsToBlock) {
                        if (value.includes(kw)) {
                            console.log(`[拦截器] 🚫 拦截外部脚本创建: ${value}`);
                            this._src = '';
                            return;
                        }
                    }
                    this._src = value;
                },
                get: function () {
                    return this._src || '';
                }
            });

            // 拦截 textContent 设置（内联脚本）
            Object.defineProperty(element, 'textContent', {
                set: function (value) {
                    for (const kw of keywordsToBlock) {
                        if (value.includes(kw)) {
                            console.log(`[拦截器] 🚫 拦截内联脚本创建 (关键词: ${kw})`);
                            this._text = '/* 被拦截 */';
                            return;
                        }
                    }
                    this._text = value;
                },
                get: function () {
                    return this._text || '';
                }
            });

            // 拦截 innerHTML 设置
            Object.defineProperty(element, 'innerHTML', {
                set: function (value) {
                    for (const kw of keywordsToBlock) {
                        if (value.includes(kw)) {
                            console.log(`[拦截器] 🚫 拦截内联脚本创建 (关键词: ${kw})`);
                            this._html = '/* 被拦截 */';
                            return;
                        }
                    }
                    this._html = value;
                },
                get: function () {
                    return this._html || '';
                }
            });
        }

        return element;
    };

    // ==================== 3. MutationObserver 拦截动态添加 ====================
    console.log('[拦截器] 🎫部署 MutationObserver拦截')
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeName === 'SCRIPT') {
                    const content = node.textContent || '';
                    const src = node.src || '';

                    for (const kw of keywordsToBlock) {
                        if (content.includes(kw) || src.includes(kw)) {
                            console.log(`[拦截器] 🚫 MutationObserver 移除脚本 (关键词: ${kw})`,content);
                            node.remove();
                            break;
                        }
                    }
                }
            });
        });
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // ==================== 4. 拦截 appendChild ====================
    const originalAppendChild = Node.prototype.appendChild;
    Node.prototype.appendChild = function (node) {
        if (node && node.nodeName === 'SCRIPT') {
            const content = node.textContent || '';
            const src = node.src || '';

            for (const kw of keywordsToBlock) {
                if (content.includes(kw) || src.includes(kw)) {
                    console.log(`[拦截器] 🚫 拦截 appendChild (关键词: ${kw})`);
                    return node;
                }
            }
        }
        return originalAppendChild.call(this, node);
    };

    // ==================== 5. 拦截 insertBefore ====================
    const originalInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function (newNode, referenceNode) {
        if (newNode && newNode.nodeName === 'SCRIPT') {
            const content = newNode.textContent || '';
            const src = newNode.src || '';

            for (const kw of keywordsToBlock) {
                if (content.includes(kw) || src.includes(kw)) {
                    console.log(`[拦截器] 🚫 拦截 insertBefore (关键词: ${kw})`);
                    return newNode;
                }
            }
        }
        return originalInsertBefore.call(this, newNode, referenceNode);
    };

    // ==================== 6. 拦截 document.write ====================
    const originalWrite = document.write;
    const originalWriteln = document.writeln;
    document.write = function (str) {
        if (typeof str === 'string') {
            for (const kw of keywordsToBlock) {
                if (str.includes(kw) && str.includes('<script')) {

                    console.trace(`[拦截器] 🚫 拦截 document.write (${kw})`,str);
                    return;}}}
        originalWrite.call(document, str);
    };
    document.writeln = function (str) {
        console.trace('writeln检查：', str);
        if (typeof str === 'string') {
            for (const kw of keywordsToBlock) {
                if (str.includes(kw) && str.includes('<script')) {
                    console.trace(`[拦截器] 🚫 拦截 document.writeln (${kw})`,str);
                    return;}}}
        originalWriteln.call(document, str);
    };


    const originalEval = window.eval;
    const originalFunction = window.Function;
    // ==================== 7. eval ====================
    console.log('[拦截器] 🧠 部署 eval 拦截器');
    window.eval = function (code) {
    //console.trace('[拦截器] 🧠eval类型',typeof code,'\n',code);
    if (typeof code === 'string') {
        for (const kw of keywordsToBlock) {
            if (code.includes(kw)) {
                //logBlock('eval', kw, code, 'eval执行(字符串)');
                console.trace(`[拦截器] 🚫 拦截 eval执行(字符串)(${kw})`,code);

                return;
            }
        }
    }
    if (typeof code === 'function') {
        const funcStr = code.toString();
        for (const kw of keywordsToBlock) {
            if (funcStr.includes(kw)) {
                //logBlock('eval', kw, funcStr, 'eval执行(函数)');
                console.trace(`[拦截器] 🚫 拦截 eval执行(函数)(${kw})`,code);
                return;
            }
        }
    }
    return originalEval.call(this, code);
};
    Object.defineProperty(window, 'eval', { // 防止通过别名绕过
        value: window.eval,
        writable: false, // 禁止修改
        configurable: false // 禁止重新配置
    });
    // ==================== 8. Function ====================
    (function () {
        console.log('[拦截器] 🧠 部署 Function 拦截器');
        window.Function = function (...args) {
            const code = args[args.length - 1] || '';
            if (typeof code === 'string') {
                for (const kw of keywordsToBlock) {
                    if (code.includes(kw)) {
                        //logBlock('Function', kw, code, 'new Function构造函数');
                        console.trace('[拦截器] 🚀 拦截 new Function构造函数',code,performance.now());
                        return function () {};
                    }
                }
            }
            return originalFunction.apply(this, args);
        };
        Object.setPrototypeOf(window.Function, originalFunction);
    })();
    // ==================== 10. setInterval ====================
    const originalSetInterval = window.setInterval;
    window.setInterval = function (handler, interval, ...args) {
    if (typeof handler === 'string') {
        for (const kw of keywordsToBlock) {
            if (handler.includes(kw)) {
                //logBlock('setInterval', kw, handler, '字符串形式setInterval');
                return 0;
            }
        }
    }
    if (typeof handler === 'function') {
        const handlerStr = handler.toString();
        for (const kw of keywordsToBlock) {
            if (handlerStr.includes(kw)) {
                //logBlock('setInterval', kw, handlerStr, '函数形式setInterval');
                return 0;
            }
        }
    }
    return originalSetInterval.call(this, handler, interval, ...args);
};

    // ==================== 9. 延迟执行，确保拦截更晚添加的脚本 ====================
    setTimeout(removeExistingScripts, 0);
    setTimeout(removeExistingScripts, 100);
    setTimeout(removeExistingScripts, 500);
    setTimeout(removeExistingScripts, 1000);
    setTimeout(removeExistingScripts, 3000);
	
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
	// })()

    console.log('[拦截器] ✅ 部署完成，关键词:', keywordsToBlock,performance.now());
    })();
