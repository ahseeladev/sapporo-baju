const SUPABASE_URL = 'https://dtshfdtmkgyzrxcvjyns.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_hvuw0uZ_zS_Ib-S77tPnDA_xz3WGSNj';

const SUPABASE_HEADERS = {
  apikey: SUPABASE_PUBLISHABLE_KEY,
  Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
  'Content-Type': 'application/json'
};

const itemsContainer = document.querySelector('#items');
const itemCount = document.querySelector('#item-count');
const form = document.querySelector('#orderForm');
const message = document.querySelector('#message');

function addItem(values = {}) {
  const row = document.createElement('div');
  row.className = 'item-row';
  row.dataset.shirt = itemsContainer.children.length + 1;
  row.innerHTML = `
    <button type="button" class="remove-item" title="Remove shirt" aria-label="Remove shirt">×</button>
    <label>Name<input class="member-name" maxlength="100" value="${values.name || ''}" placeholder="Ordered by"></label>
    <label>Size type<select class="size-category" required><option value="">Select</option><option value="Adult" ${values.sizeCategory === 'Adult' ? 'selected' : ''}>Adult</option><option value="Kid" ${values.sizeCategory === 'Kid' ? 'selected' : ''}>Kid</option></select></label>
    <label>Size<select class="size" required></select></label>
    <label>Custom display number<input class="shirt-number" type="text" inputmode="numeric" pattern="[0-9]{2}" maxlength="2" value="${values.shirtNumber || ''}" placeholder="e.g.00 (2digits)"></label>
    <label>Custom display name<input class="custom-name" type="text" maxlength="10" pattern="[A-Z0-9]{1,10}" value="${values.customName || ''}" placeholder="e.g. ALEESHA"></label>
    <label>Memo<input class="item-memo" maxlength="255" value="${values.memo || ''}" placeholder="Order note"></label>`;
  row.querySelector('.remove-item').addEventListener('click', () => { if (itemsContainer.children.length > 1) { row.remove(); updateCount(); } });
  itemsContainer.appendChild(row);

  const shirtNumberInput = row.querySelector('.shirt-number');
  const customNameInput = row.querySelector('.custom-name');
  const sizeSelect = row.querySelector('.size');
  const sizeCategorySelect = row.querySelector('.size-category');
  const adultSizes = ['XS','S','M','L','XL','2XL','3XL','4XL','5XL','6XL','7XL','8XL','9XL','10XL'];
  const kidSizes = ['24','26','28','30','34','36'];

  function updateSizeOptions() {
    const sizes = sizeCategorySelect.value === 'Kid' ? kidSizes : adultSizes;
    sizeSelect.innerHTML = '<option value="">Select</option>' + sizes.map(size => `<option ${values.size === size ? 'selected' : ''}>${size}</option>`).join('');
  }

  sizeCategorySelect.addEventListener('change', updateSizeOptions);
  updateSizeOptions();

  shirtNumberInput.addEventListener('input', () => {
    shirtNumberInput.value = shirtNumberInput.value.replace(/[^0-9]/g, '').slice(0, 2);
  });

  customNameInput.addEventListener('input', () => {
    customNameInput.value = customNameInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  });

  updateCount();
}

function updateCount() {
  const count = itemsContainer.children.length;
  itemCount.textContent = `${count} ${count === 1 ? 'shirt' : 'shirts'}`;
  [...itemsContainer.children].forEach((row, index) => {
    row.dataset.shirt = index + 1;
  });
}

document.querySelector('#addItem').addEventListener('click', () => addItem());

form.addEventListener('submit', async event => {
  event.preventDefault();
  message.textContent = 'Submitting...';
  const rows = [...itemsContainer.querySelectorAll('.item-row')];
  const firstRow = rows[0];
  const payload = {
    name: firstRow.querySelector('.member-name').value.trim(),
    memo: firstRow.querySelector('.item-memo').value.trim(),
    items: rows.map(row => ({
      name: row.querySelector('.member-name').value.trim(),
      sizeCategory: row.querySelector('.size-category').value,
      size: row.querySelector('.size').value,
      shirtNumber: row.querySelector('.shirt-number').value.trim(),
      customName: row.querySelector('.custom-name').value.trim(),
      memo: row.querySelector('.item-memo').value.trim()
    }))
  };

  try {
    let parentOrderId = null;

    for (let itemIndex = 0; itemIndex < payload.items.length; itemIndex++) {
      const item = payload.items[itemIndex];
      const row = {
        name: item.name || payload.name,
        parent_order_id: itemIndex === 0 ? null : parentOrderId,
        relationship: itemIndex === 0 ? 'Head' : 'Other',
        size_category: item.sizeCategory,
        size: item.size,
        custom_display_number: item.shirtNumber || null,
        custom_display_name: item.customName || null,
        memo: item.memo || payload.memo || null,
        delete_flag: false
      };

      const response = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
        method: 'POST',
        headers: {...SUPABASE_HEADERS, Prefer: 'return=representation'},
        body: JSON.stringify([row])
      });
      if (!response.ok) throw new Error(await response.text());
      const inserted = await response.json();
      if (itemIndex === 0 && inserted[0]?.order_id) parentOrderId = inserted[0].order_id;
    }

    form.reset();
    itemsContainer.innerHTML = '';
    addItem();
    await loadOrderedList();
    document.querySelector('#successDialog').showModal();
    message.textContent = '';
  } catch (error) {
    message.textContent = error.message || 'The order could not be submitted';
  }
});

document.querySelector('#closeDialog').addEventListener('click', () => document.querySelector('#successDialog').close());

const slides = [...document.querySelectorAll('.design-slide')];
const dots = [...document.querySelectorAll('.carousel-dot')];
const carouselTrack = document.querySelector('.design-track');
let slideIndex = 0;
let touchStartX = 0;

function showSlide(index) {
  if (!slides.length) return;
  slideIndex = (index + slides.length) % slides.length;
  slides.forEach((slide, i) => slide.classList.toggle('active', i === slideIndex));
  dots.forEach((dot, i) => dot.classList.toggle('active', i === slideIndex));
}

document.querySelector('.carousel-prev')?.addEventListener('click', () => showSlide(slideIndex - 1));
document.querySelector('.carousel-next')?.addEventListener('click', () => showSlide(slideIndex + 1));
dots.forEach((dot, index) => dot.addEventListener('click', () => showSlide(index)));

carouselTrack?.addEventListener('touchstart', event => { touchStartX = event.changedTouches[0].clientX; }, {passive:true});
carouselTrack?.addEventListener('touchend', event => {
  const distance = event.changedTouches[0].clientX - touchStartX;
  if (Math.abs(distance) > 45) showSlide(slideIndex + (distance < 0 ? 1 : -1));
}, {passive:true});

const sizeGuideDialog = document.querySelector('#sizeGuideDialog');
const sizeGuideImage = document.querySelector('#sizeGuideImage');
document.querySelectorAll('.size-chart-buttons .size-guide-button').forEach(button => {
  button.addEventListener('click', () => {
    sizeGuideImage.src = button.dataset.chart;
    sizeGuideDialog?.showModal();
  });
});
document.querySelector('#closeSizeGuide')?.addEventListener('click', () => sizeGuideDialog?.close());

const designPreviewDialog = document.createElement('dialog');
designPreviewDialog.id = 'designPreviewDialog';
designPreviewDialog.className = 'size-guide-dialog design-preview-dialog';
designPreviewDialog.innerHTML = '<button type="button" class="dialog-close" aria-label="Close design preview">×</button><img alt="Expanded shirt design">';
document.body.appendChild(designPreviewDialog);

const previewImage = designPreviewDialog.querySelector('img');
designPreviewDialog.querySelector('.dialog-close').addEventListener('click', () => designPreviewDialog.close());
carouselTrack?.addEventListener('click', event => {
  if (event.target.closest('.carousel-arrow') || event.target.closest('.carousel-dot')) return;
  const activeSlide = document.querySelector('.design-slide.active');
  if (!activeSlide) return;
  previewImage.src = activeSlide.src;
  previewImage.alt = activeSlide.alt;
  designPreviewDialog.showModal();
});

addItem();

async function loadOrderedList() {
  const grid = document.querySelector('#orderedGrid');
  const count = document.querySelector('#ordered-count');
  if (!grid) return;

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/ordered_shirt_list?select=order_id,name,parent_order_id,size_category,size,custom_display_number,custom_display_name,relationship,created_at&order=created_at.desc`, {
      headers: SUPABASE_HEADERS
    });
    if (!response.ok) throw new Error(await response.text());
    const orders = await response.json();

    count.textContent = `${orders.length} ${orders.length === 1 ? 'order' : 'orders'}`;
    grid.innerHTML = orders.map((order, index) => `
      <article class="ordered-card" data-order-id="${escapeHtml(order.order_id)}" data-parent-id="${escapeHtml(order.parent_order_id || '')}" data-name="${escapeHtml(order.name)}" data-size-category="${escapeHtml(order.size_category)}" data-size="${escapeHtml(order.size)}" data-display-number="${escapeHtml(order.custom_display_number || '')}" data-display-name="${escapeHtml(order.custom_display_name || '')}">
        <div class="ordered-card-heading">
          <strong>#${index + 1}</strong>
          <span>${escapeHtml(order.size_category)} · ${escapeHtml(order.size)}</span>
        </div>
        <div class="ordered-card-display">
          <div class="ordered-by"><span>Ordered by:</span> <strong>${escapeHtml(order.name)}</strong></div>
          <div class="ordered-custom-print" aria-label="Custom shirt print">
            <span class="ordered-custom-name">${escapeHtml(order.custom_display_name || '-')}</span>
            <strong class="ordered-custom-number">${escapeHtml(order.custom_display_number || '-')}</strong>
          </div>
        </div>
        <button type="button" class="ordered-edit-button" data-order-id="${escapeHtml(order.order_id)}">Edit / Delete</button>
      </article>
    `).join('') || '<p class="ordered-loading">No orders yet</p>';

    grid.querySelectorAll('.ordered-card').forEach(card => {
      const editButton = card.querySelector('.ordered-edit-button');
      const orderId = card.dataset.orderId;
      const parentId = card.dataset.parentId;
      const ownerId = parentId || orderId;

      editButton.addEventListener('click', () => {
        // Open the edit/delete modal for the order
        openEditDeleteModal(orderId, ownerId);
      });
    });
  } catch (error) {
    count.textContent = '0 orders';
    grid.innerHTML = `<p class="ordered-loading">Could not load orders: ${escapeHtml(error.message)}</p>`;
  }
}

function escapeHtml(value) {
  const element = document.createElement('div');
  element.textContent = value == null ? '' : String(value);
  return element.innerHTML;
}

loadOrderedList();

function openEditDeleteModal(orderId, ownerId) {
  const dialog = document.querySelector('#orderEditDialog');
  const codeStep = dialog.querySelector('.order-edit-code-step');
  const form = document.querySelector('#orderEditForm');
  const codeInput = document.querySelector('#editCodeInput');
  const message = document.querySelector('#editOrderMessage');
  const sizeCategory = document.querySelector('#editOrderSizeCategory');
  const sizeSelect = document.querySelector('#editOrderSize');
  const card = document.querySelector(`.ordered-card[data-order-id="${CSS.escape(orderId)}"]`);

  codeInput.value = '';
  form.hidden = true;
  codeStep.hidden = false;
  message.textContent = '';

  const name = card.dataset.name || '';
  const sizeCategoryValue = card.dataset.sizeCategory || 'Adult';
  const sizeValue = card.dataset.size || '';
  document.querySelector('#editOrderName').value = name;
  sizeCategory.value = sizeCategoryValue;
  document.querySelector('#editOrderNumber').value = card.dataset.displayNumber;
  document.querySelector('#editOrderDisplayName').value = card.dataset.displayName;
  document.querySelector('#editOrderMemo').value = '';

  const adultSizes = ['XS','S','M','L','XL','2XL','3XL','4XL','5XL','6XL','7XL','8XL','9XL','10XL'];
  const kidSizes = ['24','26','28','30','34','36'];
  function updateSizeOptions() {
    const sizes = sizeCategory.value === 'Kid' ? kidSizes : adultSizes;
    sizeSelect.innerHTML = sizes.map(size => `<option ${size === (sizeValue || '') ? 'selected' : ''}>${size}</option>`).join('');
  }
  sizeCategory.onchange = updateSizeOptions;
  updateSizeOptions();

  dialog.showModal();

  document.querySelector('#unlockOrderButton').onclick = async () => {
    const token = codeInput.value.trim().toUpperCase().replace(/\s+/g, '');
    message.className = 'edit-order-message';
    if (!token) {
      message.textContent = 'Enter your private code';
      message.style.color = '#be123c';
      return;
    }
    const cardName = card.dataset.displayName || '';
    const cardNumber = card.dataset.displayNumber || '';
    const expectedCode = `${cardName}_${cardNumber}`.replace(/\s+/g, '').toUpperCase();
    if (token !== expectedCode) {
      message.textContent = 'Invalid or expired private code';
      message.style.color = '#be123c';
      return;
    }
    codeStep.hidden = true;
    form.hidden = false;
    message.textContent = '';
  };

  form.onsubmit = async event => {
    event.preventDefault();
    const token = codeInput.value.trim();
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/orders?order_id=eq.${orderId}`, {
        method: 'PATCH',
        headers: {...SUPABASE_HEADERS, Prefer: 'return=minimal'},
        body: JSON.stringify({
          name: document.querySelector('#editOrderName').value.trim(),
          size_category: sizeCategory.value,
          size: sizeSelect.value,
          custom_display_number: document.querySelector('#editOrderNumber').value.trim() || null,
          custom_display_name: document.querySelector('#editOrderDisplayName').value.trim().toUpperCase() || null,
          memo: document.querySelector('#editOrderMemo').value.trim() || null
        })
      });
      if (!response.ok) throw new Error(await readResponseMessage(response));

      dialog.close();
      await loadOrderedList();
    } catch (error) {
      message.textContent = error.message || 'Failed to update order';
      message.style.color = '#be123c';
    }
  };

  const deleteButton = document.querySelector('#deleteOrderButton');
  deleteButton.onclick = async () => {
    if (!confirm('Delete this order?')) return;
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/soft_delete_order`, {
        method: 'POST',
        headers: {...SUPABASE_HEADERS, Prefer: 'return=minimal'},
        body: JSON.stringify({order_id_input: Number(orderId)})
      });
      if (!response.ok) throw new Error(await readResponseMessage(response));
      dialog.close();
      await loadOrderedList();
    } catch (error) {
      message.textContent = error.message || 'Failed to delete order';
      message.style.color = '#be123c';
    }
  };
}

async function readResponseMessage(response) {
  const text = await response.text();
  if (!text) return 'Request failed';
  try {
    const result = JSON.parse(text);
    return result.message || result.error || text;
  } catch (_error) {
    return text;
  }
}
