// ============================================================
//  func14-io.js - 导入/导出工程 & 未保存提示 & 自动保存
// ============================================================

(function () {
    'use strict';

    // 如果多工程管理器已存在，则跳过本模块的初始化
    if (window.projectManager) {
        console.log('🔄 检测到多工程管理器，func14 跳过初始化');
        // 但保留导出导入等函数可能会被覆盖，所以不覆盖
        return;
    }
    let isDirty = false;
    let autoSaveTimer = null;

    // ---------- 保存到 localStorage ----------
    function saveToLocalStorage() {
        try {
            // ★ 直接使用全局 nodes, connections
            const data = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                labels: window.labels || [],
                nodes: (nodes || []).map(n => ({
                    id: n.id,
                    type: n.type,
                    ioScope: n.ioScope,
                    x: n.x,
                    y: n.y,
                    width: n.width,
                    height: n.height,
                    settings: n.settings
                })),
                connections: (connections || []).map(c => ({
                    fromNodeId: c.fromNodeId,
                    toNodeId: c.toNodeId
                }))
            };
            localStorage.setItem('sfm_project_data', JSON.stringify(data));
            console.log('💾 数据已保存到 localStorage');
            if (isDirty) {
                isDirty = false;
                updateSaveStatus();
                console.log('✅ 状态已更新为“已保存”');
            }
        } catch (e) {
            console.warn('❌ 保存到 localStorage 失败:', e);
        }
    }

    function scheduleAutoSave() {
        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(function () {
            saveToLocalStorage();
            autoSaveTimer = null;
        }, 200);
    }

    window.markDirty = function () {
        if (!isDirty) {
            isDirty = true;
            updateSaveStatus();
            console.log('🟡 状态变为“未保存”');
        }
        scheduleAutoSave();
    };

    window.clearDirty = function () {
        if (autoSaveTimer) {
            clearTimeout(autoSaveTimer);
            autoSaveTimer = null;
        }
        isDirty = false;
        updateSaveStatus();
        saveToLocalStorage();
        console.log('✅ 状态已清除（已保存）');
    };

    function updateSaveStatus() {
        const statusEl = document.getElementById('save-status');
        if (statusEl) {
            statusEl.textContent = isDirty ? '⚠️ 未保存' : '✅ 已保存';
            statusEl.style.color = isDirty ? '#ff9800' : '#aaa';
        }
    }

    // ---------- 导出工程 ----------
    window.exportProject = function () {
        console.log('📤 导出工程...');
        const projectData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            labels: window.labels || [],
            nodes: (nodes || []).map(n => ({
                id: n.id,
                type: n.type,
                ioScope: n.ioScope,
                x: n.x,
                y: n.y,
                width: n.width,
                height: n.height,
                settings: n.settings
            })),
            connections: (connections || []).map(c => ({
                fromNodeId: c.fromNodeId,
                toNodeId: c.toNodeId
            }))
        };
        const jsonStr = JSON.stringify(projectData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sfm_project_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        window.clearDirty();
    };

    // ---------- 导入工程 ----------
    window.importProject = function (file) {
        console.log('📥 导入工程...');
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.nodes || !data.connections || !data.labels) {
                    alert('无效的工程文件：缺少必要字段');
                    return;
                }

                if (window.clearAll) {
                    window.clearAll();
                } else {
                    nodes.forEach(n => n.element && n.element.remove());
                    nodes = [];
                    connections = [];
                }
                nodeIdCounter = 1;

                window.labels = data.labels;

                const idMap = {};
                const createNode = window.createNode || window._createNode;
                if (!createNode) {
                    alert('无法创建节点，请确保核心模块已加载');
                    return;
                }

                data.nodes.forEach(nodeData => {
                    const node = createNode(nodeData.type, nodeData.x, nodeData.y, nodeData.ioScope);
                    node.id = nodeData.id;
                    for (let key in nodeData.settings) {
                        node.settings[key] = nodeData.settings[key];
                    }
                    if (node.updateUI) node.updateUI();
                    idMap[nodeData.id] = node;
                });

                const maxId = data.nodes.reduce((max, n) => Math.max(max, n.id), 0);
                nodeIdCounter = maxId + 1;

                data.connections.forEach(connData => {

                    const fromNode = idMap[String(connData.fromNodeId)]; // ★
                    const toNode = idMap[String(connData.toNodeId)];     // ★
                    if (fromNode && toNode) {
                        const exists = connections.some(c => c.fromNodeId === fromNode.id && c.toNodeId === toNode.id);
                        if (!exists) {
                            connections.push({ fromNodeId: fromNode.id, toNodeId: toNode.id, fromPort: 'output', toPort: 'input' });
                            if (fromNode.ports.output) fromNode.ports.output.classList.add('connected');
                            if (toNode.ports.input) toNode.ports.input.classList.add('connected');
                        }
                    }
                });

                if (window.updateConnections) window.updateConnections();
                if (window.generateCode) window.generateCode();
                if (window.renderLabelManager) window.renderLabelManager();

                window.clearDirty();
                console.log('✅ 导入完成');

            } catch (err) {
                alert('导入失败：' + err.message);
            }
        };
        reader.readAsText(file);
    };

    // ---------- 新建工程 ----------
    window.newProject = function () {
        console.log('🗑️ 新建工程...');
        if (isDirty) {
            if (!confirm('当前工程有未保存的更改，确定要新建吗？')) return;
        }
        if (window.clearAll) {
            window.clearAll();
        } else {
            nodes.forEach(n => n.element && n.element.remove());
            nodes = [];
            connections = [];
        }
        window.labels = ['输入源', '熔炉', '磨粉机', '输出箱'];
        if (window.renderLabelManager) window.renderLabelManager();
        if (window.updateConnections) window.updateConnections();
        if (window.generateCode) window.generateCode();
        window.clearDirty();
        console.log('✅ 新建完成');
    };

    // ---------- 关闭标签页提示 ----------
    window.addEventListener('beforeunload', function (e) {
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
            console.warn('⚠️ 顶部按钮未找到，100ms后重试...');
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
        btnImport.addEventListener('click', function () {
            fileInput.click();
        });
        fileInput.addEventListener('change', function (e) {
            if (this.files && this.files[0]) {
                window.importProject(this.files[0]);
                this.value = '';
            }
        });

        updateSaveStatus();
        console.log('✅ 顶部按钮绑定完成');
    }

    if (document.readyState === 'complete') {
        bindButtons();
    } else {
        window.addEventListener('load', bindButtons);
    }

})();