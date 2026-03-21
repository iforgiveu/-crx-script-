// lockconsole.js

(function() {
    'use strict';
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

//'error',
/* const methods = ['log', 'warn','info', 'debug', 'table', 'trace', 'dir', 'dirxml', 'group', 'groupCollapsed', 'groupEnd', 'time', 'timeEnd', 'assert', 'count', 'clear'];
methods.forEach(key => {
    if (typeof nativeConsole[key] === 'function') {
        lockProperty(nativeConsole, key, nativeConsole[key].bind(nativeConsole));
    }
}); */
    Object.keys(nativeConsole).forEach(key => {
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
    console.log('🛡️ [锁定] console 全系方法 已锁定', performance.now());
})();
