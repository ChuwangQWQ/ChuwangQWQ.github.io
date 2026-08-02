// ============================================================
//  5. 节点管理（删除节点后重置端口状态）
// ============================================================
function createNode(type, x, y, scope = 'input') {
    const node = new Node(type, x, y, scope);
    nodes.push(node);
    if (window.markDirty) window.markDirty();
    return node;
}

function deleteNode(id) {
    const idx = nodes.findIndex(n => n.id === id);
    if (idx === -1) return;
    const node = nodes[idx];
    connections = connections.filter(c => c.fromNodeId !== id && c.toNodeId !== id);
    if (node.element) node.element.remove();
    nodes.splice(idx, 1);
    if (selectedNodeId === id) selectedNodeId = null;
    refreshPortStatuses();
    updateConnections();
    generateCode();
    if (window.markDirty) window.markDirty();
}

function clearAll() {
    nodes.forEach(n => n.element.remove());
    nodes = [];
    connections = [];
    selectedNodeId = null;
    updateConnections();
    document.getElementById('code-output').value = '';
    if (window.markDirty) window.markDirty();
}

// 重置所有端口状态
function refreshPortStatuses() {
    nodes.forEach(node => {
        if (node.ports.output) {
            node.ports.output.classList.remove('connected');
        }
        if (node.ports.input) {
            node.ports.input.classList.remove('connected');
        }
        if (node.ports.inputs) {
            node.ports.inputs.forEach(port => port.classList.remove('connected'));
        }
    });
    connections.forEach(c => {
        const fromNode = getNode(c.fromNodeId);
        const toNode = getNode(c.toNodeId);
        if (fromNode && fromNode.ports.output) {
            fromNode.ports.output.classList.add('connected');
        }
        if (toNode && toNode.ports.input) {
            toNode.ports.input.classList.add('connected');
        } else if (toNode && toNode.ports.inputs && c.toPortIndex !== undefined) {
            const port = toNode.ports.inputs[c.toPortIndex];
            if (port) port.classList.add('connected');
        }
    });
}