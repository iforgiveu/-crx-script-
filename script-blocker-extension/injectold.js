// -*- coding: utf-8 -*-
// inject.js - 脚本拦截器核心（完整版 + 详细日志）
(function() {
    'use strict';
    
    console.log('[脚本拦截器] 🚀 已注入到页面');

    // 从 meta 标签获取规则
    function getRulesFromMeta() {
        const meta = document.querySelector('meta[name="script-blocker-rules"]');
        if (meta) {
            try {
                return JSON.parse(meta.getAttribute('content') || '[]');
            } catch (e) {
                console.log('[脚本拦截器] ⚠️ 规则解析失败:', e);
                return [];
            }
        }
        return [];
    }

    let keywordsToBlock = [];
    let rules = getRulesFromMeta();

    // 已处理节点集合
    const processedNodes = new WeakSet();
    
    // 已拦截的脚本记录
    const blockedScripts = new Set();

    // 截取内容前100个字符
    function truncateContent(content, maxLength = 100) {
        if (!content) return '';
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength) + '...';
    }

    // 提取脚本的关键特征
    function extractScriptFeatures(content) {
        if (!content) return '无内容';
        
        const features = [];
        
        if (content.includes('__CF$cv$params')) features.push('Cloudflare检测');
        if (content.includes('new Function')) features.push('Function构造函数');
        if (content.includes('eval(')) features.push('eval执行');
        if (content.includes('document.write')) features.push('document.write');
        if (content.includes('position:fixed')) features.push('固定定位元素');
        if (content.includes('display:none')) features.push('隐藏元素');
        if (content.includes('base64')) features.push('Base64编码');
        if (content.includes('fromCharCode')) features.push('字符编码混淆');
        if (content.includes('.cn') || content.includes('.com')) {
            const domainMatch = content.match(/https?:\/\/([^\/"\'\s]+)/);
            if (domainMatch) features.push(`域名:${domainMatch[1]}`);
        }
        
        return features.length ? features.join(' | ') : '未知特征';
    }

    // 格式化日志输出
    function logBlock(interceptor, keyword, content, source = '') {
        const truncated = truncateContent(content);
        const features = extractScriptFeatures(content);
        
        console.group(`[脚本拦截器] 🚫 ${interceptor} 拦截`);
        console.log(`   关键词: "${keyword}"`);
        console.log(`   特征: ${features}`);
        if (source) console.log(`   来源: ${source}`);
        console.log(`   内容预览: ${truncated}`);
        console.groupEnd();
    }

    // 通配符匹配函数
    function wildcardMatch(text, pattern) {
        const regexPattern = pattern
            .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*');
        
        const regex = new RegExp(`^${regexPattern}$`, 'i');
        const partialRegex = new RegExp(regexPattern, 'i');
        
        return regex.test(text) || partialRegex.test(text);
    }

    // 检查网站是否匹配规则
    function matchSite(currentUrl, currentHost, rule) {
        const matchType = rule.matchType || 'simple';
        const sitePatterns = rule.sitePatterns || [];
        
        for (const pattern of sitePatterns) {
            if (!pattern) continue;
            
            if (matchType === 'simple') {
                if (wildcardMatch(currentUrl, pattern) || wildcardMatch(currentHost, pattern)) {
                    console.log(`[脚本拦截器] ✅ 通配符匹配: "${pattern}"`);
                    return true;
                }
            }
            else if (matchType === 'contains') {
                if (currentUrl.includes(pattern) || currentHost.includes(pattern)) {
                    console.log(`[脚本拦截器] ✅ 包含匹配: "${pattern}"`);
                    return true;
                }
            }
            else if (matchType === 'regex') {
                try {
                    const regex = new RegExp(pattern, 'i');
                    if (regex.test(currentUrl) || regex.test(currentHost)) {
                        console.log(`[脚本拦截器] ✅ 正则匹配: "${pattern}"`);
                        return true;
                    }
                } catch (e) {
                    console.log(`[脚本拦截器] ❌ 正则错误: ${pattern}`);
                }
            }
        }
        return false;
    }

    // 检查当前网站是否匹配规则
    function checkSiteMatch() {
        const currentUrl = window.location.href;
        const currentHost = window.location.hostname;
        
        console.log('[脚本拦截器] 🌐 当前网站:', currentHost);
        console.log('[脚本拦截器] 📍 完整地址:', currentUrl);
        console.log('[脚本拦截器] 📋 加载的规则数:', rules.length);
        
        for (const rule of rules) {
            if (!rule.enabled) continue;
            
            if (matchSite(currentUrl, currentHost, rule)) {
                keywordsToBlock = rule.keywords || [];
                console.log(`[脚本拦截器] 🎯 匹配规则: ${rule.name || '未命名'}`);
                console.log('[脚本拦截器] 🔑 拦截关键词:', keywordsToBlock.join('、'));
                return true;
            }
        }
        return false;
    }

    // 如果不匹配，直接退出
    if (!checkSiteMatch()) {
        return;
    }

    // 检查节点是否需要拦截
    function shouldBlockNode(node) {
        if (!node || processedNodes.has(node)) return null;
        
        const content = node.textContent || '';
        const src = node.src || '';
        
        for (const keyword of keywordsToBlock) {
            if (content.includes(keyword)) {
                return { keyword, content, type: 'content', src: null };
            }
            if (src.includes(keyword)) {
                return { keyword, content: src, type: 'src', src };
            }
        }
        return null;
    }

    // 标记节点为已处理
    function markAsProcessed(node) {
        if (node && node.nodeType === 1) {
            processedNodes.add(node);
        }
    }

    // ==================== 拦截策略1: document.createElement ====================
    console.log('[脚本拦截器] 🛡️ 部署 createElement 拦截器');
    const originalCreateElement = document.createElement;
    
    document.createElement = function(tagName, options) {
        const element = originalCreateElement.call(document, tagName, options);
        
        if (tagName && tagName.toLowerCase() === 'script') {
            const scriptElement = element;
            let blocked = false;
            
            // 拦截 src 属性
            let src = '';
            Object.defineProperty(scriptElement, 'src', {
                get: function() { return src; },
                set: function(value) {
                    if (typeof value === 'string' && !blocked) {
                        for (const keyword of keywordsToBlock) {
                            if (value.includes(keyword)) {
                                const key = `src:${value}`;
                                if (!blockedScripts.has(key)) {
                                    logBlock('createElement.src', keyword, value, '外部脚本');
                                    blockedScripts.add(key);
                                }
                                src = '';
                                blocked = true;
                                return;
                            }
                        }
                    }
                    src = value;
                },
                configurable: true
            });
            
            // 拦截 innerHTML
            let innerHTML = '';
            Object.defineProperty(scriptElement, 'innerHTML', {
                get: function() { return innerHTML; },
                set: function(value) {
                    if (typeof value === 'string' && !blocked) {
                        for (const keyword of keywordsToBlock) {
                            if (value.includes(keyword)) {
                                const key = `inner:${value.substring(0, 100)}`;
                                if (!blockedScripts.has(key)) {
                                    logBlock('createElement.innerHTML', keyword, value, '内联脚本');
                                    blockedScripts.add(key);
                                }
                                innerHTML = '/* 被脚本拦截器拦截 */';
                                blocked = true;
                                return;
                            }
                        }
                    }
                    innerHTML = value;
                },
                configurable: true
            });
            
            // 拦截 textContent
            let textContent = '';
            Object.defineProperty(scriptElement, 'textContent', {
                get: function() { return textContent; },
                set: function(value) {
                    if (typeof value === 'string' && !blocked) {
                        for (const keyword of keywordsToBlock) {
                            if (value.includes(keyword)) {
                                const key = `text:${value.substring(0, 100)}`;
                                if (!blockedScripts.has(key)) {
                                    logBlock('createElement.textContent', keyword, value, '内联脚本');
                                    blockedScripts.add(key);
                                }
                                textContent = '/* 被脚本拦截器拦截 */';
                                blocked = true;
                                return;
                            }
                        }
                    }
                    textContent = value;
                },
                configurable: true
            });
        }
        
        return element;
    };

    // ==================== 拦截策略2: MutationObserver ====================
    console.log('[脚本拦截器] 👁️ 部署 MutationObserver');
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (processedNodes.has(node)) return;
                
                const blockResult = shouldBlockNode(node);
                if (blockResult) {
                    const key = `mutation:${node.nodeName}:${blockResult.content.substring(0, 100)}`;
                    if (!blockedScripts.has(key)) {
                        if (blockResult.type === 'src') {
                            logBlock('MutationObserver', blockResult.keyword, blockResult.content, `外部脚本 (${node.nodeName})`);
                        } else {
                            logBlock('MutationObserver', blockResult.keyword, blockResult.content, `${node.nodeName}节点`);
                        }
                        blockedScripts.add(key);
                    }
                    node.remove();
                    markAsProcessed(node);
                    return;
                }
                
                if (node.nodeName === 'SCRIPT' && !processedNodes.has(node)) {
                    const src = node.src || '';
                    const text = node.textContent || '';
                    
                    for (const keyword of keywordsToBlock) {
                        if (src.includes(keyword)) {
                            const key = `mutation-script:${src}`;
                            if (!blockedScripts.has(key)) {
                                logBlock('MutationObserver', keyword, src, '外部脚本标签');
                                blockedScripts.add(key);
                            }
                            node.remove();
                            markAsProcessed(node);
                            break;
                        }
                        if (text.includes(keyword)) {
                            const key = `mutation-script:${text.substring(0, 100)}`;
                            if (!blockedScripts.has(key)) {
                                logBlock('MutationObserver', keyword, text, '内联脚本标签');
                                blockedScripts.add(key);
                            }
                            node.remove();
                            markAsProcessed(node);
                            break;
                        }
                    }
                }
                
                markAsProcessed(node);
            });
        });
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // ==================== 拦截策略3: appendChild ====================
    console.log('[脚本拦截器] 📦 部署 appendChild 拦截器');
    const originalAppendChild = Node.prototype.appendChild;
    Node.prototype.appendChild = function(node) {
        if (node && !processedNodes.has(node)) {
            const blockResult = shouldBlockNode(node);
            if (blockResult) {
                const key = `append:${node.nodeName}:${blockResult.content.substring(0, 100)}`;
                if (!blockedScripts.has(key)) {
                    if (blockResult.type === 'src') {
                        logBlock('appendChild', blockResult.keyword, blockResult.content, `外部脚本 (${node.nodeName})`);
                    } else {
                        logBlock('appendChild', blockResult.keyword, blockResult.content, `${node.nodeName}节点`);
                    }
                    blockedScripts.add(key);
                }
                markAsProcessed(node);
                return node;
            }
        }
        return originalAppendChild.call(this, node);
    };

    // ==================== 拦截策略4: insertBefore ====================
    console.log('[脚本拦截器] 📌 部署 insertBefore 拦截器');
    const originalInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function(newNode, referenceNode) {
        if (newNode && !processedNodes.has(newNode)) {
            const blockResult = shouldBlockNode(newNode);
            if (blockResult) {
                const key = `insert:${newNode.nodeName}:${blockResult.content.substring(0, 100)}`;
                if (!blockedScripts.has(key)) {
                    if (blockResult.type === 'src') {
                        logBlock('insertBefore', blockResult.keyword, blockResult.content, `外部脚本 (${newNode.nodeName})`);
                    } else {
                        logBlock('insertBefore', blockResult.keyword, blockResult.content, `${newNode.nodeName}节点`);
                    }
                    blockedScripts.add(key);
                }
                markAsProcessed(newNode);
                return newNode;
            }
        }
        return originalInsertBefore.call(this, newNode, referenceNode);
    };

    // ==================== 拦截策略5: replaceChild ====================
    console.log('[脚本拦截器] 🔄 部署 replaceChild 拦截器');
    const originalReplaceChild = Node.prototype.replaceChild;
    Node.prototype.replaceChild = function(newChild, oldChild) {
        if (newChild && !processedNodes.has(newChild)) {
            const blockResult = shouldBlockNode(newChild);
            if (blockResult) {
                const key = `replace:${newChild.nodeName}:${blockResult.content.substring(0, 100)}`;
                if (!blockedScripts.has(key)) {
                    if (blockResult.type === 'src') {
                        logBlock('replaceChild', blockResult.keyword, blockResult.content, `外部脚本 (${newChild.nodeName})`);
                    } else {
                        logBlock('replaceChild', blockResult.keyword, blockResult.content, `${newChild.nodeName}节点`);
                    }
                    blockedScripts.add(key);
                }
                markAsProcessed(newChild);
                return oldChild;
            }
        }
        return originalReplaceChild.call(this, newChild, oldChild);
    };

    // ==================== 拦截策略6: document.write ====================
    console.log('[脚本拦截器] ✍️ 部署 document.write 拦截器');
    const originalWrite = document.write;
    const originalWriteln = document.writeln;
    const writtenScripts = new Set();

    document.write = function(str) {
        if (typeof str === 'string') {
            for (const keyword of keywordsToBlock) {
                if (str.includes(keyword) && str.includes('<script')) {
                    const key = `write:${str.substring(0, 100)}`;
                    if (!writtenScripts.has(key)) {
                        logBlock('document.write', keyword, str, 'document.write写入');
                        writtenScripts.add(key);
                    }
                    return;
                }
            }
        }
        originalWrite.call(document, str);
    };

    document.writeln = function(str) {
        if (typeof str === 'string') {
            for (const keyword of keywordsToBlock) {
                if (str.includes(keyword) && str.includes('<script')) {
                    const key = `writeln:${str.substring(0, 100)}`;
                    if (!writtenScripts.has(key)) {
                        logBlock('document.writeln', keyword, str, 'document.writeln写入');
                        writtenScripts.add(key);
                    }
                    return;
                }
            }
        }
        originalWriteln.call(document, str);
    };

    // ==================== 拦截策略7: eval 和 Function ====================
    console.log('[脚本拦截器] 🧠 部署 eval/Function 拦截器');
    
    const originalEval = window.eval;
    const evalBlocked = new Set();
    
    window.eval = function(code) {
        if (typeof code === 'string') {
            for (const keyword of keywordsToBlock) {
                if (code.includes(keyword)) {
                    const key = `eval:${code.substring(0, 100)}`;
                    if (!evalBlocked.has(key)) {
                        logBlock('eval', keyword, code, 'eval执行');
                        evalBlocked.add(key);
                    }
                    return;
                }
            }
        }
        return originalEval.call(this, code);
    };

    const originalFunction = window.Function;
    const functionBlocked = new Set();
    
    window.Function = function(...args) {
        const code = args[args.length - 1] || '';
        if (typeof code === 'string') {
            for (const keyword of keywordsToBlock) {
                if (code.includes(keyword)) {
                    const key = `function:${code.substring(0, 100)}`;
                    if (!functionBlocked.has(key)) {
                        logBlock('Function构造函数', keyword, code, 'new Function');
                        functionBlocked.add(key);
                    }
                    return function() {};
                }
            }
        }
        return originalFunction.apply(this, args);
    };

    Object.setPrototypeOf(window.Function, originalFunction);

    // ==================== 拦截策略8: setTimeout/setInterval ====================
    console.log('[脚本拦截器] ⏱️ 部署 setTimeout/setInterval 拦截器');
    
    const originalSetTimeout = window.setTimeout;
    const timeoutBlocked = new Set();
    
    window.setTimeout = function(handler, timeout, ...args) {
        if (typeof handler === 'string') {
            for (const keyword of keywordsToBlock) {
                if (handler.includes(keyword)) {
                    const key = `timeout:${handler.substring(0, 100)}`;
                    if (!timeoutBlocked.has(key)) {
                        logBlock('setTimeout', keyword, handler, '字符串形式setTimeout');
                        timeoutBlocked.add(key);
                    }
                    return 0;
                }
            }
        }
        return originalSetTimeout.call(this, handler, timeout, ...args);
    };

    const originalSetInterval = window.setInterval;
    const intervalBlocked = new Set();
    
    window.setInterval = function(handler, interval, ...args) {
        if (typeof handler === 'string') {
            for (const keyword of keywordsToBlock) {
                if (handler.includes(keyword)) {
                    const key = `interval:${handler.substring(0, 100)}`;
                    if (!intervalBlocked.has(key)) {
                        logBlock('setInterval', keyword, handler, '字符串形式setInterval');
                        intervalBlocked.add(key);
                    }
                    return 0;
                }
            }
        }
        return originalSetInterval.call(this, handler, interval, ...args);
    };

    // ==================== 拦截策略9: Worker ====================
    console.log('[脚本拦截器] 👷 部署 Worker 拦截器');
    
    const originalWorker = window.Worker;
    if (originalWorker) {
        window.Worker = function(url, options) {
            const urlStr = typeof url === 'string' ? url : url.href || '';
            for (const keyword of keywordsToBlock) {
                if (urlStr.includes(keyword)) {
                    logBlock('Worker', keyword, urlStr, 'Worker线程创建');
                    return {
                        postMessage: function() {},
                        terminate: function() {},
                        addEventListener: function() {},
                        removeEventListener: function() {},
                        dispatchEvent: function() { return true; },
                        onmessage: null,
                        onerror: null
                    };
                }
            }
            return new originalWorker(url, options);
        };
        window.Worker.prototype = originalWorker.prototype;
    }

    // ==================== 拦截策略10: SharedWorker ====================
    console.log('[脚本拦截器] 👥 部署 SharedWorker 拦截器');
    
    const originalSharedWorker = window.SharedWorker;
    if (originalSharedWorker) {
        window.SharedWorker = function(url, options) {
            const urlStr = typeof url === 'string' ? url : url.href || '';
            for (const keyword of keywordsToBlock) {
                if (urlStr.includes(keyword)) {
                    logBlock('SharedWorker', keyword, urlStr, 'SharedWorker线程创建');
                    return {
                        port: {
                            postMessage: function() {},
                            close: function() {},
                            start: function() {},
                            addEventListener: function() {},
                            removeEventListener: function() {}
                        },
                        onerror: null
                    };
                }
            }
            return new originalSharedWorker(url, options);
        };
        window.SharedWorker.prototype = originalSharedWorker.prototype;
    }

    // ==================== 拦截策略11: ServiceWorker ====================
    console.log('[脚本拦截器] 🔧 部署 ServiceWorker 拦截器');
    
    if (navigator.serviceWorker && navigator.serviceWorker.register) {
        const originalRegister = navigator.serviceWorker.register;
        navigator.serviceWorker.register = function(scriptURL, options) {
            const urlStr = typeof scriptURL === 'string' ? scriptURL : scriptURL.href || '';
            for (const keyword of keywordsToBlock) {
                if (urlStr.includes(keyword)) {
                    logBlock('ServiceWorker', keyword, urlStr, 'ServiceWorker注册');
                    return Promise.reject(new Error('Blocked by Script Blocker'));
                }
            }
            return originalRegister.call(this, scriptURL, options);
        };
    }

    // ==================== 拦截策略12: module 脚本 ====================
    console.log('[脚本拦截器] 📦 部署 module 脚本拦截器');
    
    const moduleObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeName === 'SCRIPT' && node.type === 'module') {
                    if (node.src) {
                        for (const keyword of keywordsToBlock) {
                            if (node.src.includes(keyword)) {
                                logBlock('module脚本', keyword, node.src, 'module外部脚本');
                                node.remove();
                                break;
                            }
                        }
                    }
                    if (node.textContent) {
                        for (const keyword of keywordsToBlock) {
                            if (node.textContent.includes(keyword)) {
                                logBlock('module脚本', keyword, node.textContent, 'module内联脚本');
                                node.remove();
                                break;
                            }
                        }
                    }
                }
            });
        });
    });

    moduleObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // ==================== 拦截策略13: 数据URI脚本 ====================
    console.log('[脚本拦截器] 📊 部署数据URI脚本拦截器');
    
    const dataURIObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeName === 'SCRIPT' && node.src && node.src.startsWith('data:')) {
                    const content = decodeURIComponent(node.src.split(',')[1] || '');
                    for (const keyword of keywordsToBlock) {
                        if (content.includes(keyword)) {
                            logBlock('data URI', keyword, content, 'data URI脚本');
                            node.remove();
                            break;
                        }
                    }
                }
            });
        });
    });

    dataURIObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // ==================== 拦截策略14: Blob URL ====================
    console.log('[脚本拦截器] 📎 部署 Blob URL 拦截器');
    
    const originalCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = function(obj) {
        if (obj && obj.type && obj.type.includes('javascript')) {
            console.log('[脚本拦截器] ⚠️ 检测到 JavaScript Blob 创建');
        }
        return originalCreateObjectURL.call(this, obj);
    };

    // ==================== 针对 Cloudflare 特定拦截 ====================
    if (keywordsToBlock.some(k => k.includes('__CF$cv$params') || k.includes('cloudflare'))) {
        console.log('[脚本拦截器] ☁️ 部署 Cloudflare 专用拦截器');
        
        let cfBlocked = false;
        Object.defineProperty(window, '__CF$cv$params', {
            set: function(value) {
                if (!cfBlocked) {
                    console.group('[脚本拦截器] 🚫 Cloudflare 变量拦截');
                    console.log('   变量: __CF$cv$params');
                    console.log('   值:', value);
                    console.groupEnd();
                    cfBlocked = true;
                }
            },
            get: function() {
                return null;
            },
            configurable: false
        });
        
        let cfOptBlocked = false;
        Object.defineProperty(window, '_cf_chl_opt', {
            set: function(value) {
                if (!cfOptBlocked) {
                    console.group('[脚本拦截器] 🚫 Cloudflare 变量拦截');
                    console.log('   变量: _cf_chl_opt');
                    console.log('   值:', value);
                    console.groupEnd();
                    cfOptBlocked = true;
                }
            },
            get: function() {
                return null;
            },
            configurable: false
        });

        let cfCtxBlocked = false;
        Object.defineProperty(window, '_cf_chl_ctx', {
            set: function(value) {
                if (!cfCtxBlocked) {
                    console.group('[脚本拦截器] 🚫 Cloudflare 变量拦截');
                    console.log('   变量: _cf_chl_ctx');
                    console.log('   值:', value);
                    console.groupEnd();
                    cfCtxBlocked = true;
                }
            },
            get: function() {
                return null;
            },
            configurable: false
        });
    }

    // ==================== 清理已存在的脚本 ====================
    function cleanExistingScripts() {
        console.log('[脚本拦截器] 🧹 执行初始清理');
        const cleaned = new Set();
        
        // 清理 script 标签
        document.querySelectorAll('script').forEach(script => {
            if (cleaned.has(script)) return;
            
            const content = script.textContent || '';
            const src = script.src || '';
            
            for (const keyword of keywordsToBlock) {
                if (content.includes(keyword)) {
                    logBlock('初始清理', keyword, content, '已存在的内联脚本');
                    script.remove();
                    cleaned.add(script);
                    break;
                }
                if (src.includes(keyword)) {
                    logBlock('初始清理', keyword, src, '已存在的外部脚本');
                    script.remove();
                    cleaned.add(script);
                    break;
                }
            }
        });
        
        // 清理隐藏的 div
        document.querySelectorAll('div[style*="display: none"]').forEach(div => {
            if (cleaned.has(div)) return;
            
            const content = div.textContent || '';
            for (const keyword of keywordsToBlock) {
                if (content.includes(keyword)) {
                    logBlock('初始清理', keyword, content, '隐藏div');
                    div.remove();
                    cleaned.add(div);
                    break;
                }
            }
        });
    }

    setTimeout(cleanExistingScripts, 0);

    console.log('[脚本拦截器] ✅ 所有拦截器部署完成，共 ' + keywordsToBlock.length + ' 个关键词');
    console.log('[脚本拦截器] 📊 已部署策略: createElement, MutationObserver, appendChild, insertBefore, replaceChild, document.write, eval, Function, setTimeout, Worker, SharedWorker, ServiceWorker, module, data URI, Blob URL, Cloudflare');
})();