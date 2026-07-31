// ============================================================
//  7. 右键菜单
// ============================================================
const contextMenu = document.getElementById('contextMenu');
let menuX, menuY;

document.getElementById('canvas-wrapper').addEventListener('contextmenu', (e) => {
    e.preventDefault();
    menuX = e.clientX;
    menuY = e.clientY;
    contextMenu.style.display = 'block';
    contextMenu.style.left = e.clientX + 'px';
    contextMenu.style.top = e.clientY + 'px';
});

document.addEventListener('click', () => {
    contextMenu.style.display = 'none';
});

document.querySelectorAll('.context-menu .menu-item[data-type]').forEach(item => {
    item.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = item.dataset.type;
        const parentSub = item.closest('.sub-menu');
        let scope = 'input';
        if (parentSub) {
            scope = parentSub.dataset.scope || 'input';
        }
        const wrapper = document.getElementById('canvas-wrapper');
        const wrapRect = wrapper.getBoundingClientRect();
        const x = menuX - wrapRect.left - 90;
        const y = menuY - wrapRect.top - 40;
        createNode(type, x, y, scope);
        contextMenu.style.display = 'none';
        generateCode();
    });
});
