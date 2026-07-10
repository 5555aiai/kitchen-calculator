// ============ localStorage 持久化 ============

const STORAGE_KEY = 'kitchen_dishes';

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

function saveAll(dishes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dishes));
}

function addDish(dish) {
  const dishes = loadAll();
  dishes.push(dish);
  saveAll(dishes);
  return dishes;
}

function updateDish(idOrDish, dishData) {
  const dishes = loadAll();
  let id, dish;
  if (arguments.length === 1) {
    dish = idOrDish;
    id = dish.id;
  } else {
    id = idOrDish;
    dish = dishData;
  }
  const idx = dishes.findIndex(d => d.id === id);
  if (idx !== -1) {
    dishes[idx] = dish;
    saveAll(dishes);
  }
  return dishes;
}

function deleteDish(id) {
  const dishes = loadAll();
  const filtered = dishes.filter(d => d.id !== id);
  saveAll(filtered);
  return filtered;
}

function getDish(id) {
  const dishes = loadAll();
  return dishes.find(d => d.id === id) || null;
}

function loadDishes() {
  return loadAll();
}