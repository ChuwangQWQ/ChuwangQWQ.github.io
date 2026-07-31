// ============================================================
//  3. 数据模型
// ============================================================
let nodes = [];
let connections = [];
let nodeIdCounter = 1;
let selectedNodeId = null;
let tempLine = null;

function getNode(id) { return nodes.find(n => n.id === id); }

const COLORS = {
    base: '#27ae60',
    num_input: '#f1c40f',
    resType_input: '#f1c40f',
    resId_input: '#f1c40f',
    retain_input: '#f1c40f',
    side_input: '#f1c40f',
    slots_input: '#f1c40f',
    num_output: '#3498db',
    resType_output: '#3498db',
    resId_output: '#3498db',
    retain_output: '#3498db',
    side_output: '#3498db',
    slots_output: '#3498db',
    condition: '#8e44ad',
    output: '#e74c3c',
    hub: '#95a5a6',        // 新增
};

function getNodeColor(type, scope) {
    if (type === 'num' || type === 'resType' || type === 'resId' || type === 'retain' || type === 'side' || type === 'slots') {
        const key = type + '_' + (scope || 'input');
        return COLORS[key] || '#888';
    }
    return COLORS[type] || '#888';
}