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

const itemPicker = document.getElementById('itemPicker');
const itemList = document.getElementById('itemList');

async function loadItemData() {
    try {
        const response = await fetch('/items.json');
        if (!response.ok) throw new Error('网络错误');
        const data = await response.json();
        itemData = data;
    } catch (e) {
        console.warn('加载 items.json 失败，使用模拟数据', e);
        itemData = {
            "minecraft:cobblestone": { "src": "img/placeholder.png", "name": "圆石" },
            "minecraft:diamond": { "src": "img/placeholder.png", "name": "钻石" },
            "minecraft:iron_ingot": { "src": "img/placeholder.png", "name": "铁锭" },
            "mekanism:ingot_osmium": { "src": "img/placeholder.png", "name": "锇锭" },
        };
    }
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
        displayName = id;
    } else {
        namespace = 'custom';
        id = keyword;
        fullId = 'custom:' + keyword;
        displayName = "自定义的 "+keyword;
    }
    return { namespace, id, fullId, displayName };
}

function resetItemPicker() {
    const keyword = document.getElementById('searchInput').value.trim();
    currentSearchKeyword = keyword;
    const items = Object.keys(itemData)
        .filter(key => !keyword || key.includes(keyword) || itemData[key].name.includes(keyword))
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
            items.unshift({
                key: '__custom__',
                name: parsed.displayName,
                src: 'img/minecraft_barrier.png',
                mod: parsed.namespace,
                // 存储原始信息以便点击时使用
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
    itemList.innerHTML = '';
    loadMoreItems();
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
                // 使用自定义物品的完整 ID
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
    const keyword = val.trim();
    currentSearchKeyword = keyword;
    const items = Object.keys(itemData)
        .filter(key => !keyword || key.includes(keyword) || itemData[key].name.includes(keyword))
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
    itemList.innerHTML = '';
    loadMoreItems();
}

function loadItems() {
    resetItemPicker();
}

itemPicker.addEventListener('click', (e) => {
    if (e.target === itemPicker) itemPicker.classList.remove('active');
});