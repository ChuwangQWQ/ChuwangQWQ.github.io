// ============================================================
//  4. 节点类（恢复 num 的 each，移除 base/output 的 each）
// ============================================================
class Node {
    constructor(type, x, y, scope = 'input') {
        this.id = nodeIdCounter++;
        this.type = type;
        this.ioScope = scope;
        this.x = x || 100;
        this.y = y || 100;
        this.width = 180;
        this.height = 150;
        this.settings = this.defaultSettings();
        this.ports = { input: null, output: null };
        this.element = null;
        this._idBtn = null;
        this._controlRefs = {};
        this.render();
        this.updateUI();
    }

    defaultSettings() {
        const base = { label: window.labels[0] || '未命名' };
        switch (this.type) {
            case 'base': return { ...base, tick: 20 };
            case 'num': return { number: 1, each: false };
            case 'resType': return { resourceType: 'item' };
            case 'resId': return { resourceId: 'minecraft:cobblestone' };
            case 'retain': return { retain: 0 };
            case 'side': return { side: 'any' };
            case 'slots': return { slots: '0', empty: false };
            case 'condition': return { leftLabel: window.labels[0] || '', compare: '>=', rightType: 'number', rightNumber: 10, rightLabel: window.labels[0] || '' };
            case 'output': return { ...base };
            case 'hub': return { };
            default: return base;
        }
    }

    render() {
        if (this.element) this.element.remove();

        const el = document.createElement('div');
        el.className = 'node';
        el.id = `node-${this.id}`;
        el.style.left = this.x + 'px';
        el.style.top = this.y + 'px';
        el.style.width = this.width + 'px';
        const mainColor = getNodeColor(this.type, this.ioScope);
        el.style.borderColor = mainColor;

        const header = document.createElement('div');
        header.className = 'node-header';
        header.style.background = mainColor;
        const typeNames = {
            base: '输入', num: '数量', resType: '资源类型', resId: '资源ID',
            retain: '保留', side: '方向', slots: '槽位',
            condition: '条件', output: '输出', hub: '集线器'
        };
        let label = typeNames[this.type] || this.type;
        if (this.type !== 'base' && this.type !== 'output' && this.type !== 'condition' && this.type !== 'hub') {
            label += (this.ioScope === 'input' ? ' (输入)' : ' (输出)');
        }
        header.innerHTML = `
                <span>${label}</span>
                <span class="node-type-badge">${this.type}</span>
                <span class="close-btn">✕</span>
            `;
        el.appendChild(header);

        const closeBtn = header.querySelector('.close-btn');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof deleteNode === 'function') {
                deleteNode(this.id);
            }
        });

        const body = document.createElement('div');
        body.className = 'node-body';
        body.style.background = '#fcf9f5';
        body.style.borderRadius = '0 0 10px 10px';

        const content = document.createElement('div');
        content.className = 'node-content';
        this.buildSettings(content);
        body.appendChild(content);
        el.appendChild(body);

        if (this.type !== 'output') {
            const outputPort = document.createElement('div');
            outputPort.className = 'port output';
            outputPort.dataset.nodeId = this.id;
            outputPort.dataset.portType = 'output';
            el.appendChild(outputPort);
            this.ports.output = outputPort;
        }
        if (this.type !== 'base') {
            const inputPort = document.createElement('div');
            inputPort.className = 'port input';
            inputPort.dataset.nodeId = this.id;
            inputPort.dataset.portType = 'input';
            el.appendChild(inputPort);
            this.ports.input = inputPort;
        }

        document.getElementById('canvas-wrapper').appendChild(el);
        this.element = el;

        this.bindPortEvents();
        this.enableDrag(header);

        el.addEventListener('mousedown', (e) => {
            if (e.target.closest('.port')) return;
            this.select();
        });
    }

    buildSettings(container) {
        const s = this.settings;
        // base 和 output 只显示标签（无 each）
        if (this.type === 'base' || this.type === 'output') {
            const labelWrap = document.createElement('div');
            labelWrap.className = 'setting-item';
            const labelLbl = document.createElement('label');
            labelLbl.textContent = '标签';
            labelWrap.appendChild(labelLbl);
            const select = document.createElement('select');
            select.className = 'label-select';
            select.innerHTML = window.labels.map(l => `<option value="${l}" ${l === s.label ? 'selected' : ''}>${l}</option>`).join('');
            select.onchange = () => {
                s.label = select.value;
                generateCode();
                if (window.markDirty) window.markDirty();
            };
            labelWrap.appendChild(select);
            container.appendChild(labelWrap);
            this._controlRefs.labelSelect = select;
        }

        if (this.type === 'base') {
            const tickWrap = this.addSetting(container, 'Tick', 'tick', 'number', s.tick, (v) => { s.tick = Number(v); generateCode(); });
            this._controlRefs.tickInput = tickWrap.querySelector('input');
            return;
        }
        if (this.type === 'output') return;
        if (this.type === 'hub') return;

        switch (this.type) {
            case 'num':
                const numWrap = this.addSetting(container, '数量', 'number', 'number', s.number, (v) => { s.number = Number(v); generateCode(); });
                this._controlRefs.numInput = numWrap.querySelector('input');
                // 恢复 each 复选框
                const eachWrap = document.createElement('div');
                eachWrap.className = 'setting-item checkbox-row';
                const eachLbl = document.createElement('label');
                eachLbl.textContent = 'Each (在数量后加 each)';
                const eachChk = document.createElement('input');
                eachChk.type = 'checkbox';
                eachChk.checked = s.each || false;
                eachChk.onchange = () => {
                    s.each = eachChk.checked;
                    generateCode();
                    if (window.markDirty) window.markDirty();
                };
                eachWrap.appendChild(eachLbl);
                eachWrap.appendChild(eachChk);
                container.appendChild(eachWrap);
                this._controlRefs.eachCheck = eachChk;
                break;
            case 'resType':
                const typeSel = this.addSelect(container, '资源类型', ['item', 'fluid', 'energy', 'gas'], s.resourceType, (v) => { s.resourceType = v; generateCode(); });
                this._controlRefs.resTypeSelect = typeSel;
                break;
            case 'resId':
                const idWrap = document.createElement('div');
                idWrap.className = 'setting-item';
                const idLbl = document.createElement('label');
                idLbl.textContent = '资源ID';
                const idBtn = document.createElement('button');
                idBtn.className = 'btn btn-primary';
                idBtn.textContent = s.resourceId || '选择...';
                idBtn.onclick = () => {
                    window._currentNodeId = this.id;
                    document.getElementById('itemPicker').classList.add('active');
                    resetItemPicker();
                };
                idWrap.appendChild(idLbl);
                idWrap.appendChild(idBtn);
                container.appendChild(idWrap);
                this._idBtn = idBtn;
                break;
            case 'retain':
                const retainWrap = this.addSetting(container, '保留数量', 'retain', 'number', s.retain, (v) => { s.retain = Number(v); generateCode(); });
                this._controlRefs.retainInput = retainWrap.querySelector('input');
                break;
            case 'side':
                const sideSel = this.addSelect(container, '方向', ['any', 'north', 'south', 'east', 'west', 'top', 'bottom'], s.side, (v) => { s.side = v; generateCode(); });
                this._controlRefs.sideSelect = sideSel;
                break;
            case 'slots':
                const slotsWrap = this.addSetting(container, '槽位 (如 0 或 0-4)', 'slots', 'text', s.slots, (v) => { s.slots = v; generateCode(); });
                this._controlRefs.slotsInput = slotsWrap.querySelector('input');
                const emptyWrap = document.createElement('div');
                emptyWrap.className = 'setting-item checkbox-row';
                const elbl = document.createElement('label');
                elbl.textContent = 'Empty (清空)';
                const echk = document.createElement('input');
                echk.type = 'checkbox';
                echk.checked = s.empty;
                echk.onchange = () => {
                    s.empty = echk.checked;
                    generateCode();
                    if (window.markDirty) window.markDirty();
                };
                emptyWrap.appendChild(elbl);
                emptyWrap.appendChild(echk);
                container.appendChild(emptyWrap);
                this._controlRefs.emptyCheck = echk;
                break;
            case 'condition':
                // ... 条件节点不变
                const leftWrap = document.createElement('div');
                leftWrap.className = 'setting-item';
                const leftLbl = document.createElement('label');
                leftLbl.textContent = '左操作数 (标签)';
                leftWrap.appendChild(leftLbl);
                const leftSel = document.createElement('select');
                leftSel.className = 'left-label-select';
                leftSel.innerHTML = window.labels.map(l => `<option value="${l}" ${l === s.leftLabel ? 'selected' : ''}>${l}</option>`).join('');
                leftSel.onchange = () => {
                    s.leftLabel = leftSel.value;
                    generateCode();
                    if (window.markDirty) window.markDirty();
                };
                leftWrap.appendChild(leftSel);
                container.appendChild(leftWrap);
                this._controlRefs.leftLabelSelect = leftSel;

                const compSel = this.addSelect(container, '比较符', ['>=', '<=', '>', '<', '==', '!='], s.compare, (v) => { s.compare = v; generateCode(); });
                this._controlRefs.compareSelect = compSel;

                const rightWrap = document.createElement('div');
                rightWrap.className = 'setting-item';
                const rightLbl = document.createElement('label');
                rightLbl.textContent = '右操作数';
                rightWrap.appendChild(rightLbl);
                const rightGroup = document.createElement('div');
                rightGroup.className = 'inline-group';
                const typeSel2 = document.createElement('select');
                typeSel2.innerHTML = `<option value="number" ${s.rightType === 'number' ? 'selected' : ''}>数字</option><option value="label" ${s.rightType === 'label' ? 'selected' : ''}>标签</option>`;
                typeSel2.onchange = () => {
                    s.rightType = typeSel2.value;
                    this._controlRefs.rightNumberInput.style.display = s.rightType === 'number' ? 'block' : 'none';
                    this._controlRefs.rightLabelSelect.style.display = s.rightType === 'label' ? 'block' : 'none';
                    generateCode();
                    if (window.markDirty) window.markDirty();
                };
                rightGroup.appendChild(typeSel2);
                const rightNumberInput = document.createElement('input');
                rightNumberInput.type = 'number';
                rightNumberInput.value = s.rightNumber;
                rightNumberInput.style.display = s.rightType === 'number' ? 'block' : 'none';
                rightNumberInput.oninput = () => {
                    s.rightNumber = Number(rightNumberInput.value);
                    generateCode();
                    if (window.markDirty) window.markDirty();
                };
                rightGroup.appendChild(rightNumberInput);
                const rightLabelSelect = document.createElement('select');
                rightLabelSelect.className = 'right-label-select';
                rightLabelSelect.style.display = s.rightType === 'label' ? 'block' : 'none';
                rightLabelSelect.innerHTML = window.labels.map(l => `<option value="${l}" ${l === s.rightLabel ? 'selected' : ''}>${l}</option>`).join('');
                rightLabelSelect.onchange = () => {
                    s.rightLabel = rightLabelSelect.value;
                    generateCode();
                    if (window.markDirty) window.markDirty();
                };
                rightGroup.appendChild(rightLabelSelect);
                rightWrap.appendChild(rightGroup);
                container.appendChild(rightWrap);
                this._controlRefs.rightTypeSelect = typeSel2;
                this._controlRefs.rightNumberInput = rightNumberInput;
                this._controlRefs.rightLabelSelect = rightLabelSelect;
                break;
        }
    }

    addSetting(container, labelText, key, type, value, onChange) {
        const wrap = document.createElement('div');
        wrap.className = 'setting-item';
        const lbl = document.createElement('label');
        lbl.textContent = labelText;
        wrap.appendChild(lbl);
        const input = document.createElement('input');
        input.type = type;
        input.value = value;
        input.oninput = () => {
            onChange(input.value);
            if (window.markDirty) window.markDirty();
        };
        wrap.appendChild(input);
        container.appendChild(wrap);
        return wrap;
    }

    addSelect(container, labelText, options, selected, onChange) {
        const wrap = document.createElement('div');
        wrap.className = 'setting-item';
        const lbl = document.createElement('label');
        lbl.textContent = labelText;
        wrap.appendChild(lbl);
        const sel = document.createElement('select');
        options.forEach(opt => {
            const op = document.createElement('option');
            op.value = opt;
            op.textContent = opt;
            if (opt === selected) op.selected = true;
            sel.appendChild(op);
        });
        sel.onchange = () => onChange(sel.value);
        wrap.appendChild(sel);
        container.appendChild(wrap);
        return sel;
    }

    updateUI() {
        const s = this.settings;
        if (this._controlRefs.labelSelect) {
            this._controlRefs.labelSelect.value = s.label;
        }
        if (this._controlRefs.eachCheck) {
            this._controlRefs.eachCheck.checked = s.each || false;
        }
        if (this.type === 'base' && this._controlRefs.tickInput) {
            this._controlRefs.tickInput.value = s.tick;
        }
        if (this.type === 'num') {
            if (this._controlRefs.numInput) this._controlRefs.numInput.value = s.number;
        }
        if (this.type === 'resType' && this._controlRefs.resTypeSelect) {
            this._controlRefs.resTypeSelect.value = s.resourceType;
        }
        if (this.type === 'resId' && this._idBtn) {
            this._idBtn.textContent = s.resourceId || '选择...';
        }
        if (this.type === 'retain' && this._controlRefs.retainInput) {
            this._controlRefs.retainInput.value = s.retain;
        }
        if (this.type === 'side' && this._controlRefs.sideSelect) {
            this._controlRefs.sideSelect.value = s.side;
        }
        if (this.type === 'slots') {
            if (this._controlRefs.slotsInput) this._controlRefs.slotsInput.value = s.slots;
            if (this._controlRefs.emptyCheck) this._controlRefs.emptyCheck.checked = s.empty;
        }
        if (this.type === 'condition') {
            if (this._controlRefs.leftLabelSelect) this._controlRefs.leftLabelSelect.value = s.leftLabel;
            if (this._controlRefs.compareSelect) this._controlRefs.compareSelect.value = s.compare;
            if (this._controlRefs.rightTypeSelect) {
                this._controlRefs.rightTypeSelect.value = s.rightType;
                this._controlRefs.rightNumberInput.style.display = s.rightType === 'number' ? 'block' : 'none';
                this._controlRefs.rightLabelSelect.style.display = s.rightType === 'label' ? 'block' : 'none';
            }
            if (this._controlRefs.rightNumberInput) this._controlRefs.rightNumberInput.value = s.rightNumber;
            if (this._controlRefs.rightLabelSelect) this._controlRefs.rightLabelSelect.value = s.rightLabel;
        }
    }

    bindPortEvents() {
        const ports = [this.ports.input, this.ports.output];
        ports.forEach(port => {
            if (!port) return;
            port.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                const type = port.dataset.portType;
                const nodeId = this.id;
                if (type === 'output') {
                    startConnection(nodeId, 'output', e.clientX, e.clientY);
                } else if (type === 'input') {
                    finishConnection(nodeId, 'input');
                }
            });
        });
    }

    enableDrag(header) {
        let isDragging = false, offsetX, offsetY;
        const onPointerDown = (e) => {
            if (e.target.closest('.close-btn')) return;
            isDragging = true;
            const rect = this.element.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            this.element.setPointerCapture(e.pointerId);
            this.element.style.cursor = 'grabbing';
            e.preventDefault();
        };
        const onPointerMove = (e) => {
            if (!isDragging) return;
            const wrapper = document.getElementById('canvas-wrapper');
            const wrapRect = wrapper.getBoundingClientRect();
            let newX = e.clientX - wrapRect.left - offsetX;
            let newY = e.clientY - wrapRect.top - offsetY;
            newX = Math.max(0, Math.min(newX, wrapper.clientWidth - this.width));
            newY = Math.max(0, Math.min(newY, wrapper.clientHeight - 80));
            this.x = newX;
            this.y = newY;
            this.element.style.left = newX + 'px';
            this.element.style.top = newY + 'px';
            updateConnections();
        };
        const onPointerUp = (e) => {
            if (isDragging) {
                isDragging = false;
                this.element.style.cursor = 'default';
                this.element.releasePointerCapture(e.pointerId);
                if (window.markDirty) window.markDirty();
            }
        };
        header.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
    }

    select() {
        if (selectedNodeId !== null) {
            const prev = getNode(selectedNodeId);
            if (prev) prev.element.classList.remove('selected');
        }
        selectedNodeId = this.id;
        this.element.classList.add('selected');
    }

    setResourceId(id) {
        this.settings.resourceId = id;
        if (this._idBtn) this._idBtn.textContent = id;
        generateCode();
        if (window.markDirty) window.markDirty();
    }
}