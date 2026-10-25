// ============================================================
//  8. 物品选择器（滚动加载 + 自定义物品卡片，直接使用搜索词）
// ============================================================
let itemData = {};
let filteredItems = [];
let displayCount = 50;
let currentDisplay = 0;
let isLoading = false;
let allLoaded = false;
let currentSearchKeyword = '';

// ★ Mod 筛选相关
let modList = [];          // [{mod, count}] 按mod名排序
let enabledMods = new Set(); // 当前启用的mod集合
let allModsEnabled = true;   // 是否全部启用

// ★ 数据加载状态
let itemDataReady = false;       // 数据是否已就绪
let itemDataLoading = false;     // 是否正在加载中
const ITEM_DATA_CACHE_KEY = 'sfm_items_data'; // localStorage 键名

const itemPicker = document.getElementById('itemPicker');
const itemList = document.getElementById('itemList');
const modFilterList = document.getElementById('modFilterList');

// ★ 滚动到底部自动加载更多
itemList.addEventListener('scroll', function () {
    if (this.scrollTop + this.clientHeight >= this.scrollHeight - 40) {
        if (currentDisplay < filteredItems.length) {
            loadMoreItems();
        }
    }
});

// ★ 懒加载：优先从 localStorage 读取，否则从服务器 fetch 并缓存
async function loadItemData() {
    if (itemDataReady) return; // 已就绪，无需重复加载
    if (itemDataLoading) return; // 正在加载中，等待完成
    itemDataLoading = true;

    // 1. 尝试从 localStorage 读取
    try {
        const cached = localStorage.getItem(ITEM_DATA_CACHE_KEY);
        if (cached) {
            const data = JSON.parse(cached);
            if (data && Object.keys(data).length > 0) {
                itemData = data;
                itemDataReady = true;
                itemDataLoading = false;
                console.log('✅ 从 localStorage 加载物品数据成功');
                buildModList();
                return;
            }
        }
    } catch (e) {
        console.warn('localStorage 缓存读取失败，将从服务器下载', e);
    }

    // 2. 从服务器 fetch
    try {
        const response = await fetch('/items.json');
        if (!response.ok) throw new Error('网络错误');
        const data = await response.json();
        itemData = data;
        // 缓存到 localStorage
        try {
            localStorage.setItem(ITEM_DATA_CACHE_KEY, JSON.stringify(data));
            console.log('✅ 物品数据已缓存到 localStorage');
        } catch (storageErr) {
            console.warn('localStorage 存储失败（可能超出配额），跳过缓存', storageErr);
        }
        itemDataReady = true;
    } catch (e) {
        console.warn('加载 items.json 失败，使用模拟数据', e);
        itemData = {
            "minecraft:cobblestone": { "src": "img/placeholder.png", "name": "圆石" },
            "minecraft:diamond": { "src": "img/placeholder.png", "name": "钻石" },
            "minecraft:iron_ingot": { "src": "img/placeholder.png", "name": "铁锭" },
            "mekanism:ingot_osmium": { "src": "img/placeholder.png", "name": "锇锭" },
        };
        itemDataReady = true;
    }
    itemDataLoading = false;
    buildModList();
}

// ★ 显示"数据库下载中"提示
function showDataLoadingHint() {
    itemList.innerHTML = '';
    const hint = document.createElement('div');
    hint.className = 'data-loading-hint';
    hint.innerHTML = '<div class="data-loading-spinner"></div><span>物品数据库下载中，请稍候...</span>';
    itemList.appendChild(hint);
}

// ★ 监听 itemPicker 打开：如果数据未就绪，触发加载并显示提示
const _origItemPickerActive = itemPicker.classList;
new MutationObserver((mutations) => {
    mutations.forEach(m => {
        if (m.attributeName === 'class') {
            if (itemPicker.classList.contains('active')) {
                if (!itemDataReady) {
                    showDataLoadingHint();
                    loadItemData().then(() => {
                        // 数据就绪后自动刷新列表
                        if (itemPicker.classList.contains('active')) {
                            applyFilter();
                        }
                    });
                }
            }
        }
    });
}).observe(itemPicker, { attributes: true });

// ★ 构建mod列表并渲染复选框
function buildModList() {
    const modCountMap = {};
    Object.keys(itemData).forEach(key => {
        const mod = key.split(':')[0];
        modCountMap[mod] = (modCountMap[mod] || 0) + 1;
    });
    modList = Object.keys(modCountMap)
        .sort((a, b) => {
            // ★ minecraft 置顶
            if (a === 'minecraft') return -1;
            if (b === 'minecraft') return 1;
            return a.localeCompare(b);
        })
        .map(mod => ({ mod, count: modCountMap[mod] }));
    // 默认全部启用
    enabledMods = new Set(modList.map(m => m.mod));
    allModsEnabled = true;
    renderModFilterList();
}

// ★ 渲染mod筛选复选框列表
function renderModFilterList(searchKeyword) {
    if (!modFilterList) return;
    const keyword = (searchKeyword || '').trim().toLowerCase();
    modFilterList.innerHTML = '';
    modList.forEach(({ mod, count }) => {
        // 如果有搜索关键词，过滤mod名
        if (keyword && !mod.toLowerCase().includes(keyword)) return;
        const item = document.createElement('label');
        item.className = 'mod-checkbox-item';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = enabledMods.has(mod);
        checkbox.dataset.mod = mod;
        checkbox.addEventListener('change', onModCheckboxChange);
        const nameSpan = document.createElement('span');
        nameSpan.className = 'mod-name';
        nameSpan.textContent = mod;
        nameSpan.title = mod;
        const countSpan = document.createElement('span');
        countSpan.className = 'mod-count';
        countSpan.textContent = count;
        item.appendChild(checkbox);
        item.appendChild(nameSpan);
        item.appendChild(countSpan);
        modFilterList.appendChild(item);
    });
}

// ★ mod复选框变更事件
function onModCheckboxChange(e) {
    const mod = e.target.dataset.mod;
    if (e.target.checked) {
        enabledMods.add(mod);
    } else {
        enabledMods.delete(mod);
    }
    allModsEnabled = enabledMods.size === modList.length;
    // 重新过滤物品列表
    applyFilter();
}

// ★ 全选/全不选
const modSelectAllBtn = document.getElementById('modSelectAll');
const modSelectNoneBtn = document.getElementById('modSelectNone');
if (modSelectAllBtn) {
    modSelectAllBtn.addEventListener('click', () => {
        enabledMods = new Set(modList.map(m => m.mod));
        allModsEnabled = true;
        const si = document.getElementById('modSearchInput');
        renderModFilterList(si ? si.value : '');
        applyFilter();
    });
}
if (modSelectNoneBtn) {
    modSelectNoneBtn.addEventListener('click', () => {
        enabledMods.clear();
        allModsEnabled = false;
        const si = document.getElementById('modSearchInput');
        renderModFilterList(si ? si.value : '');
        applyFilter();
    });
}

// ★ 搜索mod列表
function filterModList(val) {
    renderModFilterList(val);
}

// ★ 统一的过滤+渲染逻辑
function applyFilter() {
    const keyword = currentSearchKeyword;
    const items = Object.keys(itemData)
        .filter(key => {
            // mod筛选
            if (!allModsEnabled && !enabledMods.has(key.split(':')[0])) return false;
            // 关键词筛选
            if (keyword && !key.includes(keyword) && !itemData[key].name.includes(keyword)) return false;
            return true;
        })
        .map(key => ({
            key: key,
            name: itemData[key].name,
            src: itemData[key].src,
            mod: key.split(':')[0]
        }));
    // ★ 在列表顶部插入自定义卡片（如果有关键词）
    if (keyword) {
        const parsed = parseKeyword(keyword);
        if (parsed) {
            // 自定义卡片不受mod筛选影响，始终显示
            items.unshift({
                key: '__custom__',
                name: parsed.displayName,
                src: 'img/minecraft_barrier.png',
                mod: parsed.namespace,
                _customFullId: parsed.fullId,
                _customDisplayName: parsed.displayName,
                _customNamespace: parsed.namespace,
                _customId: parsed.id
            });
        }
    }
    filteredItems = items;
    currentDisplay = 0;
    allLoaded = false;
    isLoading = false;
    itemList.innerHTML = '';
    loadMoreItems();
}

// 解析关键词为 { namespace, id, fullId, displayName }
function parseKeyword(keyword) {
    if (!keyword || !keyword.trim()) return null;
    keyword = keyword.trim();
    let namespace, id, fullId, displayName;
    if (keyword.includes(':')) {
        const parts = keyword.split(':');
        namespace = parts[0] || 'custom';
        id = parts.slice(1).join(':') || 'unknown';
        fullId = namespace + ':' + id;
        displayName = keyword;
    } else {
        namespace = 'custom';
        id = keyword;
        fullId = 'custom:' + keyword;
        displayName = keyword;
    }
    return { namespace, id, fullId, displayName };
}

function resetItemPicker() {
    currentSearchKeyword = document.getElementById('searchInput').value.trim();
    applyFilter();
}

function loadMoreItems() {
    if (allLoaded || isLoading) return;
    const total = filteredItems.length;
    if (currentDisplay >= total) {
        allLoaded = true;
        const indicator = document.createElement('div');
        indicator.className = 'loading-indicator';
        indicator.textContent = '— 已加载全部物品 —';
        itemList.appendChild(indicator);
        return;
    }
    isLoading = true;
    const end = Math.min(currentDisplay + displayCount, total);
    const batch = filteredItems.slice(currentDisplay, end);
    const fragment = document.createDocumentFragment();
    batch.forEach(item => {
        const card = createCard(item);
        fragment.appendChild(card);
    });
    itemList.appendChild(fragment);
    currentDisplay = end;
    isLoading = false;
    if (currentDisplay >= total) {
        allLoaded = true;
        const indicator = document.createElement('div');
        indicator.className = 'loading-indicator';
        indicator.textContent = '— 已加载全部物品 —';
        itemList.appendChild(indicator);
    }
}

function createCard(item) {
    const card = document.createElement('div');
    card.className = 'card';
    // ★ 自定义卡片特殊处理
    if (item.key === '__custom__') {
        card.style.border = '2px dashed #ff9800';
        card.style.background = '#fff8e1';
        const fullId = item._customFullId || 'custom:unknown';
        card.innerHTML = `
            <img src="${item.src}" alt="" onerror="this.src='https://via.placeholder.com/40?text=自定义'">
            <div class="info">
                <h4 style="color:#e65100;">${item.name}</h4>
                <p>${fullId}</p>
                <div class="mod">${item.mod}</div>
            </div>
        `;
        card.onclick = () => {
            const nodeId = window._currentNodeId;
            const node = getNode(nodeId);
            if (node) {
                node.setResourceId(fullId);
            }
            itemPicker.classList.remove('active');
        };
        return card;
    }

    // 普通物品卡片
    card.innerHTML = `
        <img src="${item.src}" alt="" onerror="this.src='https://via.placeholder.com/40?text=?'">
        <div class="info">
            <h4>${item.name}</h4>
            <p>${item.key}</p>
            <div class="mod">${item.mod}</div>
        </div>
    `;
    card.onclick = () => {
        const nodeId = window._currentNodeId;
        const node = getNode(nodeId);
        if (node) {
            node.setResourceId(item.key);
        }
        itemPicker.classList.remove('active');
    };
    return card;
}

function filterItems(val) {
    currentSearchKeyword = val.trim();
    applyFilter();
}

function loadItems() {
    resetItemPicker();
}

itemPicker.addEventListener('click', (e) => {
    if (e.target === itemPicker) itemPicker.classList.remove('active');
});
