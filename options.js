// options.js
document.addEventListener('DOMContentLoaded', function() {
    // ==================== 标签页切换 ====================
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            const tabId = 'tab-' + this.dataset.tab;
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // ==================== 规则管理 ====================
    const ruleNameInput = document.getElementById('ruleName');
    const matchTypeSelect = document.getElementById('matchType');
    const sitePatternsInput = document.getElementById('sitePatterns');
    const keywordsTextarea = document.getElementById('keywords');
    const enabledCheckbox = document.getElementById('enabled');
    const saveRuleBtn = document.getElementById('saveRuleBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const editingIndicator = document.getElementById('editingIndicator');
    const rulesListDiv = document.getElementById('rulesList');

    let rules = [];
    let editingIndex = -1;

    // 监听匹配类型变化
    matchTypeSelect.addEventListener('change', function() {
        if (this.value === '*') {
            sitePatternsInput.value = '*';
        }
    });

    // 加载规则
    function loadRules() {
        chrome.storage.local.get(['scriptBlockerRules'], function(result) {
            let loadedRules = result.scriptBlockerRules || [];
            
            rules = loadedRules.map((rule, index) => {
                if (!rule.name) rule.name = `规则 ${index + 1}`;
                if (!rule.matchType) rule.matchType = 'simple';
                if (rule.sitePattern && !rule.sitePatterns) {
                    rule.sitePatterns = [rule.sitePattern];
                    delete rule.sitePattern;
                }
                if (!rule.sitePatterns) rule.sitePatterns = ['*'];
                if (!rule.keywords) rule.keywords = [];
                return rule;
            });
            
            if (JSON.stringify(loadedRules) !== JSON.stringify(rules)) {
                saveRules();
            }
            
            displayRules();
        });
    }

    // 显示规则列表
    function displayRules() {
        if (rules.length === 0) {
            rulesListDiv.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">暂无规则，请点击上方添加新规则</p>';
            return;
        }

        let html = '';
        rules.forEach((rule, index) => {
            const matchType = rule.matchType || 'simple';
            const sitePatterns = rule.sitePatterns || [];
            const keywords = rule.keywords || [];
            
            let siteDisplay = sitePatterns.length === 0 ? '未设置' : 
                (sitePatterns.length === 1 ? sitePatterns[0] : sitePatterns.length + ' 个网址');
            
            let matchIcon = matchType === 'simple' ? '✨' : (matchType === 'contains' ? '📌' : '⚡');
            let matchText = matchType === 'simple' ? '匹配' : (matchType === 'contains' ? '包含' : '正则');
            
            let keywordsDisplay = keywords.length === 0 ? '无关键词' : 
                keywords.slice(0, 3).join('、') + (keywords.length > 3 ? ` 等${keywords.length}个` : '');
            
            html += `
                <div class="rule-item ${rule.enabled ? 'enabled' : 'disabled'}" data-index="${index}">
                    <div class="rule-info">
                        <div class="rule-name">
                            <strong>${escapeHtml(rule.name)}</strong>
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
        
        rulesListDiv.innerHTML = html;
        bindRuleEvents();
    }

    function bindRuleEvents() {
        document.querySelectorAll('.btn-toggle').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const index = this.dataset.index;
                toggleRule(parseInt(index));
            });
        });

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const index = this.dataset.index;
                editRule(parseInt(index), rules[parseInt(index)]);
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const index = this.dataset.index;
                deleteRule(parseInt(index));
            });
        });
    }

    function toggleRule(index) {
        rules[index].enabled = !rules[index].enabled;
        saveRules();
    }

    function editRule(index, rule) {
        editingIndex = index;
        
        ruleNameInput.value = rule.name || '';
        matchTypeSelect.value = rule.matchType || 'simple';
        sitePatternsInput.value = (rule.sitePatterns || []).join('\n');
        keywordsTextarea.value = (rule.keywords || []).join('\n');
        enabledCheckbox.checked = rule.enabled !== false;
        
        editingIndicator.style.display = 'block';
        editingIndicator.textContent = `✏️ 正在编辑: ${rule.name || '未命名规则'}`;
        cancelEditBtn.style.display = 'inline-block';
        saveRuleBtn.textContent = '更新规则';
        
        document.querySelector('.tab[data-tab="rules"]').click();
    }

    function deleteRule(index) {
        if (confirm('确定要删除这条规则吗？')) {
            rules.splice(index, 1);
            saveRules();
            if (editingIndex === index) cancelEdit();
        }
    }

    function cancelEdit() {
        editingIndex = -1;
        ruleNameInput.value = '';
        matchTypeSelect.value = 'simple';
        sitePatternsInput.value = '';
        keywordsTextarea.value = '';
        enabledCheckbox.checked = true;
        editingIndicator.style.display = 'none';
        cancelEditBtn.style.display = 'none';
        saveRuleBtn.textContent = '保存规则';
    }

    function saveCurrentRule() {
        const name = ruleNameInput.value.trim();
        if (!name) { alert('请输入规则名称'); return; }
        
        const matchType = matchTypeSelect.value;
        const sitePatternsText = sitePatternsInput.value.trim();
        const keywordsText = keywordsTextarea.value.trim();
        
        if (!sitePatternsText) { alert('请至少输入一个网站模式'); return; }
        if (!keywordsText) { alert('请至少输入一个关键词'); return; }

        const sitePatterns = sitePatternsText.split(/[\n,]+/).map(s => s.trim()).filter(s => s.length > 0);
        const keywords = keywordsText.split('\n').map(k => k.trim()).filter(k => k.length > 0);

        const newRule = {
            name: name,
            matchType: matchType,
            sitePatterns: sitePatterns,
            keywords: keywords,
            enabled: enabledCheckbox.checked
        };

        if (editingIndex >= 0) {
            rules[editingIndex] = newRule;
            cancelEdit();
        } else {
            rules.push(newRule);
        }

        saveRules();
    }

    function saveRules() {
        chrome.storage.local.set({ scriptBlockerRules: rules }, displayRules);
    }

    // ==================== 白名单管理（增强版）====================
    const whitelistTypeSelect = document.getElementById('whitelistType');
    const whitelistPatternInput = document.getElementById('whitelistPattern');
    const saveWhitelistBtn = document.getElementById('saveWhitelistBtn');
    const cancelWhitelistEditBtn = document.getElementById('cancelWhitelistEditBtn');
    const whitelistEditingIndicator = document.getElementById('whitelistEditingIndicator');

    let whitelistEditingIndex = -1;
    let whitelistEditingType = null;

    // 加载白名单
    function loadWhitelists() {
        chrome.storage.local.get(['globalWhitelist', 'secondaryWhitelist'], function(result) {
            displayWhitelist('global', result.globalWhitelist || []);
            displayWhitelist('secondary', result.secondaryWhitelist || []);
        });
    }

    // 显示白名单列表
    function displayWhitelist(type, list) {
        const container = document.getElementById(type + 'WhitelistList');
        if (!container) return;
        
        let html = '';
        
        list.forEach((item, index) => {
            const escapedItem = escapeHtml(item);
            html += `
                <div class="whitelist-item" data-type="${type}" data-index="${index}">
                    <span class="pattern">${escapedItem}</span>
                    <div class="actions">
                        <button class="edit-whitelist" data-type="${type}" data-index="${index}">编辑</button>
                        <button class="delete-whitelist" data-type="${type}" data-index="${index}">删除</button>
                    </div>
                </div>
            `;
        });
        
        if (list.length === 0) {
            html = '<div class="empty">暂无白名单规则</div>';
        }
        
        container.innerHTML = html;
        bindWhitelistEvents();
    }

    // 绑定白名单事件
    function bindWhitelistEvents() {
        document.querySelectorAll('.delete-whitelist').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const type = this.dataset.type;
                const index = parseInt(this.dataset.index);
                deleteWhitelistItem(type, index);
            });
        });

        document.querySelectorAll('.edit-whitelist').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const type = this.dataset.type;
                const index = parseInt(this.dataset.index);
                startWhitelistEdit(type, index);
            });
        });
    }

    function startWhitelistEdit(type, index) {
        const key = type === 'global' ? 'globalWhitelist' : 'secondaryWhitelist';
        
        chrome.storage.local.get([key], function(result) {
            const list = result[key] || [];
            const item = list[index];
            
            if (!item) return;
            
            whitelistEditingIndex = index;
            whitelistEditingType = type;
            
            whitelistTypeSelect.value = type;
            whitelistPatternInput.value = item;
            
            whitelistEditingIndicator.style.display = 'block';
            whitelistEditingIndicator.textContent = `✏️ 正在编辑 ${type === 'global' ? '一级' : '次级'} 白名单: ${item}`;
            cancelWhitelistEditBtn.style.display = 'inline-block';
            saveWhitelistBtn.textContent = '更新白名单';
            
            document.querySelector('.tab[data-tab="whitelist"]').click();
            whitelistPatternInput.focus();
        });
    }

    function cancelWhitelistEdit() {
        whitelistEditingIndex = -1;
        whitelistEditingType = null;
        
        whitelistTypeSelect.value = 'global';
        whitelistPatternInput.value = '';
        
        whitelistEditingIndicator.style.display = 'none';
        cancelWhitelistEditBtn.style.display = 'none';
        saveWhitelistBtn.textContent = '保存白名单';
    }

    function saveWhitelist() {
        const type = whitelistTypeSelect.value;
        const pattern = whitelistPatternInput.value.trim();
        
        if (!pattern) {
            alert('请输入白名单规则');
            return;
        }
        
        const key = type === 'global' ? 'globalWhitelist' : 'secondaryWhitelist';
        
        chrome.storage.local.get([key], function(result) {
            const list = result[key] || [];
            
            const duplicateIndex = list.findIndex((item, idx) => 
                item === pattern && !(whitelistEditingType === type && whitelistEditingIndex === idx)
            );
            
            if (duplicateIndex !== -1) {
                alert('该规则已存在');
                return;
            }
            
            if (whitelistEditingIndex !== -1 && whitelistEditingType === type) {
                list[whitelistEditingIndex] = pattern;
            } else {
                list.push(pattern);
            }
            
            chrome.storage.local.set({ [key]: list }, function() {
                cancelWhitelistEdit();
                loadWhitelists();
            });
        });
    }

    function deleteWhitelistItem(type, index) {
        if (!confirm('确定要删除这条白名单规则吗？')) return;
        
        const key = type === 'global' ? 'globalWhitelist' : 'secondaryWhitelist';
        
        chrome.storage.local.get([key], function(result) {
            const list = result[key] || [];
            list.splice(index, 1);
            
            chrome.storage.local.set({ [key]: list }, function() {
                if (whitelistEditingType === type && whitelistEditingIndex === index) {
                    cancelWhitelistEdit();
                }
                loadWhitelists();
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

    // ==================== 导入导出功能 ====================
    function exportRules() {
        if (rules.length === 0) {
            if (!confirm('当前没有规则，确定要导出空文件吗？')) {
                return;
            }
        }
        
        chrome.storage.local.get(['scriptBlockerRules', 'globalWhitelist', 'secondaryWhitelist'], function(result) {
            const exportData = {
                version: '1.1',
                exportTime: new Date().toISOString(),
                rules: result.scriptBlockerRules || [],
                globalWhitelist: result.globalWhitelist || [],
                secondaryWhitelist: result.secondaryWhitelist || []
            };
            
            const jsonStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `script-blocker-rules-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert(`✅ 导出成功！共导出 ${exportData.rules.length} 条规则，${exportData.globalWhitelist.length} 条一级白名单，${exportData.secondaryWhitelist.length} 条次级白名单。`);
        });
    }

    function importRules() {
        const fileInput = document.getElementById('importFileInput');
        fileInput.click();
        
        fileInput.onchange = function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            
            reader.onload = function(event) {
                try {
                    const importData = JSON.parse(event.target.result);
                    
                    if (!importData.rules && !importData.globalWhitelist && !importData.secondaryWhitelist) {
                        throw new Error('无效的规则文件格式');
                    }
                    
                    const ruleCount = importData.rules ? importData.rules.length : 0;
                    const globalCount = importData.globalWhitelist ? importData.globalWhitelist.length : 0;
                    const secondaryCount = importData.secondaryWhitelist ? importData.secondaryWhitelist.length : 0;
                    
                    const confirmMsg = `即将导入以下内容：\n` +
                        `📋 拦截规则：${ruleCount} 条\n` +
                        `🌍 一级白名单：${globalCount} 条\n` +
                        `🔵 次级白名单：${secondaryCount} 条\n\n` +
                        `⚠️ 注意：导入会覆盖当前所有规则和白名单！\n\n` +
                        `确定要继续吗？`;
                    
                    if (!confirm(confirmMsg)) {
                        fileInput.value = '';
                        return;
                    }
                    
                    const dataToSave = {};
                    
                    if (importData.rules) {
                        dataToSave.scriptBlockerRules = importData.rules.map((rule, index) => {
                            const name = rule.name || `导入规则 ${index + 1}`;
                            const matchType = rule.matchType || 'simple';
                            
                            let sitePatterns = [];
                            if (rule.sitePatterns && Array.isArray(rule.sitePatterns)) {
                                sitePatterns = rule.sitePatterns;
                            } else if (rule.sitePattern && typeof rule.sitePattern === 'string') {
                                sitePatterns = [rule.sitePattern];
                            } else if (rule.sitePatterns && typeof rule.sitePatterns === 'string') {
                                sitePatterns = rule.sitePatterns.split('\n').map(s => s.trim()).filter(s => s.length > 0);
                            } else {
                                sitePatterns = ['*'];
                            }
                            
                            let keywords = [];
                            if (rule.keywords && Array.isArray(rule.keywords)) {
                                keywords = rule.keywords;
                            } else if (rule.keywords && typeof rule.keywords === 'string') {
                                keywords = rule.keywords.split('\n').map(k => k.trim()).filter(k => k.length > 0);
                            } else {
                                keywords = [];
                            }
                            
                            const enabled = rule.enabled !== false;
                            
                            return {
                                name: name,
                                matchType: matchType,
                                sitePatterns: sitePatterns,
                                keywords: keywords,
                                enabled: enabled
                            };
                        });
                    }
                    
                    if (importData.globalWhitelist) {
                        dataToSave.globalWhitelist = Array.isArray(importData.globalWhitelist) ? importData.globalWhitelist : [];
                    }
                    
                    if (importData.secondaryWhitelist) {
                        dataToSave.secondaryWhitelist = Array.isArray(importData.secondaryWhitelist) ? importData.secondaryWhitelist : [];
                    }
                    
                    chrome.storage.local.set(dataToSave, function() {
                        alert(`✅ 导入成功！\n\n` +
                            `已导入 ${ruleCount} 条规则\n` +
                            `${globalCount} 条一级白名单\n` +
                            `${secondaryCount} 条次级白名单`);
                        
                        loadRules();
                        loadWhitelists();
                        fileInput.value = '';
                    });
                    
                } catch (error) {
                    alert('❌ 导入失败：文件格式错误\n\n' + error.message);
                    console.error('导入错误:', error);
                    fileInput.value = '';
                }
            };
            
            reader.readAsText(file);
        };
    }

    // ==================== 事件绑定 ====================
    saveRuleBtn.addEventListener('click', saveCurrentRule);
    cancelEditBtn.addEventListener('click', cancelEdit);
    
    saveWhitelistBtn.addEventListener('click', saveWhitelist);
    cancelWhitelistEditBtn.addEventListener('click', cancelWhitelistEdit);
    
    whitelistPatternInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveWhitelist();
        }
    });
    
    whitelistTypeSelect.addEventListener('change', function() {
        if (whitelistEditingIndex !== -1) {
            if (!confirm('切换类型将取消当前编辑，确定吗？')) {
                this.value = whitelistEditingType;
                return;
            }
            cancelWhitelistEdit();
        }
    });
    
    document.getElementById('exportRulesBtn').addEventListener('click', exportRules);
    document.getElementById('importRulesBtn').addEventListener('click', importRules);

    loadRules();
    loadWhitelists();
});