// ============ 全局状态 ============
let editDishId = null;
let currentTab = 'home';
let allDishes = [];
let sortOrder = 'default';
let minPrice = '';
let maxPrice = '';

// ============ Tab 切换 ============
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  const tabEl = document.querySelector(`.tab-item[data-tab="${tab}"]`);
  if (tabEl) tabEl.classList.add('active');
  const pageEl = document.getElementById(`page-${tab}`);
  if (pageEl) pageEl.classList.add('active');
  if (tab === 'home') renderHome();
  if (tab === 'add') renderAddPage();
}

// ============ Toast 提示 ============
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

// ============ 首页渲染 ============
function renderHome() {
  allDishes = loadDishes();
  const list = document.getElementById('dish-list');
  const searchVal = (document.getElementById('search-input')?.value || '').toLowerCase();
  let filtered = allDishes.filter(d => d.name.toLowerCase().includes(searchVal));

  // 价格区间筛选
  const minV = parseFloat(minPrice) || 0;
  const maxV = parseFloat(maxPrice) || 0;
  if (minV > 0) filtered = filtered.filter(d => d.sellingPrice >= minV);
  if (maxV > 0) filtered = filtered.filter(d => d.sellingPrice <= maxV);

  // 排序
  if (sortOrder === 'margin-asc') filtered.sort((a, b) => (calcMargin(a.sellingPrice, calcDish(a).totalCost) || 0) - (calcMargin(b.sellingPrice, calcDish(b).totalCost) || 0));
  else if (sortOrder === 'margin-desc') filtered.sort((a, b) => (calcMargin(b.sellingPrice, calcDish(b).totalCost) || 0) - (calcMargin(a.sellingPrice, calcDish(a).totalCost) || 0));

  // 统计
  const totalDishes = allDishes.length;
  let avgMargin = 0;
  let highMargin = 0;
  if (totalDishes > 0) {
    const margins = allDishes.map(d => calcMargin(d.sellingPrice, calcDish(d).totalCost));
    avgMargin = margins.reduce((s, v) => s + v, 0) / totalDishes;
    highMargin = margins.filter(m => m >= 60).length;
  }
  document.getElementById('stat-total').textContent = totalDishes;
  document.getElementById('stat-avg').textContent = avgMargin.toFixed(1) + '%';
  document.getElementById('stat-high').textContent = highMargin;

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">暂无菜品数据，去录入页添加吧</div></div>';
    return;
  }

  let html = '<table><thead><tr><th>菜品名称</th><th>进货成本</th><th>出成率</th><th>售价</th><th>毛利率</th></tr></thead><tbody>';
  for (const d of filtered) {
    const calc = calcDish(d);
    const margin = calcMargin(d.sellingPrice, calc.totalCost);
    const marginClass = margin >= 60 ? 'margin-green' : margin < 40 ? 'margin-red' : 'margin-normal';
    const avgYield = calc.totalCost > 0 ? (calc.details.reduce((s, v) => s + v, 0) / Math.max(calc.details.length, 1)) : 0;
    html += `<tr onclick="editDish('${d.id}')">
      <td class="dish-name">${escHtml(d.name)}${d.spec ? `<span style="color:#999;font-size:12px;font-weight:400"> (${escHtml(d.spec)})</span>` : ''}</td>
      <td class="price-cell">¥${calc.totalCost.toFixed(2)}</td>
      <td>${avgYield > 0 ? (100).toFixed(0) + '%' : '-'}</td>
      <td class="price-cell">¥${(parseFloat(d.sellingPrice) || 0).toFixed(2)}</td>
      <td class="price-cell ${marginClass}">${margin.toFixed(1)}%</td>
    </tr>`;
  }
  html += '</tbody></table>';
  list.innerHTML = html;
}

function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// 搜索
function onSearch() { renderHome(); }
function onSortChange(v) { sortOrder = v; renderHome(); }
function onMinPrice(v) { minPrice = v; renderHome(); }
function onMaxPrice(v) { maxPrice = v; renderHome(); }

// 编辑菜品
function editDish(id) {
  editDishId = id;
  switchTab('add');
}

// ============ 录入页渲染 ============
function renderAddPage() {
  const container = document.getElementById('add-page-content');
  let dish = editDishId ? getDish(editDishId) : null;
  if (!dish) {
    dish = emptyDish();
    editDishId = null;
  }

  const ingredients = Array.isArray(dish.ingredients) ? dish.ingredients : [];
  const calc = calcDish(dish);
  const margin = calcMargin(dish.sellingPrice, calc.totalCost);
  const marginClass = margin >= 60 ? 'green' : margin < 40 ? 'red' : 'blue';

  // 生成原材料卡片HTML
  let ingHtml = '';
  for (let i = 0; i < ingredients.length; i++) {
    ingHtml += renderIngredientCard(ingredients[i], i);
  }

  container.innerHTML = `
    <!-- 区块1：基本信息 -->
    <div class="form-section">
      <div class="section-title">📋 基本信息</div>
      <div class="field-group">
        <label class="field-label">菜品名称 <span style="color:#dc2626">*</span></label>
        <input class="form-input" id="dish-name" value="${escHtml(dish.name)}" placeholder="如：红烧排骨" oninput="onDishInput()" />
      </div>
      <div class="field-group" style="margin-bottom:0">
        <label class="field-label">规格（选填）</label>
        <input class="form-input" id="dish-spec" value="${escHtml(dish.spec || '')}" placeholder="如：大份 / 小份" oninput="onDishInput()" />
      </div>
    </div>

    <!-- 区块2：原材料 -->
    <div class="form-section">
      <div class="section-title">🥩 原材料</div>
      <div id="ingredients-container">
        ${ingHtml || '<div style="text-align:center;padding:20px 0;color:#bbb;font-size:14px">暂无原材料，点击下方添加</div>'}
      </div>
      <button class="add-ing-btn" onclick="addIngredientRow()">＋ 添加材料</button>
      <div class="total-cost-row">单份总成本：¥<span id="total-cost-display">${calc.totalCost.toFixed(2)}</span></div>
    </div>

    <!-- 区块3：售价与利润 -->
    <div class="profit-section">
      <div class="section-title">💰 售价与利润</div>
      <div class="field-group">
        <label class="field-label">售价（元）</label>
        <input class="form-input" id="selling-price" type="number" step="0.01" min="0"
          value="${dish.sellingPrice || ''}" placeholder="输入售价" oninput="onPriceInput()" />
      </div>
      <div class="profit-row" style="margin-top:12px">
        <span class="profit-label">单份总成本</span>
        <span class="profit-value blue">¥<span id="profit-cost">${calc.totalCost.toFixed(2)}</span></span>
      </div>
      <div class="profit-row">
        <span class="profit-label">毛利率</span>
        <span class="profit-value ${marginClass}"><span id="profit-margin">${margin.toFixed(1)}</span>%</span>
      </div>
      <button class="save-btn" onclick="handleSave()">${editDishId ? '💾 更新菜品' : '💾 保存菜品'}</button>
    </div>
  `;
}

// 渲染单行原材料卡片
function renderIngredientCard(ing, idx) {
  const name = escHtml(ing.name || '');
  const weight = ing.weight || '';
  const price = ing.price || '';
  const unit = ing.unit || 'jin';
  const yieldRate = ing.yieldRate || 100;
  const unitLabel = unit === 'jin' ? '元/斤' : '元/kg';

  // 计算小计成本
  const w = parseFloat(weight) || 0;
  const p = parseFloat(price) || 0;
  const y = parseFloat(yieldRate) || 100;
  let subtotal = 0;
  if (w > 0 && p > 0) {
    if (unit === 'jin') subtotal = (p / 500) * w / (y / 100);
    else subtotal = (p / 1000) * w / (y / 100);
  }

  return `
    <div class="ing-card" data-idx="${idx}">
      <div class="ing-field">
        <label class="ing-label">材料名</label>
        <input class="ing-input" value="${name}" placeholder="如：猪排骨" oninput="onIngInput(${idx}, 'name', this.value)" />
      </div>
      <div class="ing-field">
        <label class="ing-label">克重（g）</label>
        <input class="ing-input" type="number" step="0.1" min="0" value="${weight}" placeholder="如：300" oninput="onIngInput(${idx}, 'weight', this.value)" />
      </div>
      <div class="ing-field">
        <label class="ing-label">进货价</label>
        <div class="ing-price-row">
          <input class="ing-price-input" type="number" step="0.01" min="0" value="${price}" placeholder="如：25" oninput="onIngInput(${idx}, 'price', this.value)" />
          <select class="ing-unit-select" onchange="onIngInput(${idx}, 'unit', this.value)">
            <option value="jin" ${unit === 'jin' ? 'selected' : ''}>元/斤</option>
            <option value="kg" ${unit === 'kg' ? 'selected' : ''}>元/kg</option>
          </select>
        </div>
      </div>
      <div class="ing-field">
        <label class="ing-label">出成率（%）</label>
        <input class="ing-input" type="number" step="0.1" min="0" max="100" value="${yieldRate}" placeholder="默认100" oninput="onIngInput(${idx}, 'yieldRate', this.value)" />
      </div>
      <div class="ing-card-footer">
        <span class="ing-subtotal">小计成本：¥${subtotal.toFixed(2)}</span>
        <button class="ing-delete" onclick="removeIngredientRow(${idx})">✕</button>
      </div>
    </div>
  `;
}

// 添加材料行
function addIngredientRow() {
  const container = document.getElementById('ingredients-container');
  if (!container) return;
  // 读取当前原材料
  const ingredients = readIngredients();
  ingredients.push(emptyIngredient());
  // 重新渲染
  let html = '';
  for (let i = 0; i < ingredients.length; i++) {
    html += renderIngredientCard(ingredients[i], i);
  }
  container.innerHTML = html;
  updateCosts();
}

// 删除材料行
function removeIngredientRow(idx) {
  const container = document.getElementById('ingredients-container');
  if (!container) return;
  const ingredients = readIngredients();
  ingredients.splice(idx, 1);
  let html = '';
  for (let i = 0; i < ingredients.length; i++) {
    html += renderIngredientCard(ingredients[i], i);
  }
  container.innerHTML = html || '<div style="text-align:center;padding:20px 0;color:#bbb;font-size:14px">暂无原材料，点击下方添加</div>';
  updateCosts();
}

// 读取表单中的原材料数据
function readIngredients() {
  const cards = document.querySelectorAll('#ingredients-container .ing-card');
  const ingredients = [];
  cards.forEach(card => {
    const idx = parseInt(card.dataset.idx);
    const name = card.querySelector('.ing-field:nth-child(1) .ing-input')?.value || '';
    const weight = parseFloat(card.querySelector('.ing-field:nth-child(2) .ing-input')?.value) || 0;
    const price = parseFloat(card.querySelector('.ing-price-input')?.value) || 0;
    const unit = card.querySelector('.ing-unit-select')?.value || 'jin';
    const yieldRate = parseFloat(card.querySelector('.ing-field:nth-child(4) .ing-input')?.value) || 100;
    ingredients.push({ name, weight, price, unit, yieldRate });
  });
  return ingredients;
}

// 材料输入事件
function onIngInput(idx, field, value) {
  const ingredients = readIngredients();
  updateCosts();
}

// 更新成本显示
function updateCosts() {
  const ingredients = readIngredients();
  const dish = emptyDish();
  dish.ingredients = ingredients;
  const calc = calcDish(dish);
  const totalEl = document.getElementById('total-cost-display');
  if (totalEl) totalEl.textContent = calc.totalCost.toFixed(2);

  // 更新售价区域的成本
  const costEl = document.getElementById('profit-cost');
  if (costEl) costEl.textContent = calc.totalCost.toFixed(2);

  // 更新毛利率
  const price = parseFloat(document.getElementById('selling-price')?.value) || 0;
  const margin = calcMargin(price, calc.totalCost);
  const marginEl = document.getElementById('profit-margin');
  if (marginEl) marginEl.textContent = margin.toFixed(1);
  const marginParent = marginEl?.parentElement;
  if (marginParent) {
    marginParent.className = 'profit-value ' + (margin >= 60 ? 'green' : margin < 40 ? 'red' : 'blue');
  }
}

// 菜品名称/规格输入
function onDishInput() {}

// 售价输入
function onPriceInput() {
  updateCosts();
}

// 保存
function handleSave() {
  const name = document.getElementById('dish-name')?.value?.trim();
  if (!name) {
    showToast('请填写菜品名称');
    document.getElementById('dish-name')?.focus();
    return;
  }

  const ingredients = readIngredients();
  if (ingredients.length === 0) {
    showToast('请至少添加一种原材料');
    return;
  }

  const spec = document.getElementById('dish-spec')?.value?.trim() || '';
  const sellingPrice = parseFloat(document.getElementById('selling-price')?.value) || 0;

  const dish = {
    id: editDishId || genId(),
    name,
    spec,
    ingredients,
    sellingPrice
  };

  if (editDishId) {
    updateDish(editDishId, dish);
    showToast('✅ 更新成功');
  } else {
    addDish(dish);
    showToast('✅ 保存成功');
  }

  editDishId = null;
  // 跳转到首页
  switchTab('home');
}

// ============ 计算器页 ============
function renderCalculator() {
  // 计算器1：出成率换算
  const calcP = parseFloat(document.getElementById('calc1-price')?.value) || 0;
  const calcW = parseFloat(document.getElementById('calc1-weight')?.value) || 0;
  const calcY = parseFloat(document.getElementById('calc1-yield')?.value) || 100;
  const calc1Result = (calcP > 0 && calcW > 0) ? (calcP * calcW / (calcY / 100) / 500).toFixed(2) : '—';
  document.getElementById('calc1-result').textContent = calc1Result !== '—' ? '¥' + calc1Result : '—';

  // 计算器2：毛利率计算
  const calcS = parseFloat(document.getElementById('calc2-price')?.value) || 0;
  const calcC = parseFloat(document.getElementById('calc2-cost')?.value) || 0;
  const calc2Result = (calcS > 0 && calcC > 0) ? ((calcS - calcC) / calcS * 100).toFixed(1) + '%' : '—';
  document.getElementById('calc2-result').textContent = calc2Result;
}

function onCalc1Input() { renderCalculator(); }
function onCalc2Input() { renderCalculator(); }

// 初始化计算器页
document.addEventListener('DOMContentLoaded', () => {
  // 首页搜索
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.addEventListener('input', onSearch);

  // 注册 Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
});

// ============ 页面加载 ============
switchTab('home');