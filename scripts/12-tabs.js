// ============================================================
//  12. Tab 切换（完全控制显示/隐藏）
// ============================================================
(function() {
    const panel = document.getElementById('right-panel');
    if (!panel) return;

    function switchTab(tabId) {
        panel.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        const btn = panel.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        if (btn) btn.classList.add('active');

        panel.querySelectorAll('.tab-content').forEach(c => {
            c.style.display = 'none';
            c.classList.remove('active');
        });
        const content = document.getElementById(`tab-${tabId}`);
        if (content) {
            content.style.display = 'flex';
            content.classList.add('active');
        }

        if (tabId === 'labels' && typeof renderLabelManager === 'function') {
            renderLabelManager();
        }
        if (tabId === 'settings' && typeof renderSettingsContent === 'function') {
            renderSettingsContent();
        }
    }

    panel.addEventListener('click', function(e) {
        const btn = e.target.closest('.tab-btn');
        if (!btn) return;
        const tabId = btn.dataset.tab;
        if (!tabId) return;
        switchTab(tabId);
    });

    window.switchTab = switchTab;

    // ★ 不再自动激活任何 tab，由项目管理器控制
    console.log('✅ Tab 切换控制已初始化');
})();