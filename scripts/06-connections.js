// ============================================================
//  6. 连线系统（修复：节点 ID 强制字符串比较）
// ============================================================
const canvas = document.getElementById('connection-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    const wrapper = document.getElementById('canvas-wrapper');
    if (!wrapper) return;
    canvas.width = wrapper.clientWidth;
    canvas.height = wrapper.clientHeight;
    updateConnections();
}

function getPortPosition(nodeId, portType, portIndex) {
    // 强制转换为字符串
    const node = getNode(String(nodeId));
    if (!node) {
        console.warn('getPortPosition: 节点不存在', nodeId);
        return null;
    }
    if (!node.element) {
        console.warn('getPortPosition: 节点元素不存在', nodeId);
        return null;
    }
    const wrapper = document.getElementById('canvas-wrapper');
    if (!wrapper) return null;
    const wrapRect = wrapper.getBoundingClientRect();
    const rect = node.element.getBoundingClientRect();

    if (rect.width === 0 || rect.height === 0) {
        console.warn('getPortPosition: 节点尺寸为0', nodeId);
        return null;
    }

    if (node.type === 'hub' && portType === 'input') {
        const ports = node.ports.inputs || [];
        const idx = (portIndex !== undefined && portIndex < ports.length) ? portIndex : 0;
        const port = ports[idx];
        if (port) {
            const portRect = port.getBoundingClientRect();
            return {
                x: portRect.left - wrapRect.left + portRect.width / 2,
                y: portRect.top - wrapRect.top + portRect.height / 2
            };
        }
        if (ports.length > 0) {
            const port = ports[0];
            const portRect = port.getBoundingClientRect();
            return {
                x: portRect.left - wrapRect.left + portRect.width / 2,
                y: portRect.top - wrapRect.top + portRect.height / 2
            };
        }
        return {
            x: rect.left - wrapRect.left,
            y: rect.top - wrapRect.top + rect.height / 2
        };
    }

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
        const fromPos = getPortPosition(c.fromNodeId, 'output', c.fromPortIndex);
        const toPos = getPortPosition(c.toNodeId, 'input', c.toPortIndex);
        if (fromPos && toPos) {
            drawCurve(fromPos.x, fromPos.y, toPos.x, toPos.y, '#e67e22', 3);
        } else {
            console.warn('更新连接失败:', c, fromPos, toPos);
        }
    });
    if (tempLine) {
        const fromPos = getPortPosition(tempLine.fromNodeId, 'output');
        if (fromPos) {
            drawCurve(fromPos.x, fromPos.y, tempLine.endX, tempLine.endY, '#ffaa00', 2, true);
        }
    }
}

function drawCurve(x1, y1, x2, y2, color, width, dash) {
    if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) return;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    const dx = Math.abs(x2 - x1);
    const maxOffset = Math.min(120, dx * 0.75);
    const offset = Math.max(10, maxOffset);
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

document.addEventListener('dblclick', function (e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (mx < 0 || mx > rect.width || my < 0 || my > rect.height) return;
    let deleteIndex = -1;
    for (let i = 0; i < connections.length; i++) {
        const c = connections[i];
        const fromPos = getPortPosition(c.fromNodeId, 'output', c.fromPortIndex);
        const toPos = getPortPosition(c.toNodeId, 'input', c.toPortIndex);
        if (!fromPos || !toPos) continue;
        const steps = 20;
        let minDist = Infinity;
        for (let t = 0; t <= 1; t += 1 / steps) {
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
        if (fromNode && fromNode.ports.output) {
            fromNode.ports.output.classList.remove('connected');
        }
        if (toNode && toNode.ports.input) {
            toNode.ports.input.classList.remove('connected');
        } else if (toNode && toNode.ports.inputs && c.toPortIndex !== undefined) {
            const port = toNode.ports.inputs[c.toPortIndex];
            if (port) port.classList.remove('connected');
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
    if (!wrapper) return;
    const wrapRect = wrapper.getBoundingClientRect();
    const endX = clientX - wrapRect.left;
    const endY = clientY - wrapRect.top;
    tempLine = { fromNodeId: String(nodeId), fromPort: 'output', endX, endY };
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
            const toNodeId = target.dataset.nodeId;
            console.log('onUp: 目标端口节点ID', toNodeId, '类型', typeof toNodeId);
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
    const fromStr = String(fromId);
    const toStr = String(toNodeId);
    console.log('finishConnection: from', fromStr, 'to', toStr);
    if (fromStr === toStr) {
        console.warn('finishConnection: 不能自连');
        tempLine = null;
        return false;
    }
    const exists = connections.some(c => String(c.fromNodeId) === fromStr && String(c.toNodeId) === toStr);
    if (!exists) {
        const target = document.elementFromPoint(tempLine.endX, tempLine.endY);
        let portIndex = 0;
        if (target && target.classList.contains('port') && target.dataset.portType === 'input') {
            portIndex = parseInt(target.dataset.portIndex) || 0;
        }
        const fromNode = getNode(fromStr);
        const toNode = getNode(toStr);
        if (!toNode) {
            console.warn('finishConnection: 目标节点不存在', toStr);
            tempLine = null;
            return false;
        }
        const conn = {
            fromNodeId: fromStr,
            toNodeId: toStr,
            fromPort: 'output',
            toPort: 'input',
            toPortIndex: portIndex,
            fromPortIndex: 0
        };
        connections.push(conn);
        if (fromNode && fromNode.ports.output) {
            fromNode.ports.output.classList.add('connected');
        }
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

window.addEventListener('resize', resizeCanvas);