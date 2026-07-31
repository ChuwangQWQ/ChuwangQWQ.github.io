// ============================================================
//  16. 主页 & 工程设置
//  依赖：func15 多工程管理器
// ============================================================

(function() {
    'use strict';

    const rightPanel = document.getElementById('right-panel');
    const tabsContainer = rightPanel.querySelector('.tabs');
    const tabContents = rightPanel.querySelectorAll('.tab-content');
    let homeContent = null;
    let isHomeActive = false;

    // ---------- 渲染主页 ----------
    function renderHome() {
        if (!homeContent) {
            homeContent = document.createElement('div');
            homeContent.id = 'home-content';
            homeContent.style.cssText = 'flex:1;padding:20px;overflow-y:auto;color:#eee;';
            rightPanel.appendChild(homeContent);
        }
        isHomeActive = true;

        // ★ 完全隐藏右侧面板的 tabs 和所有内容
        tabsContainer.style.display = 'none';
        tabContents.forEach(el => {
            el.style.display = 'none';
            el.classList.remove('active');
        });
        const settingsTab = document.querySelector('.tab-btn[data-tab="settings"]');
        if (settingsTab) settingsTab.style.display = 'none';
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

        homeContent.style.display = 'block';

        const pm = window.projectManager;
        if (!pm) {
            homeContent.innerHTML = '<p style="color:#ff6b6b;">多工程管理器未加载</p>';
            return;
        }
        const projects = pm.projects;
        const current = pm.current();

        let html = `<h2 style="color:#ffd700;margin-top:0;">📂 工程列表</h2>`;
        if (Object.keys(projects).length === 0) {
            html += `<p style="color:#aaa;">暂无工程，请新建。</p>`;
        } else {
            html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">`;
            Object.keys(projects).forEach(name => {
                const data = projects[name];
                const nodeCount = data.nodes ? data.nodes.length : 0;
                const connCount = data.connections ? data.connections.length : 0;
                const isActive = (name === current);
                html += `
                    <div class="project-card" data-name="${name}" 
                         style="background:#3a3a3a;border-radius:8px;padding:16px;border:2px solid ${isActive ? '#ffd700' : 'transparent'};transition:0.2s;position:relative;cursor:pointer;">
                        <div style="pointer-events:none;">
                            <h3 style="margin:0;color:${isActive ? '#ffd700' : '#fff'};">${name}</h3>
                            <div style="margin-top:8px;font-size:13px;color:#aaa;">
                                <div>📦 节点: ${nodeCount}</div>
                                <div>🔗 连接: ${connCount}</div>
                            </div>
                            ${isActive ? '<div style="margin-top:8px;color:#ffd700;font-size:12px;">✅ 当前工程</div>' : ''}
                        </div>
                        <button onclick="window.projectManager.deleteProject('${name}')" 
                                style="position:absolute;top:12px;right:12px;background:#e74c3c;border:none;border-radius:4px;color:#fff;cursor:pointer;padding:2px 8px;font-size:12px;pointer-events:auto;">
                            🗑️
                        </button>
                    </div>
                `;
            });
            html += `</div>`;
        }
        html += `
            <div style="margin-top:20px;">
                <button onclick="window.newProject()" style="padding:8px 20px;background:#ffd700;border:none;border-radius:4px;color:#222;cursor:pointer;font-size:14px;">➕ 新建工程</button>
            </div>
        `;
        homeContent.innerHTML = html;

        // ★ 双击卡片跳转工程
        homeContent.querySelectorAll('.project-card').forEach(card => {
            card.addEventListener('dblclick', function() {
                const name = this.dataset.name;
                if (name && window.projectManager) {
                    window.projectManager.switchToProject(name);
                }
            });
        });
    }

    // ---------- 显示工程视图 ----------
    function showProjectView() {
        isHomeActive = false;
        if (homeContent) homeContent.style.display = 'none';

        tabsContainer.style.display = 'flex';
        const settingsTab = document.querySelector('.tab-btn[data-tab="settings"]');
        if (settingsTab) settingsTab.style.display = 'block';

        // 由 func12 控制内容显示，激活 code tab
        if (typeof window.switchTab === 'function') {
            const codeTab = document.querySelector('.tab-btn[data-tab="code"]');
            if (codeTab) {
                window.switchTab('code');
            } else {
                const firstTab = document.querySelector('.tab-btn');
                if (firstTab) window.switchTab(firstTab.dataset.tab);
            }
        } else {
            // 降级方案
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
            const codeContent = document.getElementById('tab-code');
            if (codeContent) {
                codeContent.style.display = 'flex';
                codeContent.classList.add('active');
            }
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            const codeBtn = document.querySelector('.tab-btn[data-tab="code"]');
            if (codeBtn) codeBtn.classList.add('active');
        }

        if (document.getElementById('tab-settings')) {
            renderSettingsContent();
        }
    }

    // ---------- 渲染工程设置 ----------
    function renderProjectSettings() {
        let settingsTab = document.querySelector('.tab-btn[data-tab="settings"]');
        let settingsContent = document.getElementById('tab-settings');
        if (!settingsTab) {
            settingsTab = document.createElement('button');
            settingsTab.className = 'tab-btn';
            settingsTab.dataset.tab = 'settings';
            settingsTab.textContent = '⚙️ 工程设置';
            tabsContainer.appendChild(settingsTab);
            settingsContent = document.createElement('div');
            settingsContent.className = 'tab-content';
            settingsContent.id = 'tab-settings';
            settingsContent.style.cssText = 'flex:1;padding:16px;overflow-y:auto;';
            rightPanel.appendChild(settingsContent);
            settingsContent.style.display = 'none';
        }
        if (!isHomeActive) {
            renderSettingsContent();
        }
    }

    window.renderSettingsContent = function() {
        const settingsContent = document.getElementById('tab-settings');
        if (!settingsContent) return;
        const pm = window.projectManager;
        if (!pm) {
            settingsContent.innerHTML = '<p style="color:#ff6b6b;">多工程管理器未加载</p>';
            return;
        }
        const projectName = pm.current() || '未命名';
        const projects = pm.projects;
        const data = projects[projectName] || { nodes: [], connections: [], labels: [] };
        const nodeCount = data.nodes ? data.nodes.length : 0;
        const connCount = data.connections ? data.connections.length : 0;
        const labelCount = data.labels ? data.labels.length : 0;

        settingsContent.innerHTML = `
            <h3 style="color:#ffd700;margin-top:0;">⚙️ 工程设置</h3>
            <div style="margin-bottom:16px;">
                <label style="display:block;color:#aaa;font-size:13px;">工程名称</label>
                <input type="text" id="project-name-input" value="${projectName}" 
                       style="width:100%;padding:8px;border-radius:4px;border:1px solid #555;background:#3a3a3a;color:#fff;font-size:14px;margin-top:4px;">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:16px;">
                <div style="background:#3a3a3a;padding:16px;border-radius:8px;text-align:center;">
                    <div style="font-size:28px;color:#ffd700;">${nodeCount}</div>
                    <div style="color:#aaa;font-size:13px;">节点</div>
                </div>
                <div style="background:#3a3a3a;padding:16px;border-radius:8px;text-align:center;">
                    <div style="font-size:28px;color:#ffd700;">${connCount}</div>
                    <div style="color:#aaa;font-size:13px;">连接</div>
                </div>
                <div style="background:#3a3a3a;padding:16px;border-radius:8px;text-align:center;">
                    <div style="font-size:28px;color:#ffd700;">${labelCount}</div>
                    <div style="color:#aaa;font-size:13px;">标签</div>
                </div>
            </div>
        `;

        const input = document.getElementById('project-name-input');
        if (input) {
            const newInput = input.cloneNode(true);
            input.parentNode.replaceChild(newInput, input);
            newInput.addEventListener('blur', function() {
                const newName = this.value.trim();
                if (!newName) { this.value = projectName; return; }
                if (newName === projectName) return;
                if (pm.projects[newName]) {
                    alert('工程名已存在');
                    this.value = projectName;
                    return;
                }
                if (pm.renameProject(projectName, newName)) {
                    renderSettingsContent();
                } else {
                    this.value = projectName;
                }
            });
        }
    };

    // ---------- 视图切换回调 ----------
    window.onViewChange = function(view) {
        if (view === 'home') {
            renderHome();
        } else {
            showProjectView();
            renderProjectSettings();
        }
    };

    console.log('✅ func16 主页与工程设置模块已加载');
})();