const API_BASE_URL =
  window.location.hostname === 'localhost'
    ? ''
    : 'https://sapporo-baju.onrender.com';

const itemsContainer = document.querySelector('#items');
const itemCount = document.querySelector('#orderCount');
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
    const response = await fetch(`${API_BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    const responseText = await response.text();
    let result = {};
    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch (_error) {
      throw new Error(responseText || 'The order could not be submitted');
    }
    if (!response.ok) throw new Error(result.message || 'The order could not be submitted');
    if (result.editCodes) {
      const codes = Object.entries(result.editCodes).map(([orderId, code]) => `Order #${orderId}: ${code}`).join('\n');
      alert('Your private edit/delete codes:\n\n' + codes);
    } else if (result.editToken) {
      alert('Your private edit/delete code:\n\n' + result.editToken);
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
    const response = await fetch(`${API_BASE_URL}/api/orders/public-list`);
    if (!response.ok) throw new Error(await response.text());
    const orders = await response.json();

    count.textContent = `${orders.length} ${orders.length === 1 ? 'order' : 'orders'}`;
    grid.innerHTML = orders.map(order => `
      <article class="ordered-card" data-order-id="${escapeHtml(order.order_id)}" data-parent-id="${escapeHtml(order.parent_order_id || '')}" data-name="${escapeHtml(order.name)}" data-size-category="${escapeHtml(order.size_category)}" data-size="${escapeHtml(order.size)}" data-display-number="${escapeHtml(order.custom_display_number || '')}" data-display-name="${escapeHtml(order.custom_display_name || '')}">
        <div class="ordered-card-heading">
          <strong>#${escapeHtml(order.order_id)}</strong>
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
    const token = codeInput.value.trim();
    message.className = 'edit-order-message';
    if (!token) {
      message.textContent = 'Enter your private code';
      message.style.color = '#be123c';
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/verify-edit`, {
        method: 'POST', headers: {'X-Edit-Token': token}
      });
      if (!response.ok) {
        message.textContent = 'Invalid or expired private code';
        message.style.color = '#be123c';
        return;
      }
      codeStep.hidden = true;
      form.hidden = false;
      message.textContent = '';
    } catch (_error) {
      message.textContent = 'Invalid or expired private code';
      message.style.color = '#be123c';
    }
  };

  form.onsubmit = async event => {
    event.preventDefault();
    const token = codeInput.value.trim();
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json', 'X-Edit-Token': token},
        body: JSON.stringify({
          name: document.querySelector('#editOrderName').value.trim(),
          sizeCategory: sizeCategory.value,
          size: sizeSelect.value,
          customDisplayNumber: document.querySelector('#editOrderNumber').value.trim(),
          customDisplayName: document.querySelector('#editOrderDisplayName').value.trim().toUpperCase(),
          memo: document.querySelector('#editOrderMemo').value.trim()
        })
      });
      if (!response.ok) throw new Error(await readResponseMessage(response));
      const result = await response.json();
      if (result.editCode) alert('Updated private code:\n\n' + result.editCode);
      dialog.close();
      loadOrderedList();
    } catch (error) {
      message.textContent = error.message || 'Could not update order';
    }
  };

  document.querySelector('#deleteOrderButton').onclick = async () => {
    if (!confirm('Delete this order?')) return;
    const token = codeInput.value.trim();
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
        method: 'DELETE', headers: {'X-Edit-Token': token}
      });
      if (!response.ok) throw new Error(await readResponseMessage(response));
      dialog.close();
      loadOrderedList();
    } catch (error) {
      message.textContent = error.message || 'Could not delete order';
    }
  };

  document.querySelector('#closeOrderEdit')?.addEventListener('click', () => {
    document.querySelector('#orderEditDialog')?.close();
  });
}

async function readResponseMessage(response) {
  const text = await response.text();
  try {
    const result = JSON.parse(text);
    return result.message || result.error || text || 'Request failed';
  } catch (_error) {
    return text || 'Request failed';
  }
}
