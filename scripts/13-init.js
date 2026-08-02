// ============================================================
//  13. 初始化：先尝试从 localStorage 恢复，否则使用示例
// ============================================================

window.onload = async function () {
    await loadItemData();

    if (window.projectManager && typeof window.projectManager.init === 'function') {
        window.projectManager.init();
        return;
    }

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

function restoreProjectData(data) {
    console.log('🔄 开始恢复工程数据...');
    if (window.clearAll) {
        window.clearAll();
    } else {
        nodes.forEach(n => n.element && n.element.remove());
        nodes = [];
        connections = [];
    }
    nodeIdCounter = 1;

    window.labels = data.labels;
    console.log('🏷️ 恢复标签:', window.labels);

    const idMap = {};
    const createNode = window.createNode || window._createNode;
    if (!createNode) {
        alert('无法创建节点，请确保核心模块已加载');
        return;
    }

    console.log(`📌 开始重建 ${data.nodes.length} 个节点...`);
    data.nodes.forEach(nodeData => {
        const node = createNode(nodeData.type, nodeData.x, nodeData.y, nodeData.ioScope);
        node.id = String(nodeData.id);
        node.updatePortIds(); // ★ 新增
        for (let key in nodeData.settings) {
            node.settings[key] = nodeData.settings[key];
        }
        if (node.updateUI) node.updateUI();
        idMap[String(nodeData.id)] = node;
        console.log(`   ✅ 节点 ${nodeData.id} (${nodeData.type}) 已重建`);
    });

    const maxId = data.nodes.reduce((max, n) => Math.max(max, parseInt(n.id) || 0), 0);
    nodeIdCounter = maxId + 1;

    console.log(`🔗 开始重建 ${data.connections.length} 条连接...`);
    data.connections.forEach(connData => {
        const fromNode = idMap[String(connData.fromNodeId)];
        const toNode = idMap[String(connData.toNodeId)];
        if (fromNode && toNode) {
            const exists = connections.some(c => String(c.fromNodeId) === String(fromNode.id) && String(c.toNodeId) === String(toNode.id));
            if (!exists) {
                connections.push({ fromNodeId: String(fromNode.id), toNodeId: String(toNode.id), fromPort: 'output', toPort: 'input' });
                if (fromNode.ports.output) fromNode.ports.output.classList.add('connected');
                if (toNode.ports.input) toNode.ports.input.classList.add('connected');
                console.log(`   ✅ 连接 ${fromNode.id} → ${toNode.id} 已重建`);
            }
        } else {
            console.warn(`   ⚠️ 连接 ${connData.fromNodeId} → ${connData.toNodeId} 的节点不存在，跳过`);
        }
    });

    console.log('🔄 刷新界面...');
    if (window.updateConnections) window.updateConnections();
    if (window.generateCode) window.generateCode();
    if (window.renderLabelManager) window.renderLabelManager();

    console.log('✅ 工程恢复完成');
}

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