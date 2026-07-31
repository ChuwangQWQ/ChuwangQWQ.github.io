// ============================================================
//  6. 连线系统（动态水平偏移，支持集线器多端口）
// ============================================================
const canvas = document.getElementById('connection-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    const wrapper = document.getElementById('canvas-wrapper');
    canvas.width = wrapper.clientWidth;
    canvas.height = wrapper.clientHeight;
    updateConnections();
}

// 获取端口坐标（基于元素实际位置）
// portIndex 仅用于集线器的输入端口
function getPortPosition(nodeId, portType, portIndex) {
    const node = getNode(nodeId);
    if (!node || !node.element) return null;
    const wrapper = document.getElementById('canvas-wrapper');
    const wrapRect = wrapper.getBoundingClientRect();
    const rect = node.element.getBoundingClientRect();

    // 集线器特殊处理：根据端口索引获取位置
    if (node.type === 'hub' && portType === 'input') {
        const ports = node.ports.inputs || [];
        const idx = (portIndex !== undefined && portIndex < ports.length) ? portIndex : 0;
        const port = ports[idx] || ports[0];
        if (port) {
            const portRect = port.getBoundingClientRect();
            return {
                x: portRect.left - wrapRect.left + portRect.width / 2,
                y: portRect.top - wrapRect.top + portRect.height / 2
            };
        }
    }

    // 普通节点
    let x, y;
    if (portType === 'input') {
        x = rect.left - wrapRect.left;
        y = rect.top - wrapRect.top + rect.height / 2;
    } else {
        x = rect.right - wrapRect.left;
        y = rect.top - wrapRect.top + rect.height / 2;
    }
    return { x, y };
}

function updateConnections() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    connections.forEach(c => {
        const fromPos = getPortPosition(c.fromNodeId, 'output');
        // ★ 传递 toPortIndex（集线器专用）
        const toPos = getPortPosition(c.toNodeId, 'input', c.toPortIndex);
        if (fromPos && toPos) {
            drawCurve(fromPos.x, fromPos.y, toPos.x, toPos.y, '#e67e22', 3);
        }
    });
    if (tempLine) {
        const fromPos = getPortPosition(tempLine.fromNodeId, 'output');
        if (fromPos) {
            drawCurve(fromPos.x, fromPos.y, tempLine.endX, tempLine.endY, '#ffaa00', 2, true);
        }
    }
}

// 绘制贝塞尔曲线，动态计算偏移量
function drawCurve(x1, y1, x2, y2, color, width, dash) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);

    // 水平偏移量动态计算：不超过水平距离的一半，且最大120
    const dx = Math.abs(x2 - x1);
    const maxOffset = Math.min(120, dx * 0.5);   // 不超过一半
    const offset = Math.max(10, maxOffset);      // 至少保留10px

    const cx1 = x1 + offset;
    const cy1 = y1;
    const cx2 = x2 - offset;
    const cy2 = y2;

    ctx.bezierCurveTo(cx1, cy1, cx2, cy2, x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 2;
    if (dash) ctx.setLineDash([6, 6]);
    else ctx.setLineDash([]);
    ctx.stroke();
}

// 全局双击删除连线
document.addEventListener('dblclick', function (e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (mx < 0 || mx > rect.width || my < 0 || my > rect.height) return;
    let deleteIndex = -1;
    for (let i = 0; i < connections.length; i++) {
        const c = connections[i];
        const fromPos = getPortPosition(c.fromNodeId, 'output');
        const toPos = getPortPosition(c.toNodeId, 'input', c.toPortIndex);
        if (!fromPos || !toPos) continue;
        const steps = 20;
        let minDist = Infinity;
        for (let t = 0; t <= 1; t += 1 / steps) {
            // 近似检测贝塞尔曲线上的点（线性插值足够）
            const x = fromPos.x + (toPos.x - fromPos.x) * t;
            const y = fromPos.y + (toPos.y - fromPos.y) * t;
            const dx = mx - x, dy = my - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) minDist = dist;
        }
        if (minDist < 15) {
            deleteIndex = i;
            break;
        }
    }
    if (deleteIndex !== -1) {
        const c = connections[deleteIndex];
        const fromNode = getNode(c.fromNodeId);
        const toNode = getNode(c.toNodeId);
        if (fromNode && fromNode.ports.output) fromNode.ports.output.classList.remove('connected');
        // 集线器端口断开
        if (toNode && toNode.ports.inputs && c.toPortIndex !== undefined) {
            const port = toNode.ports.inputs[c.toPortIndex];
            if (port) port.classList.remove('connected');
        } else if (toNode && toNode.ports.input) {
            toNode.ports.input.classList.remove('connected');
        }
        connections.splice(deleteIndex, 1);
        updateConnections();
        generateCode();
        if (window.markDirty) window.markDirty();
    }
});

let connecting = false;
function startConnection(nodeId, portType, clientX, clientY) {
    if (portType !== 'output') return;
    const wrapper = document.getElementById('canvas-wrapper');
    const wrapRect = wrapper.getBoundingClientRect();
    const endX = clientX - wrapRect.left;
    const endY = clientY - wrapRect.top;
    tempLine = { fromNodeId: nodeId, fromPort: 'output', endX, endY };
    connecting = true;
    updateConnections();
    const onMove = (e) => {
        if (!tempLine) return;
        const rect = wrapper.getBoundingClientRect();
        tempLine.endX = e.clientX - rect.left;
        tempLine.endY = e.clientY - rect.top;
        updateConnections();
    };
    const onUp = (e) => {
        const target = document.elementFromPoint(e.clientX, e.clientY);
        if (target && target.classList.contains('port') && target.dataset.portType === 'input') {
            const toNodeId = parseInt(target.dataset.nodeId);
            finishConnection(toNodeId, 'input');
        }
        tempLine = null;
        connecting = false;
        updateConnections();
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
}

function finishConnection(toNodeId, portType) {
    if (!tempLine) return false;
    const fromId = tempLine.fromNodeId;
    if (fromId === toNodeId) return false;
    // 检查是否存在连接（简单去重）
    const exists = connections.some(c => c.fromNodeId === fromId && c.toNodeId === toNodeId);
    if (!exists) {
        // 检测目标端口是集线器的哪个输入端口
        const target = document.elementFromPoint(tempLine.endX, tempLine.endY);
        let portIndex = 0;
        if (target && target.classList.contains('port') && target.dataset.portType === 'input') {
            portIndex = parseInt(target.dataset.portIndex) || 0;
        }
        connections.push({
            fromNodeId: fromId,
            toNodeId: toNodeId,
            fromPort: 'output',
            toPort: 'input',
            toPortIndex: portIndex  // 记录集线器端口索引
        });
        const fromNode = getNode(fromId);
        const toNode = getNode(toNodeId);
        if (fromNode) fromNode.ports.output.classList.add('connected');
        if (toNode && toNode.ports.inputs && toNode.ports.inputs[portIndex]) {
            toNode.ports.inputs[portIndex].classList.add('connected');
        } else if (toNode && toNode.ports.input) {
            toNode.ports.input.classList.add('connected');
        }
    }
    tempLine = null;
    updateConnections();
    generateCode();
    if (window.markDirty) window.markDirty();
    return true;
}