// -*- coding: utf-8 -*-
// inject.js - 脚本拦截器核心（完整策略 + 详细日志）
(function() {
    'use strict';
    
    console.log('[脚本拦截器] 🚀 已注入到页面');

    // 从 meta 标签获取规则
    const meta = document.querySelector('meta[name="script-blocker-rules"]');
    if (!meta) return;
    
    let rules = [];
    try {
        rules = JSON.parse(meta.getAttribute('content') || '[]');
    } catch (e) {
        console.log('[脚本拦截器] ⚠️ 规则解析失败:', e);
        return;
    }

    // 检查当前网站是否匹配规则
    const currentUrl = window.location.href;
    const currentHost = window.location.hostname;
    
    console.log('[脚本拦截器] 🌐 当前网站:', currentHost);
    console.log('[脚本拦截器] 📍 完整地址:', currentUrl);
    console.log('[脚本拦截器] 📋 加载的规则数:', rules.length);

    let keywordsToBlock = [];
    
    for (const rule of rules) {
        if (!rule.enabled) continue;
        
        const matchType = rule.matchType || 'simple';
        const sitePatterns = rule.sitePatterns || [];
        let matched = false;
        
        for (const pattern of sitePatterns) {
            if (!pattern) continue;
            
            if (matchType === 'simple') {
                const regexPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
                const regex = new RegExp(regexPattern, 'i');
                if (regex.test(currentUrl) || regex.test(currentHost)) {
                    console.log(`[脚本拦截器] ✅ 通配符匹配: "${pattern}"`);
                    matched = true;
                    break;
                }
            } else if (matchType === 'contains') {
                if (currentUrl.includes(pattern) || currentHost.includes(pattern)) {
                    console.log(`[脚本拦截器] ✅ 包含匹配: "${pattern}"`);
                    matched = true;
                    break;
                }
            } else if (matchType === 'regex') {
                try {
                    const regex = new RegExp(pattern, 'i');
                    if (regex.test(currentUrl) || regex.test(currentHost)) {
                        console.log(`[脚本拦截器] ✅ 正则匹配: "${pattern}"`);
                        matched = true;
                        break;
                    }
                } catch (e) {}
            }
        }
        
        if (matched) {
            keywordsToBlock = rule.keywords || [];
            console.log(`[脚本拦截器] 🎯 匹配规则: ${rule.name || '未命名规则'}`);
            console.log('[脚本拦截器] 🔑 拦截关键词:', keywordsToBlock.join('、'));
            break;
        }
    }

    if (keywordsToBlock.length === 0) {
        console.log('[脚本拦截器] ⏭️ 当前网站无匹配规则，退出');
        return;
    }

    // 工具函数
    const processedNodes = new WeakSet();
    const blockedScripts = new Set();

    function truncateContent(content, maxLength = 160) {//截断前160
        if (!content) return '';
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength) + '...';
    }

    function extractFeatures(content) {
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
        const domainMatch = content.match(/https?:\/\/([^\/"\'\s]+)/);
        if (domainMatch) features.push(`域名:${domainMatch[1]}`);
        return features.length ? features.join(' | ') : '普通脚本';
    }

    function logBlock(interceptor, keyword, content, source = '') {
        const key = `${interceptor}:${content.substring(0, 100)}`;
        if (blockedScripts.has(key)) return;
        blockedScripts.add(key);
        
        const truncated = truncateContent(content);
        const features = extractFeatures(content);
        
        console.group(`[脚本拦截器] 🚫 ${interceptor} 拦截`);
        console.log(`   关键词: "${keyword}"`);
        console.log(`   特征: ${features}`);
        if (source) console.log(`   来源: ${source}`);
        console.log(`   内容预览: ${truncated}`);
        console.groupEnd();
    }

    function checkNode(node) {
        if (!node || processedNodes.has(node)) return null;
        const content = node.textContent || '';
        const src = node.src || '';
        for (const kw of keywordsToBlock) {
            if (content.includes(kw)) return { kw, content, type: 'content', src: null };
            if (src.includes(kw)) return { kw, content: src, type: 'src', src };
        }
        return null;
    }

    // ==================== 1. createElement ====================
    console.log('[脚本拦截器] 🛡️ 部署 createElement 拦截器');
    const originalCreateElement = document.createElement;
    
    document.createElement = function(tagName, options) {
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
                        logBlock('createElement.src', kw, value, '外部脚本创建');
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
                        logBlock('createElement.innerHTML', kw, value, '内联脚本创建');
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
                        logBlock('createElement.textContent', kw, value, '内联脚本创建');
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

    // ==================== 2. MutationObserver ====================
    console.log('[脚本拦截器] 👁️ 部署 MutationObserver');
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (processedNodes.has(node)) return;
                
                const result = checkNode(node);
                if (result) {
                    logBlock('MutationObserver', result.kw, result.content, 
                        result.type === 'src' ? `外部脚本 (${node.nodeName})` : `${node.nodeName}节点`);
                    node.remove();
                    processedNodes.add(node);
                    return;
                }
                
                if (node.nodeName === 'SCRIPT') {
                    const src = node.src || '';
                    const text = node.textContent || '';
                    for (const kw of keywordsToBlock) {
                        if (src.includes(kw)) {
                            logBlock('MutationObserver', kw, src, '外部脚本标签');
                            node.remove();
                            processedNodes.add(node);
                            break;
                        }
                        if (text.includes(kw)) {
                            logBlock('MutationObserver', kw, text, '内联脚本标签');
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
    const originalAppendChild = Node.prototype.appendChild;
    Node.prototype.appendChild = function(node) {
        if (!node || processedNodes.has(node)) return originalAppendChild.call(this, node);
        const result = checkNode(node);
        if (result) {
            logBlock('appendChild', result.kw, result.content, 
                result.type === 'src' ? `外部脚本 (${node.nodeName})` : `${node.nodeName}节点`);
            processedNodes.add(node);
            return node;
        }
        return originalAppendChild.call(this, node);
    };

    // ==================== 4. insertBefore ====================
    console.log('[脚本拦截器] 📌 部署 insertBefore 拦截器');
    const originalInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function(newNode, referenceNode) {
        if (!newNode || processedNodes.has(newNode)) return originalInsertBefore.call(this, newNode, referenceNode);
        const result = checkNode(newNode);
        if (result) {
            logBlock('insertBefore', result.kw, result.content, 
                result.type === 'src' ? `外部脚本 (${newNode.nodeName})` : `${newNode.nodeName}节点`);
            processedNodes.add(newNode);
            return newNode;
        }
        return originalInsertBefore.call(this, newNode, referenceNode);
    };

    // ==================== 5. replaceChild ====================
    console.log('[脚本拦截器] 🔄 部署 replaceChild 拦截器');
    const originalReplaceChild = Node.prototype.replaceChild;
    Node.prototype.replaceChild = function(newChild, oldChild) {
        if (!newChild || processedNodes.has(newChild)) return originalReplaceChild.call(this, newChild, oldChild);
        const result = checkNode(newChild);
        if (result) {
            logBlock('replaceChild', result.kw, result.content, 
                result.type === 'src' ? `外部脚本 (${newChild.nodeName})` : `${newChild.nodeName}节点`);
            processedNodes.add(newChild);
            return oldChild;
        }
        return originalReplaceChild.call(this, newChild, oldChild);
    };

    // ==================== 6. document.write ====================
    console.log('[脚本拦截器] ✍️ 部署 document.write 拦截器');
    const originalWrite = document.write;
    const originalWriteln = document.writeln;
    
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
    const originalEval = window.eval;
    window.eval = function(code) {
        if (typeof code === 'string') {
            for (const kw of keywordsToBlock) {
                if (code.includes(kw)) {
                    logBlock('eval', kw, code, 'eval执行');
                    return;
                }
            }
        }
        return originalEval.call(this, code);
    };

    // ==================== 8. Function ====================
    console.log('[脚本拦截器] 🧠 部署 Function 拦截器');
    const originalFunction = window.Function;
    window.Function = function(...args) {
        const code = args[args.length - 1] || '';
        if (typeof code === 'string') {
            for (const kw of keywordsToBlock) {
                if (code.includes(kw)) {
                    logBlock('Function', kw, code, 'new Function构造函数');
                    return function() {};
                }
            }
        }
        return originalFunction.apply(this, args);
    };
    Object.setPrototypeOf(window.Function, originalFunction);

    // ==================== 9. setTimeout ====================
    console.log('[脚本拦截器] ⏱️ 部署 setTimeout 拦截器');
    const originalSetTimeout = window.setTimeout;
    window.setTimeout = function(handler, timeout, ...args) {
        if (typeof handler === 'string') {
            for (const kw of keywordsToBlock) {
                if (handler.includes(kw)) {
                    logBlock('setTimeout', kw, handler, '字符串形式setTimeout');
                    return 0;
                }
            }
        }
        return originalSetTimeout.call(this, handler, timeout, ...args);
    };

    // ==================== 10. setInterval ====================
    console.log('[脚本拦截器] ⏱️ 部署 setInterval 拦截器');
    const originalSetInterval = window.setInterval;
    window.setInterval = function(handler, interval, ...args) {
        if (typeof handler === 'string') {
            for (const kw of keywordsToBlock) {
                if (handler.includes(kw)) {
                    logBlock('setInterval', kw, handler, '字符串形式setInterval');
                    return 0;
                }
            }
        }
        return originalSetInterval.call(this, handler, interval, ...args);
    };

    // ==================== 11. Worker ====================
    console.log('[脚本拦截器] 👷 部署 Worker 拦截器');
    const originalWorker = window.Worker;
    if (originalWorker) {
        window.Worker = function(url, options) {
            const urlStr = typeof url === 'string' ? url : url.href || '';
            for (const kw of keywordsToBlock) {
                if (urlStr.includes(kw)) {
                    logBlock('Worker', kw, urlStr, 'Worker线程创建');
                    return { postMessage(){}, terminate(){}, addEventListener(){}, removeEventListener(){}, 
                            dispatchEvent(){return true}, onmessage:null, onerror:null };
                }
            }
            return new originalWorker(url, options);
        };
        window.Worker.prototype = originalWorker.prototype;
    }

    // ==================== 12. SharedWorker ====================
    console.log('[脚本拦截器] 👥 部署 SharedWorker 拦截器');
    const originalSharedWorker = window.SharedWorker;
    if (originalSharedWorker) {
        window.SharedWorker = function(url, options) {
            const urlStr = typeof url === 'string' ? url : url.href || '';
            for (const kw of keywordsToBlock) {
                if (urlStr.includes(kw)) {
                    logBlock('SharedWorker', kw, urlStr, 'SharedWorker线程创建');
                    return { port: { postMessage(){}, close(){}, start(){}, addEventListener(){}, removeEventListener(){} }, onerror:null };
                }
            }
            return new originalSharedWorker(url, options);
        };
        window.SharedWorker.prototype = originalSharedWorker.prototype;
    }

    // ==================== 13. ServiceWorker ====================
    console.log('[脚本拦截器] 🔧 部署 ServiceWorker 拦截器');
    if (navigator.serviceWorker && navigator.serviceWorker.register) {
        const originalRegister = navigator.serviceWorker.register;
        navigator.serviceWorker.register = function(scriptURL, options) {
            const urlStr = typeof scriptURL === 'string' ? scriptURL : scriptURL.href || '';
            for (const kw of keywordsToBlock) {
                if (urlStr.includes(kw)) {
                    logBlock('ServiceWorker', kw, urlStr, 'ServiceWorker注册');
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
                                logBlock('module脚本', kw, node.src, 'module外部脚本');
                                node.remove();
                                break;
                            }
                        }
                    }
                    if (node.textContent) {
                        for (const kw of keywordsToBlock) {
                            if (node.textContent.includes(kw)) {
                                logBlock('module脚本', kw, node.textContent, 'module内联脚本');
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
                            logBlock('data URI', kw, content, 'data URI脚本');
                            node.remove();
                            break;
                        }
                    }
                }
            });
        });
    });
    dataURIObserver.observe(document.documentElement, { childList: true, subtree: true });

    // ==================== 16. Cloudflare 专用 ====================
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
            get: function() { return null; },
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
            get: function() { return null; },
            configurable: false
        });
    }

    // ==================== 17. 初始清理 ====================
    console.log('[脚本拦截器] 🧹 执行初始清理');
    setTimeout(function() {
        document.querySelectorAll('script').forEach(function(script) {
            const content = script.textContent || '';
            const src = script.src || '';
            for (const kw of keywordsToBlock) {
                if (content.includes(kw)) {
                    logBlock('初始清理', kw, content, '已存在的内联脚本');
                    script.remove();
                    break;
                }
                if (src.includes(kw)) {
                    logBlock('初始清理', kw, src, '已存在的外部脚本');
                    script.remove();
                    break;
                }
            }
        });
        
        document.querySelectorAll('div[style*="display: none"]').forEach(function(div) {
            const content = div.textContent || '';
            for (const kw of keywordsToBlock) {
                if (content.includes(kw)) {
                    logBlock('初始清理', kw, content, '隐藏div');
                    div.remove();
                    break;
                }
            }
        });
    }, 0);

    console.log('[脚本拦截器] ✅ 所有拦截器部署完成，共 ' + keywordsToBlock.length + ' 个关键词');
    console.log('[脚本拦截器] 📊 已部署策略: createElement, MutationObserver, appendChild, insertBefore, replaceChild, document.write, eval, Function, setTimeout, setInterval, Worker, SharedWorker, ServiceWorker, module, data URI, Cloudflare');
})();