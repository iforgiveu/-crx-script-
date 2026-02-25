// options.js
document.addEventListener('DOMContentLoaded', function() {
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

    // 加载规则
    function loadRules() {
        chrome.storage.local.get(['scriptBlockerRules'], function(result) {
            let loadedRules = result.scriptBlockerRules || [];
            
            // 迁移旧规则到新格式
            rules = loadedRules.map((rule, index) => {
                // 确保有 name
                if (!rule.name) rule.name = `规则 ${index + 1}`;
                
                // 确保有 matchType
                if (!rule.matchType) rule.matchType = 'simple';
                
                // 转换旧的 sitePattern 到 sitePatterns
                if (rule.sitePattern && !rule.sitePatterns) {
                    rule.sitePatterns = [rule.sitePattern];
                    delete rule.sitePattern;
                }
                
                // 确保 sitePatterns 是数组
                if (!rule.sitePatterns) rule.sitePatterns = ['*'];
                
                // 确保 keywords 是数组
                if (!rule.keywords) rule.keywords = [];
                
                return rule;
            });
            
            // 如果有更新，保存回去
            if (JSON.stringify(loadedRules) !== JSON.stringify(rules)) {
                saveRules();
            }
            
            displayRules();
            
            // 检查是否有正在编辑的规则
            chrome.storage.local.get(['editingRule'], function(editResult) {
                if (editResult.editingRule) {
                    const { index, rule } = editResult.editingRule;
                    editRule(index, rule);
                    chrome.storage.local.remove('editingRule');
                }
            });
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
            
            // 格式化显示网站模式
            let siteDisplay = '';
            if (sitePatterns.length === 0) {
                siteDisplay = '未设置';
            } else if (sitePatterns.length === 1) {
                siteDisplay = sitePatterns[0];
            } else {
                siteDisplay = sitePatterns.length + ' 个模式';
            }
            
            // 匹配方式图标
            let matchIcon = '🔍';
            if (matchType === 'simple') matchIcon = '✨';
            else if (matchType === 'contains') matchIcon = '📌';
            else if (matchType === 'regex') matchIcon = '⚡';
            
            // 匹配方式文字
            let matchText = '';
            if (matchType === 'simple') matchText = '通配';
            else if (matchType === 'contains') matchText = '包含';
            else if (matchType === 'regex') matchText = '正则';
            
            html += `
                <div class="rule-item ${rule.enabled ? 'enabled' : 'disabled'}" data-index="${index}">
                    <div class="rule-info">
                        <div class="rule-name">
                            <strong>${rule.name || '未命名规则'}</strong>
                            <span class="status-badge ${rule.enabled ? 'status-active' : 'status-inactive'}">
                                ${rule.enabled ? '启用' : '禁用'}
                            </span>
                        </div>
                        <div class="rule-site">
                            ${matchIcon} ${matchText}: ${siteDisplay}
                        </div>
                        <div class="rule-keywords" title="${keywords.join(', ')}">
                            🔑 ${keywords.length} 个关键词: ${keywords.join(', ').substring(0, 50)}${keywords.join(', ').length > 50 ? '...' : ''}
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

        // 添加事件监听
        document.querySelectorAll('.btn-toggle').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = this.dataset.index;
                toggleRule(parseInt(index));
            });
        });

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = this.dataset.index;
                editRule(parseInt(index), rules[parseInt(index)]);
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = this.dataset.index;
                deleteRule(parseInt(index));
            });
        });
    }

    // 切换规则状态
    function toggleRule(index) {
        rules[index].enabled = !rules[index].enabled;
        saveRules();
    }

    // 编辑规则
    function editRule(index, rule) {
        editingIndex = index;
        
        ruleNameInput.value = rule.name || '';
        matchTypeSelect.value = rule.matchType || 'simple';
        
        // 将 sitePatterns 数组转换为文本
        if (rule.sitePatterns && rule.sitePatterns.length > 0) {
            sitePatternsInput.value = rule.sitePatterns.join('\n');
        } else {
            sitePatternsInput.value = '';
        }
        
        keywordsTextarea.value = (rule.keywords || []).join('\n');
        enabledCheckbox.checked = rule.enabled !== false;
        
        editingIndicator.style.display = 'block';
        editingIndicator.textContent = `✏️ 正在编辑: ${rule.name || '未命名规则'}`;
        cancelEditBtn.style.display = 'inline-block';
        saveRuleBtn.textContent = '更新规则';
    }

    // 删除规则
    function deleteRule(index) {
        if (confirm('确定要删除这条规则吗？')) {
            rules.splice(index, 1);
            saveRules();
            
            if (editingIndex === index) {
                cancelEdit();
            }
        }
    }

    // 取消编辑
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

    // 保存当前表单为规则
    function saveCurrentRule() {
        const name = ruleNameInput.value.trim();
        if (!name) {
            alert('请输入规则名称');
            return;
        }
        
        const matchType = matchTypeSelect.value;
        const sitePatternsText = sitePatternsInput.value.trim();
        const keywordsText = keywordsTextarea.value.trim();
        
        if (!sitePatternsText) {
            alert('请至少输入一个网站模式');
            return;
        }
        
        if (!keywordsText) {
            alert('请至少输入一个关键词');
            return;
        }

        // 处理网站模式（支持换行和逗号分隔）
        const sitePatterns = sitePatternsText
            .split(/[\n,]+/)
            .map(s => s.trim())
            .filter(s => s.length > 0);

        // 处理关键词
        const keywords = keywordsText.split('\n')
            .map(k => k.trim())
            .filter(k => k.length > 0);

        const newRule = {
            name: name,
            matchType: matchType,
            sitePatterns: sitePatterns,
            keywords: keywords,
            enabled: enabledCheckbox.checked
        };

        if (editingIndex >= 0) {
            // 更新现有规则
            rules[editingIndex] = newRule;
            cancelEdit();
        } else {
            // 添加新规则
            rules.push(newRule);
        }

        saveRules();
    }

    // 保存规则到 storage
    function saveRules() {
        chrome.storage.local.set({ scriptBlockerRules: rules }, function() {
            displayRules();
        });
    }

    // 事件监听
    saveRuleBtn.addEventListener('click', saveCurrentRule);
    cancelEditBtn.addEventListener('click', cancelEdit);

    // 初始化加载
    loadRules();
});