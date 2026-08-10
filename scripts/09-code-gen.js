// ============================================================
//  9. 代码生成（resType 可作为独立资源标识）
// ============================================================

function generateCode() {
    refreshAllNodeLabels();

    const allBlocks = [];

    const starters = nodes.filter(n => n.type === 'base' && !connections.some(c => c.toNodeId === n.id));

    if (starters.length === 0) {
        document.getElementById('code-output').value = '// 请添加一个输入节点并连接';
        return;
    }

    starters.forEach(start => {
        const paths = collectPaths(start, []);
        if (paths.length === 0) {
            allBlocks.push({
                tick: start.settings.tick || 20,
                startId: start.id,
                lines: [`input from "${start.settings.label}"`]
            });
            return;
        }

        const groups = {};
        paths.forEach(path => {
            const inputNodes = path.filter(n => n.ioScope === 'input' && n.type !== 'base' && n.type !== 'output' && n.type !== 'hub' && n.type !== 'condition');
            const condNodes = path.filter(n => n.type === 'condition');
            const condSig = condNodes.map(n => n.id).join('|');
            const inputSig = inputNodes.map(n => `${n.type}_${JSON.stringify(n.settings)}`).join('|');
            const key = inputSig + '###' + condSig;
            if (!groups[key]) groups[key] = [];
            groups[key].push(path);
        });

        Object.values(groups).forEach(group => {
            const firstPath = group[0];
            const inputNodes = firstPath.filter(n => n.ioScope === 'input' && n.type !== 'base' && n.type !== 'output' && n.type !== 'hub' && n.type !== 'condition');
            const condNodes = firstPath.filter(n => n.type === 'condition');

            const inputLine = buildStatementLine(inputNodes, 'input', start.settings.label);

            if (condNodes.length === 0) {
                const outputLines = group.map(path => {
                    const outputNode = path[path.length - 1];
                    const outputNodes = path.filter(n => n.ioScope === 'output' && n.type !== 'base' && n.type !== 'output' && n.type !== 'hub' && n.type !== 'condition');
                    return buildStatementLine(outputNodes, 'output', outputNode.settings.label);
                });
                allBlocks.push({
                    tick: start.settings.tick || 20,
                    startId: start.id,
                    lines: [inputLine, ...outputLines]
                });
            } else {
                // 有条件节点时的处理（保持不变）
                group.forEach(path => {
                    const lines = buildLinesFromPath(path, start.settings.label);
                    if (lines.length > 0) {
                        allBlocks.push({
                            tick: start.settings.tick || 20,
                            startId: start.id,
                            lines: lines
                        });
                    }
                });
            }
        });
    });

    // 按 tick 分组，组间插入 forget
    const groups = {};
    allBlocks.forEach(item => {
        const key = item.tick;
        if (!groups[key]) groups[key] = [];
        groups[key].push(item.lines);
    });

    let finalCode = '';
    const keys = Object.keys(groups).sort((a, b) => a - b);
    keys.forEach(tick => {
        const allLines = groups[tick].flat();
        if (allLines.length === 0) return;
        finalCode += `every ${tick} ticks do\n`;
        groups[tick].forEach((lines, idx) => {
            lines.forEach(line => {
                finalCode += `    ${line}\n`;
            });
            if (idx < groups[tick].length - 1) {
                finalCode += `    forget\n`;
            }
        });
        finalCode += 'end\n';
    });

    if (!finalCode) finalCode = '// 没有可生成的代码，请检查连接';
    document.getElementById('code-output').value = finalCode.trim();
}

// ---------- buildStatementLine（resType 可作为独立资源） ----------
function buildStatementLine(nodes, type, label) {
    let number = null;
    let each = false;
    let resourceId = null;
    let retain = null;
    let side = null;
    let slots = null;
    let empty = false;
    let resourceType = null;

    // 第一次遍历：收集 resourceType
    nodes.forEach(node => {
        if (node.type === 'resType') {
            resourceType = node.settings.resourceType;
        }
    });

    // 第二次遍历：构建参数
    nodes.forEach(node => {
        const s = node.settings;
        if (node.type === 'num') {
            number = s.number;
            each = s.each;
        } else if (node.type === 'resId') {
            let id = s.resourceId;
            if (resourceType) {
                const typeMap = { item: '', fluid: 'fluid::', energy: 'forge_energy::', gas: 'gas::' };
                const prefix = typeMap[resourceType] || '';
                if (prefix) id = prefix + " " + id;
            }
            resourceId = id;
        } else if (node.type === 'retain') {
            retain = s.retain;
        } else if (node.type === 'side') {
            side = s.side;
        } else if (node.type === 'slots') {
            slots = s.slots;
            empty = s.empty || false;
        }
    });

    // ★ 核心改动：如果没有 resId 但有 resourceType，且类型不是 item，则直接使用前缀作为 resourceId
    if (!resourceId && resourceType && resourceType !== 'item') {
        const typeMap = { fluid: 'fluid::', energy: 'forge_energy::', gas: 'gas::' };
        const prefix = typeMap[resourceType] || '';
        if (prefix) {
            resourceId = prefix; // 直接使用前缀，不拼接具体 ID
        }
    }

    const coreParts = [];
    if (number !== null) coreParts.push(number);
    if (each) coreParts.push('each');
    if (resourceId) coreParts.push(resourceId);
    if (retain !== null && retain > 0) coreParts.push(`retain ${retain}`);

    const keyword = (type === 'input') ? 'input' : 'output';
    const preposition = (type === 'input') ? 'from' : 'to';
    let line = `${keyword} ${coreParts.join(' ')} ${preposition} "${label}"`;
    if (side && side !== 'any') line += ` ${side} side`;
    if (slots) line += ` slot ${slots}`;
    if (type === 'input' && empty) line += ` empty`;

    return line;
}

// ---------- collectPaths ----------
function collectPaths(currentNode, currentPath) {
    if (currentPath.includes(currentNode)) return [];
    const newPath = [...currentPath, currentNode];

    if (currentNode.type === 'output') {
        return [newPath];
    }

    const outConns = connections.filter(c => c.fromNodeId === currentNode.id);
    if (outConns.length === 0) return [];

    let allPaths = [];
    outConns.forEach(conn => {
        const nextNode = getNode(conn.toNodeId);
        if (!nextNode) return;
        const subPaths = collectPaths(nextNode, newPath);
        subPaths.forEach(p => allPaths.push(p));
    });
    return allPaths;
}

// ---------- 备用函数（保留） ----------
function buildLinesFromPath(path, inputLabel) {
    const inputNodes = path.filter(n => n.ioScope === 'input' && n.type !== 'base' && n.type !== 'output' && n.type !== 'hub' && n.type !== 'condition');
    const outputNode = path[path.length - 1];
    const conditionNodes = path.filter(n => n.type === 'condition');

    const inputLine = buildStatementLine(inputNodes, 'input', inputLabel);

    let outputLine = '';
    if (outputNode.type === 'output') {
        const outputNodes = path.filter(n => n.ioScope === 'output' && n.type !== 'base' && n.type !== 'output' && n.type !== 'hub' && n.type !== 'condition');
        outputLine = buildStatementLine(outputNodes, 'output', outputNode.settings.label);
    }

    if (conditionNodes.length === 0) {
        return [inputLine, outputLine];
    }

    const conditionLines = [];
    conditionNodes.forEach(cond => {
        const s = cond.settings;
        let right = '';
        if (s.rightType === 'number') {
            right = s.rightNumber;
        } else {
            right = `"${s.rightLabel || window.labels[0]}"`;
        }
        let compare = s.compare;
        if (compare === '!=') compare = 'not ==';
        conditionLines.push(`if "${s.leftLabel}" has ${compare} ${right} then`);
    });

    const level = conditionLines.length;
    const lines = [];
    lines.push(inputLine);
    conditionLines.forEach(c => lines.push(c));
    const indentStr = '    '.repeat(level);
    lines.push(indentStr + outputLine);
    for (let i = 0; i < level; i++) {
        lines.push('    '.repeat(level - i - 1) + 'end');
    }
    return lines;
}