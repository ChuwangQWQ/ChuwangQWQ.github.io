// ============================================================
//  9. 代码生成（支持条件节点、集线器、each 数量）
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

        // 构建每个输入对应的输出结构（用于合并 each）
        const outputStructuresByInput = {};
        inputLabels.forEach(label => {
            const ps = inputMap[label];
            const structures = ps.map(p => {
                // 提取输出参数（hub 之后到 output 之前，ioScope === 'output'）
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

        const firstKeys = outputStructuresByInput[inputLabels[0]].map(s => s.key);
        let allSame = true;
        for (let i = 1; i < inputLabels.length; i++) {
            const currentKeys = outputStructuresByInput[inputLabels[i]].map(s => s.key);
            if (JSON.stringify(firstKeys) !== JSON.stringify(currentKeys)) {
                allSame = false;
                break;
            }
        }

        // 检查输入参数是否相同
        let inputParamsSame = true;
        let firstInputParts = null;
        inputLabels.forEach(label => {
            const p = inputMap[label][0];
            const hubIndex = p.fullPath.findIndex(n => n.type === 'hub');
            let inputNodes = [];
            if (hubIndex !== -1) {
                inputNodes = p.fullPath.slice(1, hubIndex);
            } else {
                inputNodes = p.fullPath.slice(1, -1);
            }
            inputNodes = inputNodes.filter(n => n.ioScope === 'input' && n.type !== 'base' && n.type !== 'hub' && n.type !== 'output');
            const parts = buildPartsFromNodes(inputNodes);
            const key = parts.join('|');
            if (firstInputParts === null) {
                firstInputParts = key;
            } else if (firstInputParts !== key) {
                inputParamsSame = false;
            }
        });

        // 生成语句（含条件处理）
        const lines = [];

        if (allSame && inputLabels.length > 1 && inputParamsSame) {
            // 合并输入（each）
            const p = inputMap[inputLabels[0]][0];
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
                inputLine = `input ${inputParts.join(' ')} from each ${inputLabels.map(l => `"${l}"`).join(' ')}`;
            } else {
                inputLine = `input from each ${inputLabels.map(l => `"${l}"`).join(' ')}`;
            }

            // 检查是否有条件节点（取第一个路径）
            const condNode = p.fullPath.find(n => n.type === 'condition');
            if (condNode) {
                const condStr = buildConditionString(condNode);
                lines.push(`if ${condStr} then`);
                lines.push(`    ${inputLine}`);
                // 输出去重
                const uniqueStructures = [];
                const seenKeys = new Set();
                outputStructuresByInput[inputLabels[0]].forEach(s => {
                    if (!seenKeys.has(s.key)) {
                        seenKeys.add(s.key);
                        uniqueStructures.push(s);
                    }
                });
                uniqueStructures.forEach(s => {
                    let outputLine = '';
                    if (s.parts.length) {
                        outputLine = `output ${s.parts.join(' ')} to "${s.label}"`;
                    } else {
                        outputLine = `output to "${s.label}"`;
                    }
                    lines.push(`    ${outputLine}`);
                });
                lines.push('end');
            } else {
                lines.push(inputLine);
                const uniqueStructures = [];
                const seenKeys = new Set();
                outputStructuresByInput[inputLabels[0]].forEach(s => {
                    if (!seenKeys.has(s.key)) {
                        seenKeys.add(s.key);
                        uniqueStructures.push(s);
                    }
                });
                uniqueStructures.forEach(s => {
                    let outputLine = '';
                    if (s.parts.length) {
                        outputLine = `output ${s.parts.join(' ')} to "${s.label}"`;
                    } else {
                        outputLine = `output to "${s.label}"`;
                    }
                    lines.push(outputLine);
                });
            }
        } else {
            // 不能合并，分别生成每个输入
            inputLabels.forEach(label => {
                const ps = inputMap[label];
                // 每个 base 只取第一条路径生成 input
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

                // 检查该路径是否有条件节点
                const condNode = p.fullPath.find(n => n.type === 'condition');
                if (condNode) {
                    const condStr = buildConditionString(condNode);
                    lines.push(`if ${condStr} then`);
                    lines.push(`    ${inputLine}`);
                    // 输出语句（该输入可能对应多个输出路径）
                    ps.forEach(p2 => {
                        const hubIndex2 = p2.fullPath.findIndex(n => n.type === 'hub');
                        let outputNodes = [];
                        if (hubIndex2 !== -1) {
                            outputNodes = p2.fullPath.slice(hubIndex2 + 1, -1);
                        } else {
                            outputNodes = p2.fullPath.slice(1, -1);
                        }
                        outputNodes = outputNodes.filter(n => n.ioScope === 'output' && n.type !== 'base' && n.type !== 'hub' && n.type !== 'output');
                        const outputParts = buildPartsFromNodes(outputNodes);
                        const outputLabel = p2.outputNode.settings.label || '未命名';
                        let outputLine = '';
                        if (outputParts.length) {
                            outputLine = `output ${outputParts.join(' ')} to "${outputLabel}"`;
                        } else {
                            outputLine = `output to "${outputLabel}"`;
                        }
                        lines.push(`    ${outputLine}`);
                    });
                    lines.push('end');
                } else {
                    lines.push(inputLine);
                    ps.forEach(p2 => {
                        const hubIndex2 = p2.fullPath.findIndex(n => n.type === 'hub');
                        let outputNodes = [];
                        if (hubIndex2 !== -1) {
                            outputNodes = p2.fullPath.slice(hubIndex2 + 1, -1);
                        } else {
                            outputNodes = p2.fullPath.slice(1, -1);
                        }
                        outputNodes = outputNodes.filter(n => n.ioScope === 'output' && n.type !== 'base' && n.type !== 'hub' && n.type !== 'output');
                        const outputParts = buildPartsFromNodes(outputNodes);
                        const outputLabel = p2.outputNode.settings.label || '未命名';
                        let outputLine = '';
                        if (outputParts.length) {
                            outputLine = `output ${outputParts.join(' ')} to "${outputLabel}"`;
                        } else {
                            outputLine = `output to "${outputLabel}"`;
                        }
                        lines.push(outputLine);
                    });
                }
            });
        }

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

// ---------- 构建条件字符串 ----------
function buildConditionString(node) {
    const s = node.settings;
    const left = `"${s.leftLabel}"`;
    const compare = s.compare;
    let right;
    if (s.rightType === 'number') {
        right = s.rightNumber;
    } else {
        right = `"${s.rightLabel}"`;
    }
    return `${left} has ${compare} ${right}`;
}

// ---------- 路径收集（不变） ----------
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

// ---------- 构建参数（不变） ----------
function buildPartsFromNodes(nodeList) {
    const parts = [];
    let currentResType = null;
    let hasResId = false;

    nodeList.forEach(node => {
        const s = node.settings;
        if (node.type === 'num') {
            parts.push(s.number);
            if (s.each) parts.push('each');
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