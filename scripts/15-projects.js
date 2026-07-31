// ============================================================
//  15. 多工程管理（标签页 + 主页集成）
//  依赖：全局 nodes, connections, labels, 各渲染函数
// ============================================================

(function() {
    'use strict';

    const STORAGE_KEY = 'sfm_projects_data';
    const OPEN_KEY = 'sfm_open_projects';
    let projects = {};
    let openProjects = [];   // 当前在标签栏打开的工程名称列表
    let currentProjectName = null;
    let isDirty = false;
    let autoSaveTimer = null;
    let isHomePage = false;

    // ---------- 存储 ----------
    function loadProjectsFromStorage() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                if (parsed.projects) {
                    Object.keys(projects).forEach(key => delete projects[key]);
                    Object.assign(projects, parsed.projects);
                }
            }
        } catch (e) { console.warn('读取工程数据失败', e); }
        if (Object.keys(projects).length === 0) {
            projects = {};
        }

        // 加载打开的工程列表
        try {
            const openData = localStorage.getItem(OPEN_KEY);
            if (openData) {
                openProjects = JSON.parse(openData);
                if (!Array.isArray(openProjects)) openProjects = [];
            } else {
                openProjects = [];
            }
        } catch (e) { openProjects = []; }

        // 如果当前工程不在 openProjects 中，但 projects 中有，自动加入？
        // 初始化时，我们默认不自动打开任何工程，由用户点击打开。
        // 但为了兼容，如果 openProjects 为空且 projects 有数据，可以打开第一个？
        // 我们选择默认不打开，主页显示所有工程，标签栏为空。
    }

    function saveToStorage() {
        try {
            const data = {
                projects: projects
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) { console.warn('保存工程数据失败', e); }
        // 保存打开的列表
        try {
            localStorage.setItem(OPEN_KEY, JSON.stringify(openProjects));
        } catch (e) { console.warn('保存打开列表失败', e); }
    }

    // ---------- 数据操作 ----------
    function collectCurrentData() {
        return {
            nodes: nodes.map(n => ({
                id: n.id,
                type: n.type,
                ioScope: n.ioScope,
                x: n.x,
                y: n.y,
                width: n.width,
                height: n.height,
                settings: n.settings
            })),
            connections: connections.map(c => ({
                fromNodeId: c.fromNodeId,
                toNodeId: c.toNodeId
            })),
            labels: window.labels || []
        };
    }

    function saveCurrentToStorage() {
        if (!currentProjectName || !projects[currentProjectName]) return;
        const data = collectCurrentData();
        projects[currentProjectName] = data;
        saveToStorage();
        if (isDirty) {
            isDirty = false;
            updateSaveStatus();
        }
    }

    function scheduleAutoSave() {
        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(function() {
            saveCurrentToStorage();
            autoSaveTimer = null;
        }, 200);
    }

    // ---------- 脏标记 ----------
    window.markDirty = function() {
        if (!isDirty) {
            isDirty = true;
            updateSaveStatus();
        }
        scheduleAutoSave();
    };

    window.clearDirty = function() {
        if (autoSaveTimer) {
            clearTimeout(autoSaveTimer);
            autoSaveTimer = null;
        }
        isDirty = false;
        updateSaveStatus();
        saveCurrentToStorage();
    };

    function updateSaveStatus() {
        const statusEl = document.getElementById('save-status');
        if (statusEl) {
            statusEl.textContent = isDirty ? '⚠️ 未保存' : '✅ 已保存';
            statusEl.style.color = isDirty ? '#ff9800' : '#aaa';
        }
    }

    // ---------- 加载工程到全局 ----------
    function loadProjectToGlobals(name) {
        const data = projects[name];
        if (!data) {
            // 工程不存在，清空编辑器
            if (window.clearAll) window.clearAll();
            else {
                nodes.forEach(n => n.element && n.element.remove());
                nodes.length = 0;
                connections.length = 0;
            }
            window.nodeIdCounter = 1;
            window.labels = ['输入源', '熔炉', '磨粉机', '输出箱'];
            refreshUI();
            return;
        }
        if (window.clearAll) window.clearAll();
        else {
            nodes.forEach(n => n.element && n.element.remove());
            nodes.length = 0;
            connections.length = 0;
        }
        window.nodeIdCounter = 1;

        window.labels = data.labels || ['输入源', '熔炉', '磨粉机', '输出箱'];

        const idMap = {};
        const createNode = window.createNode || window._createNode;
        if (!createNode) {
            alert('无法创建节点，请确保核心模块已加载');
            return;
        }

        const nodesData = data.nodes || [];
        nodesData.forEach(nodeData => {
            const node = createNode(nodeData.type, nodeData.x, nodeData.y, nodeData.ioScope);
            node.id = nodeData.id;
            for (let key in nodeData.settings) {
                node.settings[key] = nodeData.settings[key];
            }
            if (node.updateUI) node.updateUI();
            idMap[nodeData.id] = node;
        });

        const maxId = nodesData.reduce((max, n) => Math.max(max, n.id), 0);
        window.nodeIdCounter = maxId + 1;

        const conns = data.connections || [];
        conns.forEach(connData => {
            const fromNode = idMap[connData.fromNodeId];
            const toNode = idMap[connData.toNodeId];
            if (fromNode && toNode) {
                const exists = connections.some(c => c.fromNodeId === fromNode.id && c.toNodeId === toNode.id);
                if (!exists) {
                    connections.push({ fromNodeId: fromNode.id, toNodeId: toNode.id, fromPort: 'output', toPort: 'input' });
                    if (fromNode.ports.output) fromNode.ports.output.classList.add('connected');
                    if (toNode.ports.input) toNode.ports.input.classList.add('connected');
                }
            }
        });

        refreshUI();
        window.clearDirty();
    }

    function refreshUI() {
        if (window.updateConnections) window.updateConnections();
        if (window.generateCode) window.generateCode();
        if (window.renderLabelManager) window.renderLabelManager();
        if (window.resizeCanvas) window.resizeCanvas();
    }

    // ---------- 视图切换 ----------
    function switchToProject(name) {
        if (!projects[name]) {
            switchToHome();
            return;
        }
        isHomePage = false;
        window._currentView = 'project';
        saveCurrentToStorage();
        currentProjectName = name;
        loadProjectToGlobals(name);
        // 添加到打开列表
        if (!openProjects.includes(name)) {
            openProjects.push(name);
        }
        renderTabs();
        saveToStorage();
        window.clearDirty();
        if (window.onViewChange) window.onViewChange('project');
    }

    function switchToHome() {
        isHomePage = true;
        window._currentView = 'home';
        saveCurrentToStorage();
        renderTabs();
        if (window.onViewChange) window.onViewChange('home');
    }

    // ---------- 工程管理 ----------
    function newProject(name) {
        if (!name) {
            let count = 1;
            while (projects['工程 ' + count]) count++;
            name = '工程 ' + count;
        }
        if (projects[name]) {
            alert('工程名已存在');
            return;
        }
        saveCurrentToStorage();
        projects[name] = {
            nodes: [],
            connections: [],
            labels: ['输入源', '熔炉', '磨粉机', '输出箱']
        };
        currentProjectName = name;
        if (!openProjects.includes(name)) openProjects.push(name);
        if (window.clearAll) window.clearAll();
        else {
            nodes.forEach(n => n.element && n.element.remove());
            nodes.length = 0;
            connections.length = 0;
        }
        window.nodeIdCounter = 1;
        window.labels = ['输入源', '熔炉', '磨粉机', '输出箱'];
        refreshUI();
        renderTabs();
        saveToStorage();
        window.clearDirty();
        isHomePage = false;
        window._currentView = 'project';
        if (window.onViewChange) window.onViewChange('project');
    }

    // ★ 关闭工作区（从标签栏移除，不删除数据）
    function closeProject(name) {
        if (!projects[name]) return;
        // 从打开列表移除
        const idx = openProjects.indexOf(name);
        if (idx !== -1) openProjects.splice(idx, 1);
        // 如果关闭的是当前工程，清空编辑器
        if (name === currentProjectName) {
            if (window.clearAll) window.clearAll();
            else {
                nodes.forEach(n => n.element && n.element.remove());
                nodes.length = 0;
                connections.length = 0;
            }
            window.nodeIdCounter = 1;
            window.labels = ['输入源', '熔炉', '磨粉机', '输出箱'];
            refreshUI();
            currentProjectName = null;
            saveToStorage();
            renderTabs();
            // 如果当前是主页，刷新主页；否则切到主页
            if (isHomePage && window.onViewChange) window.onViewChange('home');
            else switchToHome();
        } else {
            // 非当前工程，仅更新标签栏
            saveToStorage();
            renderTabs();
        }
    }

    // 永久删除工程（主页调用，需确认）
    window.deleteProject = function(name) {
        if (!projects[name]) return;
        if (!confirm(`确定永久删除工程 "${name}" 吗？\n此操作不可恢复！`)) return;
        const isCurrent = (name === currentProjectName);
        // 从 projects 删除
        delete projects[name];
        // 从打开列表移除
        const idx = openProjects.indexOf(name);
        if (idx !== -1) openProjects.splice(idx, 1);
        if (isCurrent) {
            if (window.clearAll) window.clearAll();
            else {
                nodes.forEach(n => n.element && n.element.remove());
                nodes.length = 0;
                connections.length = 0;
            }
            window.nodeIdCounter = 1;
            window.labels = ['输入源', '熔炉', '磨粉机', '输出箱'];
            refreshUI();
            currentProjectName = null;
            saveToStorage();
            renderTabs();
            if (isHomePage && window.onViewChange) window.onViewChange('home');
            else switchToHome();
        } else {
            saveToStorage();
            renderTabs();
            if (isHomePage && window.onViewChange) window.onViewChange('home');
        }
    };

    // ---------- 渲染标签页 ----------
    function renderTabs() {
        const container = document.getElementById('tabs-container');
        if (!container) return;
        const homeTab = container.querySelector('#tab-home');
        container.innerHTML = '';
        if (homeTab) {
            homeTab.classList.toggle('active', isHomePage);
            container.appendChild(homeTab);
            homeTab.onclick = function() {
                if (!isHomePage) switchToHome();
            };
        }

        // ★ 仅渲染打开列表中的工程
        openProjects.forEach(name => {
            // 如果该工程已被删除，跳过
            if (!projects[name]) return;
            const tab = document.createElement('div');
            tab.className = 'tab-item';
            if (name === currentProjectName && !isHomePage) tab.classList.add('active');
            tab.dataset.project = name;
            tab.innerHTML = `<span>${name}</span><span class="tab-close" data-name="${name}">×</span>`;
            tab.addEventListener('click', function(e) {
                if (e.target.classList.contains('tab-close')) return;
                if (isHomePage) {
                    switchToProject(name);
                } else {
                    if (name !== currentProjectName) switchToProject(name);
                }
            });
            const closeBtn = tab.querySelector('.tab-close');
            closeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                closeProject(name);
            });
            container.appendChild(tab);
        });
    }

    // ---------- 导出导入 ----------
    window.exportProject = function() {
        if (!currentProjectName) {
            alert('没有打开的工程');
            return;
        }
        const data = collectCurrentData();
        const projectName = currentProjectName;
        const exportData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            projectName: projectName,
            labels: data.labels,
            nodes: data.nodes,
            connections: data.connections
        };
        const jsonStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sfm_${projectName}_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        window.clearDirty();
    };

    window.importProject = function(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.nodes || !data.connections || !data.labels) {
                    alert('无效的工程文件：缺少必要字段');
                    return;
                }
                const name = data.projectName || '导入工程';
                let finalName = name;
                let count = 1;
                while (projects[finalName]) {
                    finalName = name + '_' + count;
                    count++;
                }
                saveCurrentToStorage();
                projects[finalName] = {
                    nodes: data.nodes,
                    connections: data.connections,
                    labels: data.labels
                };
                currentProjectName = finalName;
                if (!openProjects.includes(finalName)) openProjects.push(finalName);
                loadProjectToGlobals(finalName);
                renderTabs();
                saveToStorage();
                window.clearDirty();
                isHomePage = false;
                window._currentView = 'project';
                if (window.onViewChange) window.onViewChange('project');
            } catch (err) {
                alert('导入失败：' + err.message);
            }
        };
        reader.readAsText(file);
    };

    window.newProject = function() {
        if (isDirty && !confirm('当前工程有未保存的更改，确定要新建吗？')) return;
        newProject();
    };

    // ---------- 关闭标签页提示 ----------
    window.addEventListener('beforeunload', function(e) {
        if (isDirty) {
            e.preventDefault();
            e.returnValue = '您有未保存的更改，确定要离开吗？';
            return e.returnValue;
        }
    });

    // ---------- 绑定 UI 按钮 ----------
    function bindButtons() {
        const btnExport = document.getElementById('btn-export');
        const btnImport = document.getElementById('btn-import');
        const btnNew = document.getElementById('btn-new');
        if (!btnExport || !btnImport || !btnNew) {
            setTimeout(bindButtons, 100);
            return;
        }

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        btnExport.addEventListener('click', window.exportProject);
        btnNew.addEventListener('click', window.newProject);
        btnImport.addEventListener('click', function() {
            fileInput.click();
        });
        fileInput.addEventListener('change', function(e) {
            if (this.files && this.files[0]) {
                window.importProject(this.files[0]);
                this.value = '';
            }
        });

        updateSaveStatus();
    }

    // ---------- 初始化 ----------
    window.projectManager = {
        init: function() {
            loadProjectsFromStorage();
            isHomePage = true;
            window._currentView = 'home';
            // 如果有打开列表，打开第一个工程，否则清空编辑器
            if (openProjects.length > 0 && projects[openProjects[0]]) {
                currentProjectName = openProjects[0];
                loadProjectToGlobals(openProjects[0]);
            } else {
                // 无打开工程，清空编辑器
                if (window.clearAll) window.clearAll();
                else {
                    nodes.forEach(n => n.element && n.element.remove());
                    nodes.length = 0;
                    connections.length = 0;
                }
                window.nodeIdCounter = 1;
                window.labels = ['输入源', '熔炉', '磨粉机', '输出箱'];
                refreshUI();
                currentProjectName = null;
                openProjects = []; // 确保为空
            }
            renderTabs();
            bindButtons();
            updateSaveStatus();
            if (window.onViewChange) window.onViewChange('home');
            console.log('✅ 多工程管理器初始化完成');
        },
        get projects() { return projects; },
        current: function() { return currentProjectName; },
        switchToProject: switchToProject,
        switchToHome: switchToHome,
        newProject: newProject,
        deleteProject: window.deleteProject,
        closeProject: closeProject,
        saveCurrent: saveCurrentToStorage,
        renderTabs: renderTabs,
        isHomePage: function() { return isHomePage; },
        renameProject: function(oldName, newName) {
            if (!projects[oldName]) return false;
            if (projects[newName]) return false;
            projects[newName] = projects[oldName];
            delete projects[oldName];
            if (currentProjectName === oldName) {
                currentProjectName = newName;
            }
            // 更新打开列表
            const idx = openProjects.indexOf(oldName);
            if (idx !== -1) openProjects[idx] = newName;
            saveToStorage();
            renderTabs();
            return true;
        }
    };

})();