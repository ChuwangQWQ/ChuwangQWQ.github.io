// ============================================================
//  9. 代码生成（支持条件节点合并，修复多分支问题）
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

        // 对路径进行分组：按 input 签名 + 条件节点 ID 序列
        const groups = {};
        paths.forEach(path => {
            // 提取 input 节点（排除 base、output、hub、condition）
            const inputNodes = path.filter(n => n.ioScope === 'input' && n.type !== 'base' && n.type !== 'output' && n.type !== 'hub' && n.type !== 'condition');
            const inputSig = inputNodes.map(n => `${n.type}_${JSON.stringify(n.settings)}`).join('|');

            // 提取条件节点 ID 序列（按路径顺序）
            const condNodes = path.filter(n => n.type === 'condition');
            const condSig = condNodes.map(n => n.id).join('|');

            const key = inputSig + '###' + condSig;
            if (!groups[key]) groups[key] = [];
            groups[key].push(path);
        });

        // 对每个分组生成语句
        Object.values(groups).forEach(group => {
            const firstPath = group[0];
            const inputNodes = firstPath.filter(n => n.ioScope === 'input' && n.type !== 'base' && n.type !== 'output' && n.type !== 'hub' && n.type !== 'condition');
            const condNodes = firstPath.filter(n => n.type === 'condition');

            const inputLine = buildStatementLine(inputNodes, 'input', start.settings.label);

            if (condNodes.length === 0) {
                // 无条件：合并 input 和所有 output
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
                // 有条件：生成一个 if 块，内部包含所有 output
                const outputLines = group.map(path => {
                    const outputNode = path[path.length - 1];
                    const outputNodes = path.filter(n => n.ioScope === 'output' && n.type !== 'base' && n.type !== 'output' && n.type !== 'hub' && n.type !== 'condition');
                    return buildStatementLine(outputNodes, 'output', outputNode.settings.label);
                });

                // 构建 if 语句（只使用第一个条件节点，因为所有路径共享相同的条件节点序列）
                // 注意：如果路径中有多个条件节点，我们按顺序嵌套（但通常只有一个）
                const conditionLines = [];
                condNodes.forEach(cond => {
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
                outputLines.forEach(line => {
                    lines.push(indentStr + line);
                });
                for (let i = 0; i < level; i++) {
                    lines.push('    '.repeat(level - i - 1) + 'end');
                }

                allBlocks.push({
                    tick: start.settings.tick || 20,
                    startId: start.id,
                    lines: lines
                });
            }
        });
    });

    // 按 tick 分组，再按 startId 分组，组间插入 forget
    const groups = {};
    allBlocks.forEach(item => {
        const key = item.tick;
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
    });

    let finalCode = '';
    const keys = Object.keys(groups).sort((a, b) => a - b);
    keys.forEach(tick => {
        const items = groups[tick];
        const startGroups = {};
        items.forEach(item => {
            if (!startGroups[item.startId]) startGroups[item.startId] = [];
            startGroups[item.startId].push(item.lines);
        });

        const startIds = Object.keys(startGroups);
        let allLines = [];
        startIds.forEach((sid, idx) => {
            const lines = startGroups[sid].flat();
            allLines = allLines.concat(lines);
            if (idx < startIds.length - 1) {
                allLines.push('forget');
            }
        });

        if (allLines.length === 0) return;
        finalCode += `every ${tick} ticks do\n`;
        allLines.forEach(line => {
            finalCode += `    ${line}\n`;
        });
        finalCode += 'end\n';
    });

    if (!finalCode) finalCode = '// 没有可生成的代码，请检查连接';
    document.getElementById('code-output').value = finalCode.trim();
}

// 从路径生成语句行数组（备用，实际已整合到 generateCode 中）
function buildLinesFromPath(path, inputLabel) {
    // 此函数保留但不再使用
    return [];
}

// 构建单个 input/output 行（参数顺序：数量、each、资源ID、保留、方向、槽位）
function buildStatementLine(nodes, type, label) {
    let number = null;
    let each = false;
    let resourceId = null;
    let retain = null;
    let side = null;
    let slots = null;
    let empty = false;
    let resourceType = null;

    nodes.forEach(node => {
        const s = node.settings;
        if (node.type === 'num') {
            number = s.number;
            each = s.each;
        } else if (node.type === 'resType') {
            resourceType = s.resourceType;
        } else if (node.type === 'resId') {
            let id = s.resourceId;
            if (resourceType) {
                const typeMap = { item: '', fluid: 'fluid::', energy: 'forge_energy::', gas: 'gas::' };
                const prefix = typeMap[resourceType] || '';
                if (prefix) id = prefix + id;
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

// ---------- collectPaths（条件节点作为普通节点处理） ----------
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