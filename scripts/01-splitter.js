// ============================================================
// 1. 拖拽分隔条（修复 resizeCanvas 未定义）
// ============================================================
(function initSplitter() {
    const container = document.getElementById('app-container');
    const left = document.getElementById('canvas-wrapper');
    const right = document.getElementById('right-panel');
    const splitter = document.getElementById('splitter');
    let isDragging = false, startX = 0, startLeftWidth = 0;

    // 安全调用 resizeCanvas
    function safeResizeCanvas() {
        if (typeof resizeCanvas === 'function') {
            resizeCanvas();
        }
    }

    splitter.addEventListener('mousedown', function (e) {
        isDragging = true;
        startX = e.clientX;
        startLeftWidth = left.getBoundingClientRect().width;
        splitter.classList.add('active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
        if (!isDragging) return;
        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const offsetX = e.clientX - containerRect.left;
        const newLeftPercent = Math.max(15, Math.min(85, (offsetX / containerWidth) * 100));
        const newRightPercent = 100 - newLeftPercent - (6 / containerWidth * 100);
        left.style.flex = `0 0 ${newLeftPercent}%`;
        right.style.flex = `0 0 ${newRightPercent}%`;
        safeResizeCanvas();
    });

    document.addEventListener('mouseup', function (e) {
        if (isDragging) {
            isDragging = false;
            splitter.classList.remove('active');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });

    // 窗口大小变化时调用
    window.addEventListener('resize', safeResizeCanvas);

    // 所有脚本加载完成后，确保画布尺寸正确
    window.addEventListener('load', function () {
        safeResizeCanvas();
    });
})();