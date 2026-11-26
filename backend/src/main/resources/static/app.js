const itemsContainer = document.querySelector('#items');
const itemCount = document.querySelector('#item-count');
const form = document.querySelector('#orderForm');
const message = document.querySelector('#message');

function addItem(values = {}) {
  const row = document.createElement('div');
  row.className = 'item-row';
  row.innerHTML = `
    <button type="button" class="remove-item" title="Remove shirt" aria-label="Remove shirt">×</button>
    <label>Name<input class="member-name" maxlength="100" value="${values.name || ''}" placeholder="Person name"></label>
    <label>Relationship<select class="relationship" required><option value="Head" ${values.relationship === 'Head' ? 'selected' : ''}>Head</option><option value="Spouse" ${values.relationship === 'Spouse' ? 'selected' : ''}>Spouse</option><option value="Child" ${values.relationship === 'Child' ? 'selected' : ''}>Child</option><option value="Other" ${values.relationship === 'Other' ? 'selected' : ''}>Other</option><option value="Standalone" ${values.relationship === 'Standalone' ? 'selected' : ''}>Standalone</option></select></label>
    <label>Size type<select class="size-category" required><option value="">Select</option><option value="Adult" ${values.sizeCategory === 'Adult' ? 'selected' : ''}>Adult</option><option value="Kid" ${values.sizeCategory === 'Kid' ? 'selected' : ''}>Kid</option></select></label>
    <label>Size<select class="size" required><option value="">Select</option>${['XS','S','M','L','XL','XXL','28','30','32','34','36','38'].map(size => `<option ${values.size === size ? 'selected' : ''}>${size}</option>`).join('')}</select></label>
    <label>Custom display number<input class="shirt-number" maxlength="30" value="${values.shirtNumber || ''}" placeholder="e.g. 24"></label>
    <label>Custom display name<input class="custom-name" maxlength="50" value="${values.customName || ''}" placeholder="Name printed"></label>
    <label>Memo<input class="item-memo" maxlength="255" value="${values.memo || ''}" placeholder="Order note"></label>`;
  row.querySelector('.remove-item').addEventListener('click', () => { if (itemsContainer.children.length > 1) { row.remove(); updateCount(); } });
  itemsContainer.appendChild(row);
  updateCount();
}

function updateCount() {
  const count = itemsContainer.children.length;
  itemCount.textContent = `${count} ${count === 1 ? 'shirt' : 'shirts'}`;
}

document.querySelector('#addItem').addEventListener('click', () => addItem());

form.addEventListener('submit', async event => {
  event.preventDefault();
  message.textContent = 'Submitting...';
  const payload = {
    name: document.querySelector('#name').value.trim(),
    memo: document.querySelector('#memo').value.trim(),
    items: [...itemsContainer.querySelectorAll('.item-row')].map(row => ({
      name: row.querySelector('.member-name').value.trim(),
      relationship: row.querySelector('.relationship').value,
      sizeCategory: row.querySelector('.size-category').value,
      size: row.querySelector('.size').value,
      shirtNumber: row.querySelector('.shirt-number').value.trim(),
      customName: row.querySelector('.custom-name').value.trim(),
      memo: row.querySelector('.item-memo').value.trim()
    }))
  };

  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(await response.text());
    form.reset();
    itemsContainer.innerHTML = '';
    addItem();
    document.querySelector('#successDialog').showModal();
    message.textContent = '';
  } catch (error) {
    message.textContent = error.message || 'The order could not be submitted';
  }
});

document.querySelector('#closeDialog').addEventListener('click', () => document.querySelector('#successDialog').close());
addItem();
