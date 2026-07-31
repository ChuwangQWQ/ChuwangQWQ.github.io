// ============================================================
//  13. 初始化：先尝试从 localStorage 恢复，否则使用示例
// ============================================================

window.onload = async function () {
    await loadItemData();

    // 优先使用多工程管理器
    if (window.projectManager && typeof window.projectManager.init === 'function') {
        window.projectManager.init();
        return;
    }

    // 旧版单工程逻辑（保留兼容）
    const savedData = localStorage.getItem('sfm_project_data');
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            if (data.nodes && data.connections && data.labels) {
                restoreProjectData(data);
                if (window.clearDirty) window.clearDirty();
                return;
            }
        } catch (e) {
            console.warn('localStorage 数据损坏，使用默认示例', e);
        }
    }
    createDefaultExample();
};

// ---------- 从数据恢复工程 ----------
function restoreProjectData(data) {
    console.log('🔄 开始恢复工程数据...');
    // 清空当前工程（直接使用全局 nodes, connections）
    if (window.clearAll) {
        window.clearAll();
    } else {
        // 直接访问全局变量
        nodes.forEach(n => n.element && n.element.remove());
        nodes = [];
        connections = [];
    }
    nodeIdCounter = 1;  // 全局变量

    // 恢复标签
    window.labels = data.labels;
    console.log('🏷️ 恢复标签:', window.labels);

    // 重建节点
    const idMap = {};
    const createNode = window.createNode || window._createNode;
    if (!createNode) {
        alert('无法创建节点，请确保核心模块已加载');
        return;
    }

    console.log(`📌 开始重建 ${data.nodes.length} 个节点...`);
    data.nodes.forEach(nodeData => {
        const node = createNode(nodeData.type, nodeData.x, nodeData.y, nodeData.ioScope);
        node.id = nodeData.id;
        for (let key in nodeData.settings) {
            node.settings[key] = nodeData.settings[key];
        }
        if (node.updateUI) node.updateUI();
        idMap[nodeData.id] = node;
        console.log(`   ✅ 节点 ${nodeData.id} (${nodeData.type}) 已重建`);
    });

    const maxId = data.nodes.reduce((max, n) => Math.max(max, n.id), 0);
    nodeIdCounter = maxId + 1;
    console.log(`🔢 最大节点ID: ${maxId}, 新ID计数器: ${nodeIdCounter}`);

    // 重建连接
    console.log(`🔗 开始重建 ${data.connections.length} 条连接...`);
    data.connections.forEach(connData => {
        const fromNode = idMap[connData.fromNodeId];
        const toNode = idMap[connData.toNodeId];
        if (fromNode && toNode) {
            const exists = connections.some(c => c.fromNodeId === fromNode.id && c.toNodeId === toNode.id);
            if (!exists) {
                connections.push({ fromNodeId: fromNode.id, toNodeId: toNode.id, fromPort: 'output', toPort: 'input' });
                if (fromNode.ports.output) fromNode.ports.output.classList.add('connected');
                if (toNode.ports.input) toNode.ports.input.classList.add('connected');
                console.log(`   ✅ 连接 ${fromNode.id} → ${toNode.id} 已重建`);
            }
        } else {
            console.warn(`   ⚠️ 连接 ${connData.fromNodeId} → ${connData.toNodeId} 的节点不存在，跳过`);
        }
    });

    // 刷新界面
    console.log('🔄 刷新界面...');
    if (window.updateConnections) window.updateConnections();
    if (window.generateCode) window.generateCode();
    if (window.renderLabelManager) window.renderLabelManager();

    console.log('✅ 工程恢复完成');
}

// ---------- 创建默认示例 ----------
function createDefaultExample() {
    console.log('🆕 创建默认示例...');
    const base = window.createNode('base', 60, 200);
    base.settings.label = window.labels[0];
    base.settings.tick = 20;
    base.updateUI();

    const numInput = window.createNode('num', 280, 120, 'input');
    numInput.settings.number = 64;
    numInput.updateUI();

    const resTypeInput = window.createNode('resType', 480, 120, 'input');
    resTypeInput.settings.resourceType = 'fluid';
    resTypeInput.updateUI();

    const resIdInput = window.createNode('resId', 680, 120, 'input');
    resIdInput.settings.resourceId = 'minecraft:water_bucket';
    resIdInput.updateUI();

    const sideInput = window.createNode('side', 880, 120, 'input');
    sideInput.settings.side = 'top';
    sideInput.updateUI();

    const out = window.createNode('output', 1080, 200);
    out.settings.label = window.labels[3];
    out.updateUI();

    connections.push({ fromNodeId: base.id, toNodeId: numInput.id, fromPort: 'output', toPort: 'input' });
    connections.push({ fromNodeId: numInput.id, toNodeId: resTypeInput.id, fromPort: 'output', toPort: 'input' });
    connections.push({ fromNodeId: resTypeInput.id, toNodeId: resIdInput.id, fromPort: 'output', toPort: 'input' });
    connections.push({ fromNodeId: resIdInput.id, toNodeId: sideInput.id, fromPort: 'output', toPort: 'input' });
    connections.push({ fromNodeId: sideInput.id, toNodeId: out.id, fromPort: 'output', toPort: 'input' });

    setTimeout(() => {
        connections.forEach(c => {
            const from = getNode(c.fromNodeId);
            const to = getNode(c.toNodeId);
            if (from && from.ports.output) from.ports.output.classList.add('connected');
            if (to && to.ports.input) to.ports.input.classList.add('connected');
        });
        if (window.resizeCanvas) window.resizeCanvas();
        if (window.updateConnections) window.updateConnections();
        if (window.generateCode) window.generateCode();
        if (window.renderLabelManager) window.renderLabelManager();

        if (window.clearDirty) window.clearDirty();
        console.log('✅ 默认示例创建完成');
    }, 100);
}