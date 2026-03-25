// -*- coding: utf-8 -*-
// lockconsole.js

(function() {
    'use strict';
    //return;
	// 1. 获取原生的 console 引用
    const nativeConsole = window.console;
    // 2. 定义一个保护函数，用来锁死属性
    function lockProperty(obj, prop, value) {
        try {
            Object.defineProperty(obj, prop, {
                value: value,
                writable: false,      // 不可修改值
                configurable: false,  // 不可删除、不可重新配置
                enumerable: true
            });
        } catch (e) {
            // 如果已经锁过或者报错，忽略
        }
    }
	Object.defineProperty(window.console, 'clear', {
    //value: function() {console.trace('[lockconsole]🚫已阻止清空控制台')},
    //value: function() {console.log('[lockconsole]🚫已阻止清空控制台')},
    value: function() {},
    writable: false,
    configurable: false
	});
	Object.defineProperty(console.log,'toString',{value:function(){return'function log() { [native code] }';},});

//'error',
/* const methods = ['log', 'warn','info', 'debug', 'table', 'trace', 'dir', 'dirxml', 'group', 'groupCollapsed', 'groupEnd', 'time', 'timeEnd', 'assert', 'count', 'clear'];
methods.forEach(key => {
    if (typeof nativeConsole[key] === 'function') {
        lockProperty(nativeConsole, key, nativeConsole[key].bind(nativeConsole));
    }
}); */
    Object.keys(nativeConsole).forEach(key => {//锁定
        if (typeof nativeConsole[key] === 'function') {
            if(key!="error"){lockProperty(nativeConsole, key, nativeConsole[key].bind(nativeConsole));}
        }
    });
	
    // 阻止执行 delete window.console 或者 window.console = {}
    try {
        Object.defineProperty(window, 'console', {
            value: nativeConsole,
            writable: false,
            configurable: false
        });
    } catch (e) {}
	
(()=>{
let whitelist=["bilibili.com",'douyin.com','index.m3u8','urlsec.qq.com','loading.html','.hdslb.com'];
let hosted=window.location.host;
if (whitelist.some(host => hosted.includes(host))) return;
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
function countKeywords(code,keywords){let count=0;for(const keyword of keywords){if(code.includes(keyword))count++;}
return count;}
try{window._fakeJsonp=new Proxy([],arrayHandler);Object.defineProperty(window,'webpackJsonp',{get(){return window._fakeJsonp;},set(newValue){
},configurable:true,enumerable:true});}catch(e){console.error("脚本初始化失败:",e);}})();})();

/* (function(){'use strict';const NativeError=window.Error;window.Error=function(...args){const errorObj=new NativeError(...args);const originalStack=errorObj.stack;Object.defineProperty(errorObj,'stack',{get:function(){return"\n 🔒 Stack trace is protected by UserScript.\n    at Anonymous (protected:1:1)\n";},set:function(value){return;},configurable:true,enumerable:true});return errorObj;};window.Error.prototype=NativeError.prototype;window.Error.length=NativeError.length;const errorTypes=['TypeError','ReferenceError','SyntaxError','RangeError'];errorTypes.forEach(type=>{if(window[type]){const NativeType=window[type];window[type]=function(...args){const errorObj=new NativeType(...args);Object.defineProperty(errorObj,'stack',{get:function(){return"[redacted stack trace]";},set:function(){},configurable:true});return errorObj;};window[type].prototype=NativeType.prototype;}});console.log('[脚本拦截器] ✅ 堆栈混淆模块已加载');})(); *//* 混淆堆栈信息避免某些网站的某些反调试相关检测，不过一般来说应该用不到，而且挺杀敌一千自损八百的*/

    console.log('🛡️ [锁定] console 全系方法 已锁定', performance.now());
})();
