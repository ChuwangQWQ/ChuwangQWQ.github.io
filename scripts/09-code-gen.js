// ============================================================
//  9. 代码生成（不合并多个输入，每个 base 独立生成 input）
// ============================================================

function generateCode() {
    refreshAllNodeLabels();

    const starters = nodes.filter(n => n.type === 'base' && !connections.some(c => c.toNodeId === n.id));

    if (starters.length === 0) {
        document.getElementById('code-output').value = '// 请添加一个输入节点并连接';
        return;
    }

    const allPaths = [];
    starters.forEach(start => {
        const paths = collectPaths(start, []);
        paths.forEach(path => {
            const last = path[path.length - 1];
            if (last.type === 'output') {
                allPaths.push({
                    start: start,
                    fullPath: path,
                    outputNode: last,
                    tick: start.settings.tick || 20
                });
            }
        });
    });

    if (allPaths.length === 0) {
        document.getElementById('code-output').value = '// 没有有效的输出路径';
        return;
    }

    const groups = {};
    allPaths.forEach(p => {
        const key = p.tick;
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
    });

    let finalCode = '';
    const keys = Object.keys(groups).sort((a, b) => a - b);

    keys.forEach(tick => {
        const paths = groups[tick];

        const inputMap = {};
        paths.forEach(p => {
            const label = p.start.settings.label || '未命名';
            if (!inputMap[label]) inputMap[label] = [];
            inputMap[label].push(p);
        });

        const inputLabels = Object.keys(inputMap);

        // 构建每个输入对应的输出结构（用于去重 output）
        const outputStructuresByInput = {};
        inputLabels.forEach(label => {
            const ps = inputMap[label];
            const structures = ps.map(p => {
                const hubIndex = p.fullPath.findIndex(n => n.type === 'hub');
                let outputNodes = [];
                if (hubIndex !== -1) {
                    outputNodes = p.fullPath.slice(hubIndex + 1, -1);
                } else {
                    outputNodes = p.fullPath.slice(1, -1);
                }
                outputNodes = outputNodes.filter(n => n.ioScope === 'output' && n.type !== 'base' && n.type !== 'hub' && n.type !== 'output');
                const outputParts = buildPartsFromNodes(outputNodes);
                const outputLabel = p.outputNode.settings.label || '未命名';
                return {
                    label: outputLabel,
                    parts: outputParts,
                    key: outputLabel + '|' + outputParts.join('|')
                };
            });
            structures.sort((a, b) => a.key.localeCompare(b.key));
            outputStructuresByInput[label] = structures;
        });

        // 收集所有唯一的输出结构（全局去重）
        const allOutputStructures = {};
        Object.values(outputStructuresByInput).forEach(structs => {
            structs.forEach(s => {
                if (!allOutputStructures[s.key]) {
                    allOutputStructures[s.key] = {
                        label: s.label,
                        parts: s.parts,
                        outputNode: null // 我们不需要 outputNode，因为 each 由 num 节点控制
                    };
                }
            });
        });

        const lines = [];

        // 每个输入独立生成 input 语句
        inputLabels.forEach(label => {
            const ps = inputMap[label];
            // 取第一条路径获取输入参数
            const p = ps[0];
            const hubIndex = p.fullPath.findIndex(n => n.type === 'hub');
            let inputNodes = [];
            if (hubIndex !== -1) {
                inputNodes = p.fullPath.slice(1, hubIndex);
            } else {
                inputNodes = p.fullPath.slice(1, -1);
            }
            inputNodes = inputNodes.filter(n => n.ioScope === 'input' && n.type !== 'base' && n.type !== 'hub' && n.type !== 'output');
            const inputParts = buildPartsFromNodes(inputNodes);
            let inputLine = '';
            if (inputParts.length) {
                inputLine = `input ${inputParts.join(' ')} from "${label}"`;
            } else {
                inputLine = `input from "${label}"`;
            }
            lines.push(inputLine);
        });

        // 生成 output 语句（全局去重）
        Object.values(allOutputStructures).forEach(s => {
            let outputLine = '';
            if (s.parts.length) {
                outputLine = `output ${s.parts.join(' ')} to "${s.label}"`;
            } else {
                outputLine = `output to "${s.label}"`;
            }
            lines.push(outputLine);
        });

        if (lines.length) {
            finalCode += `every ${tick} ticks do\n`;
            lines.forEach(line => {
                finalCode += `    ${line}\n`;
            });
            finalCode += 'end\n';
        }
    });

    if (!finalCode) finalCode = '// 没有可生成的代码，请检查连接';
    document.getElementById('code-output').value = finalCode.trim();
}

function collectPaths(currentNode, currentPath) {
    if (currentPath.includes(currentNode)) return [];
    const newPath = [...currentPath, currentNode];

    if (currentNode.type === 'output') {
        return [newPath];
    }

    if (currentNode.type === 'hub') {
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

function buildPartsFromNodes(nodeList) {
    const parts = [];
    let currentResType = null;
    let hasResId = false;

    nodeList.forEach(node => {
        const s = node.settings;
        if (node.type === 'num') {
            parts.push(s.number);
            if (s.each) {
                parts.push('each');
            }
        } else if (node.type === 'resType') {
            currentResType = s.resourceType;
        } else if (node.type === 'resId') {
            let id = s.resourceId;
            if (currentResType) {
                const typeMap = { item: '', fluid: 'fluid::', energy: 'forge_energy::', gas: 'gas::' };
                const prefix = typeMap[currentResType] || '';
                if (prefix) id = prefix + id;
            }
            parts.push(id);
            hasResId = true;
        } else if (node.type === 'retain') {
            if (s.retain > 0) parts.push(`retain ${s.retain}`);
        } else if (node.type === 'side') {
            if (s.side !== 'any') parts.push(`${s.side} side`);
        } else if (node.type === 'slots') {
            if (s.slots) parts.push(`slots ${s.slots}`);
            if (s.empty) parts.push('empty slots in');
        }
    });

    if (currentResType && !hasResId) {
        const typeMap = { item: 'item', fluid: 'fluid::', energy: 'forge_energy::', gas: 'gas::' };
        const prefix = typeMap[currentResType] || '';
        if (prefix) parts.push(prefix);
    }

    return parts;
}
