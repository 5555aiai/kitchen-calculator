// ============ 全局状态 ============
let editDishId = null;
let currentTab = 'home';
let allDishes = [];
let sortOrder = 'default';
let priceMin = '';
let priceMax = '';
let searchKeyword = '';

// ============ 初始化 ============
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  switchTab('home');
});

function loadData() {
  const data = loadAll();
  allDishes = Array.isArray(data) ? data : [];
}

function saveData() {
  saveAll(allDishes);
}

// ============ Tab切换 ============
function switchTab(tab) {
  currentTab = tab;
  const titleMap = { home: '首页', add: '录入菜品', calc: '计算器' };
  document.getElementById('pageTitle').textContent = titleMap[tab];

  // 切换页面
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');

  // 底部导航高亮
  document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
  document.querySelector(`.tab-item[data-tab="${tab}"]`).classList.add('active');

  if (tab === 'home') {
    renderHomePage();
  } else if (tab === 'add') {
    renderAddPage();
  } else if (tab === 'calc') {
    renderCalcPage();
  }
}

// ============ 首页渲染 ============
function renderHomePage() {
  const container = document.getElementById('pageHome');
  loadData();

  let filtered = [...allDishes];

  // 搜索
  const kw = searchKeyword.trim().toLowerCase();
  if (kw) filtered = filtered.filter(d => d.name.toLowerCase().includes(kw));

  // 排序
  if (sortOrder === 'profit-asc') filtered.sort((a, b) => a.profitRate - b.profitRate);
  else if (sortOrder === 'profit-desc') filtered.sort((a, b) => b.profitRate - a.profitRate);

  // 价格筛选
  const min = parseFloat(priceMin) || 0;
  const max = parseFloat(priceMax) || Infinity;
  filtered = filtered.filter(d => d.sellingPrice >= min && d.sellingPrice <= max);

  // 统计
  const total = allDishes.length;
  const avgProfit = total > 0 ? allDishes.reduce((s, d) => s + d.profitRate, 0) / total : 0;
  const highProfit = allDishes.filter(d => d.profitRate >= 60).length;

  const getProfitColor = (rate) => {
    if (rate >= 60) return '#10B981';
    if (rate >= 40) return '#F59E0B';
    return '#EF4444';
  };
  const getProfitBg = (rate) => {
    if (rate >= 60) return '#ECFDF5';
    if (rate >= 40) return '#FFFBEB';
    return '#FEF2F2';
  };

  let html = `
    <div class="page-inner">
      <!-- 搜索框 -->
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input class="search-input" placeholder="搜索菜品名称..." value="${escapeHtml(searchKeyword)}" oninput="searchKeyword=this.value;renderHomePage()">
      </div>

      <!-- 统计卡片 -->
      <div class="stat-row">
        <div class="stat-card">
          <div class="stat-num">${total}</div>
          <div class="stat-label">菜品总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-num" style="color:#2563EB">${avgProfit.toFixed(1)}%</div>
          <div class="stat-label">平均毛利率</div>
        </div>
        <div class="stat-card">
          <div class="stat-num" style="color:#10B981">${highProfit}</div>
          <div class="stat-label">高毛利菜品</div>
        </div>
      </div>

      <!-- 筛选区域 -->
      <div class="filter-card">
        <select class="filter-select" onchange="sortOrder=this.value;renderHomePage()">
          <option value="default" ${sortOrder==='default'?'selected':''}>默认排序</option>
          <option value="profit-desc" ${sortOrder==='profit-desc'?'selected':''}>毛利率从高到低</option>
          <option value="profit-asc" ${sortOrder==='profit-asc'?'selected':''}>毛利率从低到高</option>
        </select>
        <div class="filter-group">
          <input class="filter-input" type="number" placeholder="最低价" value="${priceMin}" oninput="priceMin=this.value;renderHomePage()">
          <span class="filter-sep">—</span>
          <input class="filter-input" type="number" placeholder="最高价" value="${priceMax}" oninput="priceMax=this.value;renderHomePage()">
        </div>
      </div>
  `;

  if (filtered.length === 0) {
    html += `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-text">暂无菜品数据</div>
        <div class="empty-sub">点击"录入"添加第一个菜品</div>
      </div>
    `;
  } else {
    html += `<div class="dish-list">`;
    filtered.forEach(d => {
      const pc = getProfitColor(d.profitRate);
      const pb = getProfitBg(d.profitRate);
      html += `
        <div class="dish-card" onclick="editDish('${d.id}')">
          <div class="dish-info">
            <div class="dish-name">${escapeHtml(d.name)}</div>
            <div class="dish-spec">${escapeHtml(d.spec || '')}</div>
          </div>
          <div class="dish-meta">
            <div class="dish-cost">成本 ¥${d.totalCost.toFixed(2)}</div>
            <div class="dish-profit" style="background:${pb};color:${pc}">${d.profitRate.toFixed(1)}%</div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  html += `</div>`;
  container.innerHTML = html;
}

// ============ 录入页渲染 ============
function renderAddPage() {
  const container = document.getElementById('pageAdd');
  const isEdit = editDishId !== null;
  const dish = isEdit ? allDishes.find(d => d.id === editDishId) : null;

  // 初始化材料
  let ingredients = [];
  if (dish && Array.isArray(dish.ingredients)) {
    ingredients = dish.ingredients.map(ing => ({ ...ing }));
  } else {
    ingredients = [{ name: '', weight: '', price: '', unit: 'jin', yieldRate: 100 }];
  }
  window._ingredients = ingredients;

  let sellingPrice = dish ? dish.sellingPrice : '';

  let html = `
    <div class="page-inner">
      <!-- 区块1：基本信息 -->
      <div class="section-card">
        <div class="section-title">基本信息</div>
        <div class="section-body">
          <div class="form-field">
            <label class="ing-label">菜品名称 *</label>
            <input class="ing-input" id="dishName" placeholder="例：红烧肉" value="${escapeHtml(dish ? dish.name : '')}">
          </div>
          <div class="form-field">
            <label class="ing-label">规格（选填）</label>
            <input class="ing-input" id="dishSpec" placeholder="例：大份 / 小份" value="${escapeHtml(dish ? (dish.spec || '') : '')}">
          </div>
        </div>
      </div>

      <!-- 区块2：原材料 -->
      <div class="section-card">
        <div class="section-title">原材料</div>
        <div class="section-body" id="ingredientsContainer">
          ${ingredients.map((ing, idx) => renderIngredientCard(ing, idx)).join('')}
        </div>
        <div class="add-ing-btn-wrap">
          <button class="add-ing-btn" data-action="addIngredient">＋ 添加材料</button>
        </div>
        <div class="total-cost-row">
          <span class="total-cost-label">单份总成本</span>
          <span class="total-cost-value">¥0.00</span>
        </div>
      </div>

      <!-- 区块3：售价与利润 -->
      <div class="section-card">
        <div class="section-title">售价与利润</div>
        <div class="section-body">
          <div class="form-field">
            <label class="ing-label">售价（元）</label>
            <input class="ing-input" id="sellingPrice" type="number" step="0.01" placeholder="58" value="${sellingPrice || ''}">
          </div>
          <div class="profit-display" style="background:#10B98115;border-left:4px solid #10B981">
            <div class="profit-row">
              <span>单份成本</span>
              <span style="font-weight:600">¥0.00</span>
            </div>
            <div class="profit-row">
              <span>毛利率</span>
              <span style="font-weight:700;font-size:20px;color:#10B981">0.0%</span>
            </div>
          </div>
        </div>
        <!-- 保存按钮 -->
        <div style="padding:0 16px 16px">
          <button class="save-btn" onclick="handleSave()">💾 ${isEdit ? '更新菜品' : '保存菜品'}</button>
        </div>
      </div>
      <div style="height:100px"></div>
    </div>
  `;

  container.innerHTML = html;

  // 更新成本显示
  updateAddPageCosts();
}

// ============ 原材料卡片渲染（无oninput，使用data属性） ============
function renderIngredientCard(ing, index) {
  const w = parseFloat(ing.weight) || 0;
  const p = parseFloat(ing.price) || 0;
  const y = parseFloat(ing.yieldRate) || 100;
  let subtotal = 0;
  if (ing.unit === 'jin') subtotal = (p * w / 500) / (y / 100);
  else subtotal = (p * w / 1000) / (y / 100);

  return `
    <div class="ing-card" data-index="${index}">
      <div class="ing-field">
        <label class="ing-label">材料名</label>
        <input class="ing-input" data-index="${index}" data-field="name" placeholder="例：五花肉" value="${escapeHtml(ing.name || '')}">
      </div>
      <div class="ing-field">
        <label class="ing-label">克重（g）</label>
        <input class="ing-input" data-index="${index}" data-field="weight" type="number" placeholder="250" value="${ing.weight || ''}">
      </div>
      <div class="ing-field">
        <label class="ing-label">进货价</label>
        <div class="ing-price-row">
          <input class="ing-input flex-1" data-index="${index}" data-field="price" type="number" step="0.01" placeholder="28" value="${ing.price || ''}">
          <button class="ing-unit-btn" data-action="toggleUnit" data-index="${index}">${ing.unit === 'jin' ? '元/斤' : '元/kg'} ▼</button>
        </div>
      </div>
      <div class="ing-field">
        <label class="ing-label">出成率（%）</label>
        <input class="ing-input" data-index="${index}" data-field="yieldRate" type="number" placeholder="100" value="${ing.yieldRate || ''}">
      </div>
      <div class="ing-card-footer">
        <span class="ing-subtotal">小计成本：¥${subtotal.toFixed(2)}</span>
        <button class="ing-delete" data-action="deleteIngredient" data-index="${index}">✕</button>
      </div>
    </div>
  `;
}

// ============ 仅更新成本/利润显示（不重建DOM） ============
function updateAddPageCosts() {
  const ings = window._ingredients || [];
  let totalCost = 0;

  ings.forEach(ing => {
    const w = parseFloat(ing.weight) || 0;
    const p = parseFloat(ing.price) || 0;
    const y = parseFloat(ing.yieldRate) || 100;
    if (ing.unit === 'jin') {
      totalCost += (p * w / 500) / (y / 100);
    } else {
      totalCost += (p * w / 1000) / (y / 100);
    }
  });

  // 更新每行小计
  document.querySelectorAll('.ing-card').forEach(card => {
    const idx = parseInt(card.dataset.index);
    const ing = ings[idx];
    if (!ing) return;
    const w = parseFloat(ing.weight) || 0;
    const p = parseFloat(ing.price) || 0;
    const y = parseFloat(ing.yieldRate) || 100;
    let subtotal = 0;
    if (ing.unit === 'jin') subtotal = (p * w / 500) / (y / 100);
    else subtotal = (p * w / 1000) / (y / 100);
    const el = card.querySelector('.ing-subtotal');
    if (el) el.textContent = `小计成本：¥${subtotal.toFixed(2)}`;
  });

  // 更新总成本
  const totalEl = document.querySelector('.total-cost-value');
  if (totalEl) totalEl.textContent = `¥${totalCost.toFixed(2)}`;

  // 更新利润显示
  const sp = parseFloat(document.getElementById('sellingPrice')?.value) || 0;
  const profitRate = sp > 0 ? ((sp - totalCost) / sp) * 100 : 0;
  const pc = profitRate >= 60 ? '#10B981' : profitRate >= 40 ? '#F59E0B' : '#EF4444';

  const profitDisplay = document.querySelector('.profit-display');
  if (profitDisplay) {
    profitDisplay.style.background = `${pc}15`;
    profitDisplay.style.borderLeft = `4px solid ${pc}`;
    const rows = profitDisplay.querySelectorAll('.profit-row');
    if (rows[0]) rows[0].innerHTML = `<span>单份成本</span><span style="font-weight:600">¥${totalCost.toFixed(2)}</span>`;
    if (rows[1]) rows[1].innerHTML = `<span>毛利率</span><span style="font-weight:700;font-size:20px;color:${pc}">${profitRate.toFixed(1)}%</span>`;
  }
}

// ============ 仅重新渲染原材料区域（添加/删除/切换单位时） ============
function renderIngredientsSection() {
  const container = document.getElementById('ingredientsContainer');
  if (!container) return;
  const ings = window._ingredients || [];
  container.innerHTML = ings.map((ing, idx) => renderIngredientCard(ing, idx)).join('');
  updateAddPageCosts();
}

// ============ 事件委托（录入页输入/点击，不重建DOM） ============
function setupAddPageHandlers() {
  const container = document.getElementById('pageAdd');
  if (!container || container._handlersSetup) return;
  container._handlersSetup = true;

  // 输入事件委托：材料输入 + 售价输入
  container.addEventListener('input', function(e) {
    const input = e.target.closest('.ing-input');
    if (!input) return;

    const index = input.dataset.index;
    const field = input.dataset.field;

    if (index !== undefined && field) {
      // 原材料输入：更新数据，只更新成本显示
      const ings = window._ingredients;
      if (ings && ings[index]) {
        ings[index][field] = input.value;
      }
      updateAddPageCosts();
    } else if (input.id === 'sellingPrice') {
      // 售价输入：只更新利润显示
      updateAddPageCosts();
    }
  });

  // 点击事件委托：单位切换、删除材料、添加材料
  container.addEventListener('click', function(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const index = parseInt(btn.dataset.index);

    if (action === 'toggleUnit' && !isNaN(index)) {
      const ings = window._ingredients;
      if (ings && ings[index]) {
        ings[index].unit = ings[index].unit === 'jin' ? 'kg' : 'jin';
      }
      renderIngredientsSection();
    } else if (action === 'deleteIngredient' && !isNaN(index)) {
      const ings = window._ingredients;
      if (ings && ings.length > 1) {
        ings.splice(index, 1);
      }
      renderIngredientsSection();
    } else if (action === 'addIngredient') {
      const ings = window._ingredients;
      if (ings) {
        ings.push({ name: '', weight: '', price: '', unit: 'jin', yieldRate: 100 });
      }
      renderIngredientsSection();
    }
  });
}

// 在页面加载和切换Tab时设置事件委托
document.addEventListener('DOMContentLoaded', () => {
  setupAddPageHandlers();
});
// 切换Tab时也重新设置（因为DOM被重建了）
const origSwitchTab = switchTab;
switchTab = function(tab) {
  origSwitchTab(tab);
  if (tab === 'add') {
    // 延迟执行，等DOM渲染完成
    setTimeout(setupAddPageHandlers, 0);
  }
};

// ============ 保存 ============
function handleSave() {
  const name = document.getElementById('dishName')?.value?.trim();
  if (!name) {
    alert('请输入菜品名称');
    return;
  }

  const spec = document.getElementById('dishSpec')?.value?.trim() || '';
  const sellingPrice = parseFloat(document.getElementById('sellingPrice')?.value) || 0;
  const ings = window._ingredients || [];

  // 计算总成本
  let totalCost = 0;
  ings.forEach(ing => {
    const w = parseFloat(ing.weight) || 0;
    const p = parseFloat(ing.price) || 0;
    const y = parseFloat(ing.yieldRate) || 100;
    if (ing.unit === 'jin') {
      totalCost += (p * w / 500) / (y / 100);
    } else {
      totalCost += (p * w / 1000) / (y / 100);
    }
  });

  const profitRate = sellingPrice > 0 ? ((sellingPrice - totalCost) / sellingPrice) * 100 : 0;

  const dish = {
    id: editDishId || genId(),
    name,
    spec,
    ingredients: ings,
    sellingPrice,
    totalCost,
    profitRate,
    createdAt: editDishId ? (allDishes.find(d => d.id === editDishId)?.createdAt || Date.now()) : Date.now()
  };

  if (editDishId) {
    updateDish(dish);
  } else {
    addDish(dish);
  }

  loadData();
  editDishId = null;
  alert('保存成功！');
  switchTab('home');
}

// ============ 编辑 ============
function editDish(id) {
  editDishId = id;
  switchTab('add');
}

// ============ 计算器页 ============
function renderCalcPage() {
  const container = document.getElementById('pageCalc');
  container.innerHTML = `
    <div class="page-inner">
      <!-- 计算器1：出成率换算 -->
      <div class="section-card">
        <div class="section-title">出成率换算</div>
        <div class="section-body">
          <div class="form-field">
            <label class="ing-label">原材料价格（元/斤）</label>
            <input class="ing-input calc-input" type="number" step="0.01" placeholder="28" oninput="calcYieldRate()" id="calcPrice">
          </div>
          <div class="form-field">
            <label class="ing-label">需要克重（g）</label>
            <input class="ing-input calc-input" type="number" placeholder="250" oninput="calcYieldRate()" id="calcWeight">
          </div>
          <div class="form-field">
            <label class="ing-label">出成率（%）</label>
            <input class="ing-input calc-input" type="number" placeholder="80" oninput="calcYieldRate()" id="calcYield">
          </div>
          <div class="calc-result" id="calcYieldResult">
            <div class="calc-result-label">实际成本</div>
            <div class="calc-result-value">¥0.00</div>
          </div>
        </div>
      </div>

      <!-- 计算器2：毛利率计算 -->
      <div class="section-card">
        <div class="section-title">毛利率计算</div>
        <div class="section-body">
          <div class="form-field">
            <label class="ing-label">售价（元）</label>
            <input class="ing-input calc-input" type="number" step="0.01" placeholder="58" oninput="calcProfitRate2()" id="calcSp">
          </div>
          <div class="form-field">
            <label class="ing-label">单份成本（元）</label>
            <input class="ing-input calc-input" type="number" step="0.01" placeholder="25" oninput="calcProfitRate2()" id="calcCost">
          </div>
          <div class="calc-result" id="calcProfitResult">
            <div class="calc-result-label">毛利率</div>
            <div class="calc-result-value">0.0%</div>
          </div>
        </div>
      </div>
      <div style="height:20px"></div>
    </div>
  `;
}

function calcYieldRate() {
  const price = parseFloat(document.getElementById('calcPrice')?.value) || 0;
  const weight = parseFloat(document.getElementById('calcWeight')?.value) || 0;
  const yieldRate = parseFloat(document.getElementById('calcYield')?.value) || 100;
  const result = (price * weight / 500) / (yieldRate / 100);
  const el = document.getElementById('calcYieldResult');
  if (el) {
    el.querySelector('.calc-result-value').textContent = `¥${result.toFixed(2)}`;
  }
}

function calcProfitRate2() {
  const sp = parseFloat(document.getElementById('calcSp')?.value) || 0;
  const cost = parseFloat(document.getElementById('calcCost')?.value) || 0;
  const rate = sp > 0 ? ((sp - cost) / sp) * 100 : 0;
  const el = document.getElementById('calcProfitResult');
  if (el) {
    el.querySelector('.calc-result-value').textContent = `${rate.toFixed(1)}%`;
    el.querySelector('.calc-result-value').style.color = rate >= 60 ? '#10B981' : rate >= 40 ? '#F59E0B' : '#EF4444';
  }
}

// ============ 工具函数 ============
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}