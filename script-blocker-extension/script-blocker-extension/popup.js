// popup.js
document.addEventListener('DOMContentLoaded', function() {
    const rulesContainer = document.getElementById('rulesContainer');
    const currentUrlDiv = document.getElementById('currentUrl');
    const addRuleBtn = document.getElementById('addRuleBtn');
    const openOptionsLink = document.getElementById('openOptions');

    // 获取当前标签页的URL
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const currentUrl = tabs[0].url;
        currentUrlDiv.textContent = `当前网址: ${currentUrl.substring(0, 100)}${currentUrl.length > 100 ? '...' : ''}`;
        currentUrlDiv.title = currentUrl;
        
        // 检查白名单状态
        checkWhitelistStatus(currentUrl);
    });

    // 检查白名单状态
    function checkWhitelistStatus(url) {
        try {
            const urlObj = new URL(url);
            const host = urlObj.hostname;
            
            chrome.storage.local.get(['globalWhitelist', 'secondaryWhitelist'], function(result) {
                const globalList = result.globalWhitelist || [];
                const secondaryList = result.secondaryWhitelist || [];
                
                // 简单匹配（去掉 * 通配符）
                const inGlobal = globalList.some(p => 
                    url.includes(p.replace(/\*/g, '')) || 
                    host.includes(p.replace(/\*/g, ''))
                );
                
                const inSecondary = secondaryList.some(p => 
                    url.includes(p.replace(/\*/g, '')) || 
                    host.includes(p.replace(/\*/g, ''))
                );
                
                let statusHtml = '';
                if (inGlobal) {
                    statusHtml = '<div style="background:#dc3545;color:white;padding:8px;margin-bottom:10px;border-radius:4px;">🌍 当前网站在全局白名单中，插件已禁用</div>';
                } else if (inSecondary) {
                    statusHtml = '<div style="background:#fd7e14;color:white;padding:8px;margin-bottom:10px;border-radius:4px;">🔵 当前网站在次级白名单中，部分功能禁用</div>';
                }
                
                if (statusHtml) {
                    const statusDiv = document.createElement('div');
                    statusDiv.innerHTML = statusHtml;
                    document.body.insertBefore(statusDiv, document.body.firstChild);
                }
            });
        } catch (e) {
            // URL解析失败，忽略
        }
    }

    // 加载规则并显示
    function loadRules() {
        chrome.storage.local.get(['scriptBlockerRules'], function(result) {
            const rules = result.scriptBlockerRules || [];
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
            
            let siteDisplay = '';
            if (sitePatterns.length === 0) {
                siteDisplay = '未设置';
            } else if (sitePatterns.length === 1) {
                siteDisplay = sitePatterns[0];
            } else {
                siteDisplay = sitePatterns.slice(0, 2).join(', ') + (sitePatterns.length > 2 ? ` 等${sitePatterns.length}个` : '');
            }
            
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
            
            let keywordsDisplay = '';
            if (keywords.length === 0) {
                keywordsDisplay = '无关键词';
            } else {
                const maxShow = 2;
                const showKeywords = keywords.slice(0, maxShow);
                keywordsDisplay = showKeywords.join('、');
                if (keywords.length > maxShow) {
                    keywordsDisplay += ` 等${keywords.length}个`;
                }
                if (keywordsDisplay.length > 40) {
                    keywordsDisplay = keywordsDisplay.substring(0, 37) + '...';
                }
            }
            
            html += `
                <div class="rule-item ${rule.enabled ? '' : 'disabled'}" data-index="${index}">
                    <div class="rule-info">
                        <div class="rule-name">
                            <strong>${escapeHtml(ruleName)}</strong>
                            <span class="status-badge ${rule.enabled ? 'status-active' : 'status-inactive'}">
                                ${rule.enabled ? '启用' : '禁用'}
                            </span>
                        </div>
                        <div class="rule-site" title="${escapeHtml(sitePatterns.join('\n'))}">
                            ${matchIcon} ${matchText} ${escapeHtml(siteDisplay)}
                        </div>
                        <div class="rule-keywords" title="${escapeHtml(keywords.join('\n'))}">
                            🔑 ${escapeHtml(keywordsDisplay)}
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

        // 绑定事件
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

    function escapeHtml(text) {
        return String(text).replace(/&/g, '&amp;')
                          .replace(/</g, '&lt;')
                          .replace(/>/g, '&gt;')
                          .replace(/"/g, '&quot;')
                          .replace(/'/g, '&#039;');
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