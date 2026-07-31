// ============================================================
//  5. 节点管理
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