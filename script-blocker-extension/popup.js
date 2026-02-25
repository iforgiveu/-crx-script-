// popup.js
document.addEventListener('DOMContentLoaded', function() {
    const rulesContainer = document.getElementById('rulesContainer');
    const currentUrlDiv = document.getElementById('currentUrl');
    const addRuleBtn = document.getElementById('addRuleBtn');
    const openOptionsLink = document.getElementById('openOptions');

    // 获取当前标签页的URL
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const currentUrl = tabs[0].url;
        currentUrlDiv.textContent = `当前网址: ${currentUrl.substring(0, 50)}${currentUrl.length > 50 ? '...' : ''}`;
        currentUrlDiv.title = currentUrl;
    });

    // 加载规则并显示
    function loadRules() {
        chrome.storage.local.get(['scriptBlockerRules'], function(result) {
            const rules = result.scriptBlockerRules || [];
            console.log('[Popup] 加载的规则:', rules);
            displayRules(rules);
        });
    }

    // 显示规则列表
    function displayRules(rules) {
        if (rules.length === 0) {
            rulesContainer.innerHTML = '<div class="no-rules">暂无规则，点击"添加新规则"创建</div>';
            return;
        }

        let html = '';
        rules.forEach((rule, index) => {
            const ruleName = rule.name || '未命名规则';
            const matchType = rule.matchType || 'simple';
            const sitePatterns = rule.sitePatterns || [];
            const keywords = rule.keywords || [];
            
            // 格式化显示网站模式
            let siteDisplay = '';
            if (sitePatterns.length === 0) {
                siteDisplay = '未设置';
            } else if (sitePatterns.length === 1) {
                siteDisplay = sitePatterns[0];
            } else {
                siteDisplay = sitePatterns.slice(0, 2).join(', ') + (sitePatterns.length > 2 ? ` 等${sitePatterns.length}个` : '');
            }
            
            // 匹配方式图标
            let matchIcon = '🔍';
            let matchText = '';
            if (matchType === 'simple') {
                matchIcon = '✨';
                matchText = '通配';
            } else if (matchType === 'contains') {
                matchIcon = '📌';
                matchText = '包含';
            } else if (matchType === 'regex') {
                matchIcon = '⚡';
                matchText = '正则';
            }
            
            // 关键词显示（直接显示内容，不超过一定长度）
            let keywordsDisplay = '';
            if (keywords.length === 0) {
                keywordsDisplay = '无关键词';
            } else {
                // 最多显示3个关键词，后面的用等表示
                const maxShow = 3;
                const showKeywords = keywords.slice(0, maxShow);
                keywordsDisplay = showKeywords.join('、');
                if (keywords.length > maxShow) {
                    keywordsDisplay += ` 等${keywords.length}个`;
                }
                
                // 如果太长就截断
                if (keywordsDisplay.length > 50) {
                    keywordsDisplay = keywordsDisplay.substring(0, 47) + '...';
                }
            }
            
            html += `
                <div class="rule-item ${rule.enabled ? '' : 'disabled'}" data-index="${index}">
                    <div class="rule-info">
                        <div class="rule-name">
                            <strong>${ruleName}</strong>
                            <span class="status-badge ${rule.enabled ? 'status-active' : 'status-inactive'}">
                                ${rule.enabled ? '启用' : '禁用'}
                            </span>
                        </div>
                        <div class="rule-site" title="${sitePatterns.join('\n')}">
                            ${matchIcon} ${matchText} ${siteDisplay}
                        </div>
                        <div class="rule-keywords" title="${keywords.join('\n')}">
                            🔑 ${keywordsDisplay}
                        </div>
                    </div>
                    <div class="rule-actions">
                        <button class="btn-toggle" data-index="${index}">${rule.enabled ? '禁用' : '启用'}</button>
                        <button class="btn-edit" data-index="${index}">编辑</button>
                        <button class="btn-delete" data-index="${index}">删除</button>
                    </div>
                </div>
            `;
        });
        
        rulesContainer.innerHTML = html;

        // 添加事件监听
        document.querySelectorAll('.btn-toggle').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = this.dataset.index;
                toggleRule(index);
            });
        });

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = this.dataset.index;
                editRule(index);
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = this.dataset.index;
                deleteRule(index);
            });
        });
    }

    // 切换规则启用状态
    function toggleRule(index) {
        chrome.storage.local.get(['scriptBlockerRules'], function(result) {
            const rules = result.scriptBlockerRules || [];
            rules[index].enabled = !rules[index].enabled;
            chrome.storage.local.set({ scriptBlockerRules: rules }, function() {
                loadRules();
            });
        });
    }

    // 编辑规则
    function editRule(index) {
        chrome.storage.local.get(['scriptBlockerRules'], function(result) {
            const rules = result.scriptBlockerRules || [];
            const rule = rules[index];
            
            chrome.runtime.openOptionsPage(() => {
                chrome.storage.local.set({ editingRule: { index, rule } });
            });
        });
    }

    // 删除规则
    function deleteRule(index) {
        if (confirm('确定要删除这条规则吗？')) {
            chrome.storage.local.get(['scriptBlockerRules'], function(result) {
                const rules = result.scriptBlockerRules || [];
                rules.splice(index, 1);
                chrome.storage.local.set({ scriptBlockerRules: rules }, function() {
                    loadRules();
                });
            });
        }
    }

    // 添加新规则
    addRuleBtn.addEventListener('click', function() {
        chrome.runtime.openOptionsPage();
    });

    // 打开选项页面
    openOptionsLink.addEventListener('click', function(e) {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
    });

    // 初始化加载
    loadRules();
});