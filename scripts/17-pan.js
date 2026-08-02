// ============================================================
//  17. 拖拽空白区域整体平移所有节点（无缩放）
//  依赖：全局 nodes, updateConnections
// ============================================================
(function() {
    'use strict';

    const wrapper = document.getElementById('canvas-wrapper');
    if (!wrapper) return;

    let isPanning = false;
    let startMouseX = 0, startMouseY = 0;
    // 记录拖动开始时每个节点的坐标（深拷贝）
    let startNodePositions = [];

    // 判断是否点击在节点或端口上
    function isNodeOrPort(target) {
        return target.closest('.node') || target.closest('.port');
    }

    wrapper.addEventListener('mousedown', function(e) {
        // 仅左键，且不点击节点/端口/菜单/覆盖层
        if (e.button !== 0) return;
        if (isNodeOrPort(e.target)) return;
        if (e.target.closest('.context-menu') || e.target.closest('.cover')) return;

        isPanning = true;
        startMouseX = e.clientX;
        startMouseY = e.clientY;
        // 保存当前所有节点的坐标
        startNodePositions = nodes.map(n => ({ x: n.x, y: n.y }));
        wrapper.style.cursor = 'grabbing';
        e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
        if (!isPanning) return;
        const dx = e.clientX - startMouseX;
        const dy = e.clientY - startMouseY;

        // 更新所有节点坐标
        nodes.forEach((node, index) => {
            const orig = startNodePositions[index];
            if (orig) {
                node.x = orig.x + dx;
                node.y = orig.y + dy;
                // 更新DOM位置
                if (node.element) {
                    node.element.style.left = node.x + 'px';
                    node.element.style.top = node.y + 'px';
                }
            }
        });

        // 重绘连接线
        if (typeof updateConnections === 'function') {
            updateConnections();
        }
    });

    document.addEventListener('mouseup', function(e) {
        if (isPanning) {
            isPanning = false;
            wrapper.style.cursor = 'default';
            // 标记脏，自动保存位置变化
            if (window.markDirty) window.markDirty();
        }
    });

    console.log('✅ 17-pan.js 已加载（拖拽空白平移所有节点）');
})();