// ============================================================
// 2. 全局标签管理
// ============================================================
window.labels = ['输入源', '熔炉', '磨粉机', '输出箱'];

function renderLabelManager() {
    const container = document.getElementById('label-manager');
    let html = '';
    window.labels.forEach((label, index) => {
        html += `<div class="label-item"><span>${label}</span><button onclick="editLabel(${index})">✎</button><button onclick="deleteLabel(${index})">✕</button></div>`;
    });
    html += `<div class="add-label"><input type="text" id="new-label-input" placeholder="新标签名称"><button onclick="addLabel()">添加</button></div>`;
    container.innerHTML = html;
    refreshAllNodeLabels();
}

function addLabel() {
    const input = document.getElementById('new-label-input');
    const name = input.value.trim();
    if (!name) return;
    if (window.labels.includes(name)) { alert('标签已存在'); return; }
    window.labels.push(name);
    input.value = '';
    renderLabelManager();
    generateCode();
    if (window.markDirty) window.markDirty();
}

function deleteLabel(index) {
    const label = window.labels[index];
    if (!confirm(`确认删除标签 "${label}" ？`)) return;
    window.labels.splice(index, 1);
    nodes.forEach(n => {
        if (n.settings.label === label) n.settings.label = window.labels.length ? window.labels[0] : '';
        if (n.settings.leftLabel === label) n.settings.leftLabel = window.labels.length ? window.labels[0] : '';
        if (n.settings.rightLabel === label) n.settings.rightLabel = window.labels.length ? window.labels[0] : '';
    });
    renderLabelManager();
    generateCode();
    if (window.markDirty) window.markDirty();
}

function editLabel(index) {
    const oldName = window.labels[index];
    const newName = prompt('请输入新标签名：', oldName);
    if (!newName || newName === oldName) return;
    if (window.labels.includes(newName) && newName !== oldName) {
        alert('标签已存在');
        return;
    }
    window.labels[index] = newName;
    nodes.forEach(n => {
        if (n.settings.label === oldName) n.settings.label = newName;
        if (n.settings.leftLabel === oldName) n.settings.leftLabel = newName;
        if (n.settings.rightLabel === oldName) n.settings.rightLabel = newName;
    });
    renderLabelManager();
    generateCode();
    if (window.markDirty) window.markDirty();
}

function refreshAllNodeLabels() {
    nodes.forEach(n => {
        const sel = n.element?.querySelector('.label-select');
        if (sel) {
            const current = n.settings.label;
            sel.innerHTML = window.labels.map(l => `<option value="${l}" ${l === current ? 'selected' : ''}>${l}</option>`).join('');
            if (!window.labels.includes(current) && window.labels.length) {
                n.settings.label = window.labels[0];
                sel.value = window.labels[0];
            }
        }
        const leftSel = n.element?.querySelector('.left-label-select');
        if (leftSel) {
            const current = n.settings.leftLabel || window.labels[0];
            leftSel.innerHTML = window.labels.map(l => `<option value="${l}" ${l === current ? 'selected' : ''}>${l}</option>`).join('');
            if (!window.labels.includes(current) && window.labels.length) {
                n.settings.leftLabel = window.labels[0];
                leftSel.value = window.labels[0];
            }
        }
        const rightSel = n.element?.querySelector('.right-label-select');
        if (rightSel) {
            const current = n.settings.rightLabel || window.labels[0];
            rightSel.innerHTML = window.labels.map(l => `<option value="${l}" ${l === current ? 'selected' : ''}>${l}</option>`).join('');
            if (!window.labels.includes(current) && window.labels.length) {
                n.settings.rightLabel = window.labels[0];
                rightSel.value = window.labels[0];
            }
        }
    });
}