// ============ 数据模型 ============

// 空原材料模板
function emptyIngredient() {
  return { name: '', weight: 0, price: 0, unit: 'jin', yieldRate: 100 };
}

// 空菜品模板
function emptyDish() {
  return { id: '', name: '', spec: '', ingredients: [], sellingPrice: 0 };
}

// 生成唯一ID
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// 单位换算：斤转克
function jinToG(price) {
  return price / 500;
}

// 千克转克
function kgToG(price) {
  return price / 1000;
}

// 计算单份成本
function calcDish(dish) {
  const ingredients = Array.isArray(dish.ingredients) ? dish.ingredients : [];
  let total = 0;
  const details = [];
  for (const ing of ingredients) {
    const w = parseFloat(ing.weight) || 0;
    const p = parseFloat(ing.price) || 0;
    const y = parseFloat(ing.yieldRate) || 100;
    if (w <= 0 || p <= 0) { details.push(0); continue; }
    let cost;
    if (ing.unit === 'jin') {
      cost = (p / 500) * w / (y / 100);
    } else {
      cost = (p / 1000) * w / (y / 100);
    }
    details.push(cost);
    total += cost;
  }
  return { totalCost: total, details };
}

// 计算毛利率
function calcMargin(sellingPrice, totalCost) {
  const sp = parseFloat(sellingPrice) || 0;
  if (sp <= 0) return 0;
  return ((sp - totalCost) / sp) * 100;
}