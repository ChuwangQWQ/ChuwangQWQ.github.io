// ============================================================
//  8. 物品选择器（滚动加载）
// ============================================================
let itemData = {};
let filteredItems = [];
let displayCount = 50;
let currentDisplay = 0;
let isLoading = false;
let allLoaded = false;

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

function resetItemPicker() {
    const keyword = document.getElementById('searchInput').value.trim();
    const items = Object.keys(itemData)
        .filter(key => !keyword || key.includes(keyword) || itemData[key].name.includes(keyword))
        .map(key => ({
            key: key,
            name: itemData[key].name,
            src: itemData[key].src,
            mod: key.split(':')[0]
        }));
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
        const card = document.createElement('div');
        card.className = 'card';
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

itemList.addEventListener('scroll', function () {
    if (this.scrollTop + this.clientHeight >= this.scrollHeight - 20) {
        loadMoreItems();
    }
});

function filterItems(val) {
    const keyword = val.trim();
    const items = Object.keys(itemData)
        .filter(key => !keyword || key.includes(keyword) || itemData[key].name.includes(keyword))
        .map(key => ({
            key: key,
            name: itemData[key].name,
            src: itemData[key].src,
            mod: key.split(':')[0]
        }));
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