// -*- coding: utf-8 -*-
// lockconsoleNOS.js//加了防刷屏。默认不注入使用，一般这个都容易触发反调试模块的控制台输出时间差测试从而提前小黑屋
(function() {
    'use strict';
    // --- 配置：防刷屏设置 ---
    const LIMIT_COUNT = 10;      // 刷屏次数
    const LIMIT_TIME = 1000;     // 刷屏时间（毫秒）
    const BAN_TIME = 3600000;    // 黑名单持续时间（1小时）
    // --- 防刷屏过滤器 ---
    const recordMap = new Map();
    const banMap = new Map();

    function getHash(str) {
        if (typeof str !== 'string') str = String(str);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return hash;
    }

    function createFilteredMethod(boundNativeMethod) {
        return function() {
            try {
                const msg = Array.from(arguments).map(arg => {
                    try { return typeof arg === 'object' ? JSON.stringify(arg) : String(arg); } 
                    catch(e) { return String(arg); }
                }).join(' ');
                const hash = getHash(msg);
                const now = Date.now();
                if (banMap.has(hash)) {
                    if (now < banMap.get(hash)) return;
                    banMap.delete(hash);
                    recordMap.delete(hash);
                }
                if (!recordMap.has(hash)) recordMap.set(hash, []);
                const timestamps = recordMap.get(hash);
                while (timestamps.length > 0 && timestamps[0] < now - LIMIT_TIME) {
                    timestamps.shift();
                }
                timestamps.push(now);
                if (timestamps.length >= LIMIT_COUNT) {
                    banMap.set(hash, now + BAN_TIME);
                    // 使用原生 error 输出警告
                    nativeConsole.error(`[反刷屏] 检测到高频重复信息，已屏蔽 1 小时：${msg.substring(0, 50)}...`);
                    return;
                }
                // 执行绑定的原生方法
                boundNativeMethod.apply(nativeConsole, arguments);
            } catch (e) {
                boundNativeMethod.apply(nativeConsole, arguments);
            }
        };
    }
    // --- 锁定逻辑开始 ---
    const nativeConsole = window.console;
    function lockProperty(obj, prop, value) {
        try {
            Object.defineProperty(obj, prop, {
                value: value,
                writable: false,
                configurable: false,
                enumerable: true
            });
        } catch (e) {}
    }

    // 1. 阻止清屏
    Object.defineProperty(window.console, 'clear', {
        //value: function() { console.trace('[lockconsole]🚫已阻止清空控制台'); },
        value: function() {},
        writable: false,
        configurable: false
    });
	Object.defineProperty(console.log,'toString',{value:function(){return'function log() { [native code] }';},});

    // 2. 反刷屏名单
    const antiSpamMethods = ['log', 'warn', 'info', 'debug', 'dir'];
    //锁定
    Object.keys(nativeConsole).forEach(key => {
        if (typeof nativeConsole[key] === 'function') {
            if (key === 'error') {
                return; 
            }
            // 先绑定 this，再传给包装函数或锁定
            const boundMethod = nativeConsole[key].bind(nativeConsole);
            // 对需要防刷屏的方法，传入【已绑定的方法】
            if (antiSpamMethods.includes(key)) {
                const filteredFunc = createFilteredMethod(boundMethod);
                lockProperty(nativeConsole, key, filteredFunc);
            } 
            // 其他方法直接锁定【已绑定的方法】
            else {
                lockProperty(nativeConsole, key, boundMethod);
            }
        }
    });

    // 3. 锁死 console 对象本身
    try {
        Object.defineProperty(window, 'console', {
            value: nativeConsole,
            writable: false,
            configurable: false
        });
    } catch (e) {}
(()=>{
console.log('[antidev模块拦截] 👷 部署 Worker拦截器',performance.now());const originalWorker=window.Worker;const originalSharedWorker=window.SharedWorker;const originalRegister=navigator.serviceWorker?.register;if(originalWorker){window.Worker=function(url,options){const urlStr=typeof url==='string'?url:(url&&url.href)||'';const workerInstance=new originalWorker(url,options);const filterWorkerMessage=(data)=>{if(!data||typeof data!=='object')return false;if(data.payload&&Array.isArray(data.payload)&&data.payload.length>40){return true;}
if(typeof data.time==='number'&&typeof data.id==='number'){return true;}
const keys=Object.keys(data);if(keys.length===0||(keys.length<=2&&(data.id!==undefined||data.time!==undefined))){if(keys.length===0)return true;}
return false;};const originalPostMessage=workerInstance.postMessage;workerInstance.postMessage=function(message){if(filterWorkerMessage(message))return;return originalPostMessage.apply(this,arguments);};const originalAddEventListener=workerInstance.addEventListener;workerInstance.addEventListener=function(type,listener,options){if(type==='message'){const wrappedListener=function(event){if(filterWorkerMessage(event.data))return;return listener.apply(this,arguments);};return originalAddEventListener.call(this,type,wrappedListener,options);}
return originalAddEventListener.apply(this,arguments);};let _onmessageHandler=null;try{Object.defineProperty(workerInstance,'onmessage',{set:function(handler){const wrappedHandler=function(e){if(filterWorkerMessage(e.data))return;if(typeof handler==='function')handler.call(this,e);};this._wrappedOnMessage=wrappedHandler;},get:function(){return this._wrappedOnMessage;},configurable:true});}catch(e){}
return workerInstance;};window.Worker.prototype=originalWorker.prototype;}
(function(){'use strict';console.log('[antidev模块拦截] 🔅部署 webpackJsonp 拦截器',performance.now(),'\n【目前可能无法阻止网站反调试模块失败后的刷屏干扰后备方案】');const TARGET_ID='Aso0';const ABSOLUTE_KEYWORDS=['DevtoolsDetector','window.devtoolsFormatters','performanceChecker','workerPerformanceChecker','debuggerChecker',];const JUMP_KEYWORDS=['location.href','123','keycode'];const REQUIRED_KEYWORDS=['devtool','123','detector','location.href'];const AUXILIARY_KEYWORDS=['ondevtoolclose','ondevtoolopen','keyCode','addEventListener','keydown','setInterval','setTimeout','disable','workerPerformanceChecker','Debugger'];const arrayHandler={set(target,prop,value,receiver){if(typeof value==='object'&&value!==null){filterModules(value);}
return Reflect.set(target,prop,value,receiver);}};function filterModules(data){if(Array.isArray(data)&&data.length>=2){const modules=data[1];if(typeof modules==='object'){for(const moduleId in modules){if(modules.hasOwnProperty(moduleId)&&typeof modules[moduleId]==='function'){const func=modules[moduleId];const codeString=func.toString();const isSmallModule=codeString.length<2000;const isTarget=moduleId===TARGET_ID;if(isSmallModule||isTarget){const foundRequired=[];const foundAuxiliary=[];const foundAbsolute=ABSOLUTE_KEYWORDS.filter(kw=>codeString.includes(kw));for(const kw of REQUIRED_KEYWORDS){if(codeString.includes(kw))foundRequired.push(kw);}
for(const kw of AUXILIARY_KEYWORDS){if(codeString.includes(kw))foundAuxiliary.push(kw);}
if(foundAbsolute.length>0||foundRequired.length>0||foundAuxiliary.length>0||isTarget){console.log(`%c[模块分析] ID: ${moduleId} | 长度: ${codeString.length}`,'color: #00a0e9; font-weight: bold;');if(foundAbsolute.length>0){console.log(`   ├─ ⚠️ 绝对特征: 命中 (${foundAbsolute.join(', ')})`);}
console.log(`   ├─ 核心词(${foundRequired.length}/${REQUIRED_KEYWORDS.length}):`,foundRequired.length>0?foundRequired.join(', '):'无');console.log(`   └─ 辅助词(${foundAuxiliary.length}/${AUXILIARY_KEYWORDS.length}):`,foundAuxiliary.length>0?foundAuxiliary.join(', '):'无');}}
let shouldBlock=false;let reason='';const hitAbsolute=ABSOLUTE_KEYWORDS.find(kw=>codeString.includes(kw));if(hitAbsolute){shouldBlock=true;reason=`命中绝对特征: ${hitAbsolute}`;}
else if(JUMP_KEYWORDS.every(kw=>codeString.includes(kw))){shouldBlock=true;reason=`命中恶意跳转组合: location.href + 123(F12)`;}
else if(moduleId===TARGET_ID){shouldBlock=true;reason=`命中目标 ID: ${TARGET_ID}`;}
else{const allRequiredPresent=REQUIRED_KEYWORDS.every(kw=>codeString.includes(kw));if(allRequiredPresent){shouldBlock=true;const matchAuxCount=countKeywords(codeString,AUXILIARY_KEYWORDS);reason=`命中 4 个核心特征，额外匹配 ${matchAuxCount} 个辅助特征`;}}
if(shouldBlock){console.log(`%c[拦截预览] 模块 ${moduleId} 的原始代码:`,'color: red; font-weight: bold;',performance.now());console.log(codeString);console.warn(`[Proxy 拦截] 移除模块: ${moduleId} -> 原因: ${reason}`);modules[moduleId]=function(e,t,n){};}}}}}}
function countKeywords(code,keywords){let count=0;for(const keyword of keywords){if(code.includes(keyword))count++;}return count;}
try{window._fakeJsonp=new Proxy([],arrayHandler);Object.defineProperty(window,'webpackJsonp',{get(){return window._fakeJsonp;},set(newValue){
},configurable:true,enumerable:true});}catch(e){console.error("脚本初始化失败:",e);}})();})();

    console.log('🛡️ [锁定] console 全系方法 已锁定 (error除外)', performance.now());
})();
