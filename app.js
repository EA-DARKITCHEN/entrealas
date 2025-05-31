class OrderManager {
  constructor() {
    this.currentOrder = this.createEmptyOrder();
    this.products = this.getProductList();
    this.productCache = this.createProductCache();
    this.productCards = new Map();
    this.specialOrder = {
      items: [],
      total: 0
    };
    this.orderCounter = 1;
    this.debounceTimer = null;
    
    this.initElements();
    this.initEvents();
    this.renderProducts();
  }

  createEmptyOrder() {
    return {
      client: { name: '', phone: '' },
      items: [],
      notes: '',
      status: 'pending',
      total: 0,
      code: '',
      timestamp: null
    };
  }

  getProductList() {
    return {
      alitas: [
        { id: 1, name: "Alitas Mango Habanero", price: 85 },
        { id: 2, name: "Alitas BBQ", price: 85 },
        { id: 3, name: "Alitas Buffalo", price: 85 }
      ],
      boneless: [
        { id: 4, name: "Boneless Mango Habanero", price: 75 },
        { id: 5, name: "Boneless BBQ", price: 75 },
        { id: 6, name: "Boneless Buffalo", price: 75 }
      ],
      papas: [
        { id: 7, name: "Papas Delgadas", price: 35 },
        { id: 8, name: "Papas Onduladas", price: 35 },
        { id: 9, name: "Papas con Queso", price: 45 }
      ],
      bebidas: [
        { id: 10, name: "Frappe Moka", price: 40 },
        { id: 11, name: "Frappe Oreo", price: 40 },
        { id: 12, name: "Frappe Fresa", price: 40 },
        { id: 13, name: "Refresco 600ml", price: 25 },
        { id: 14, name: "Agua Mineral", price: 20 }
      ]
    };
  }

  createProductCache() {
    const cache = new Map();
    Object.values(this.products).flat().forEach(product => {
      cache.set(product.id.toString(), product);
    });
    return cache;
  }

  initElements() {
    // Helper mejorado con validación
    const getElement = (id, required = true) => {
      const element = document.getElementById(id);
      if (required && !element) {
        console.warn(`Elemento requerido no encontrado: ${id}`);
      }
      return element;
    };

    this.elements = {
      // Elementos principales
      clientName: getElement('client-name'),
      clientPhone: getElement('client-phone'),
      orderNotes: getElement('order-notes'),
      summaryItems: getElement('summary-items'),
      orderTotal: getElement('order-total'),
      
      // Botones principales
      saveBtn: getElement('saveOrderBtn'),
      whatsappBtn: getElement('whatsappBtn'),
      newOrderBtn: getElement('newOrderBtn'),
      statsBtn: getElement('statsBtn', false),
      
      // Elementos de resumen colapsible
      toggleSummary: getElement('toggleSummary', false),
      summaryContent: getElement('summaryContent', false),
      collapsedItemCount: getElement('collapsed-item-count', false),
      collapsedTotal: getElement('collapsed-total', false),
      
      // Elementos especiales
      sauceSelect: getElement('sauce-select', false),
      specialQtyDisplay: document.querySelector('#especiales .qty'),
      specialItemsList: getElement('special-items-list', false),
      specialOrderTotal: getElement('special-order-total', false),
      addSpecialItemBtn: getElement('add-special-item', false),
      addToCartBtn: getElement('add-to-cart', false)
    };

    this.specialQty = 0;
    
    // Verificar elementos críticos
    this.validateCriticalElements();
  }

  validateCriticalElements() {
    const critical = ['summaryItems', 'orderTotal'];
    const missing = critical.filter(key => !this.elements[key]);
    
    if (missing.length > 0) {
      throw new Error(`Elementos críticos faltantes: ${missing.join(', ')}`);
    }
  }

  initEvents() {
    // Event delegation con mejor rendimiento
    document.addEventListener('click', this.handleDocumentClick.bind(this));

    // Eventos de botones principales
    this.bindButtonEvents();
    
    // Input events con debounce mejorado
    this.setupInputEvents();

    // Eventos para pedidos especiales
    this.setupSpecialOrderEvents();
  }

  bindButtonEvents() {
    const buttonEvents = [
      { element: this.elements.saveBtn, handler: () => this.saveOrder() },
      { element: this.elements.whatsappBtn, handler: () => this.sendWhatsApp() },
      { element: this.elements.newOrderBtn, handler: () => this.resetOrder() },
      { element: this.elements.statsBtn, handler: () => this.showStats() },
      { element: this.elements.toggleSummary, handler: () => this.toggleSummary() }
    ];

    buttonEvents.forEach(({ element, handler }) => {
      if (element) {
        element.addEventListener('click', handler);
      }
    });

    // Evento para notas
    if (this.elements.orderNotes) {
      this.elements.orderNotes.addEventListener('input', (e) => {
        this.currentOrder.notes = e.target.value;
      });
    }
  }

  setupSpecialOrderEvents() {
    // Botones de cantidad especial
    const specialQtyBtns = document.querySelectorAll('#especiales .qty-btn');
    specialQtyBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        this.handleSpecialQtyChange(action);
      });
    });

    // Lista de items especiales
    if (this.elements.specialItemsList) {
      this.elements.specialItemsList.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-item');
        if (removeBtn) {
          e.stopPropagation();
          const itemId = parseInt(removeBtn.dataset.id);
          this.removeSpecialItem(itemId);
        }
      });
    }

    // Botones especiales
    if (this.elements.addSpecialItemBtn) {
      this.elements.addSpecialItemBtn.addEventListener('click', () => this.addSpecialItem());
    }
    
    if (this.elements.addToCartBtn) {
      this.elements.addToCartBtn.addEventListener('click', () => this.addSpecialToCart());
    }
  }

  handleDocumentClick(e) {
    const target = e.target;

    // Manejar tabs
    if (target.classList.contains('tab-btn')) {
      this.switchTab(target);
      return;
    }

    // Manejar botones de cantidad (solo productos normales)
    if (target.classList.contains('qty-btn') && target.closest('.product-card')) {
      this.handleQuantityChange(target);
      return;
    }

    // Manejar eliminación de items del resumen principal
    if (target.closest('.remove-item') && target.closest('#summary-items')) {
      e.stopPropagation();
      const btn = target.closest('.remove-item');
      const index = parseInt(btn.dataset.index);
      if (!isNaN(index)) {
        this.removeItem(index);
      }
      return;
    }
  }

  setupInputEvents() {
    const debounceUpdate = () => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.updateClientData(), 150);
    };

    [this.elements.clientName, this.elements.clientPhone].forEach(el => {
      if (el) {
        el.addEventListener('input', debounceUpdate);
      }
    });
  }

  toggleSummary() {
    if (!this.elements.summaryContent || !this.elements.toggleSummary) return;

    const content = this.elements.summaryContent;
    const icon = this.elements.toggleSummary.querySelector('i');
    const isExpanded = content.classList.contains('expanded');

    if (isExpanded) {
      content.classList.replace('expanded', 'collapsed');
      if (icon) icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
    } else {
      content.classList.replace('collapsed', 'expanded');
      if (icon) icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
    }
  }

  updateCollapsedSummary() {
    if (!this.elements.collapsedItemCount || !this.elements.collapsedTotal) {
      return;
    }

    const itemCount = this.currentOrder.items.reduce((total, item) => total + item.quantity, 0);
    const itemText = itemCount === 1 ? 'producto' : 'productos';

    this.elements.collapsedItemCount.textContent = `${itemCount} ${itemText}`;
    this.elements.collapsedTotal.textContent = `$${this.currentOrder.total.toFixed(2)}`;
  }

  switchTab(btn) {
    const tab = btn.getAttribute('data-tab');
    if (!tab) return;

    // Remover clases activas
    document.querySelectorAll('.tab-btn.active').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content.active').forEach(c => c.classList.remove('active'));

    // Agregar clases activas
    btn.classList.add('active');
    const tabContent = document.getElementById(tab);
    if (tabContent) {
      tabContent.classList.add('active');
    }
  }

  renderProducts() {
    for (const [category, items] of Object.entries(this.products)) {
      const container = document.getElementById(category);
      if (!container) {
        console.warn(`Contenedor no encontrado para categoría: ${category}`);
        continue;
      }

      // Crear HTML de productos
      container.innerHTML = items.map(({ id, name, price }) => `
        <div class="product-card" data-id="${id}">
          <div class="product-info">
            <h3>${this.escapeHtml(name)}</h3>
            <span class="price">$${price}</span>
          </div>
          <div class="product-controls">
            <button class="qty-btn minus" data-action="minus" type="button">-</button>
            <span class="qty">0</span>
            <button class="qty-btn plus" data-action="plus" type="button">+</button>
          </div>
        </div>
      `).join('');

      // Cache de product cards
      container.querySelectorAll('.product-card').forEach(card => {
        const qtyElement = card.querySelector('.qty');
        if (qtyElement) {
          this.productCards.set(card.dataset.id, {
            element: card,
            qtyElement
          });
        }
      });
    }
  }

  // Método helper para escapar HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  handleQuantityChange(btn) {
    const card = btn.closest('.product-card');
    if (!card) return;

    const productId = card.dataset.id;
    const cachedCard = this.productCards.get(productId);

    if (!cachedCard) return;

    let qty = parseInt(cachedCard.qtyElement.textContent) || 0;
    const isPlus = btn.classList.contains('plus');

    qty = isPlus ? qty + 1 : Math.max(qty - 1, 0);
    cachedCard.qtyElement.textContent = qty;

    this.updateOrderItemFast(productId, qty);
  }

  updateOrderItemFast(productId, quantity) {
    const product = this.productCache.get(productId);
    if (!product) return;

    const existingIndex = this.currentOrder.items.findIndex(item => item.id === productId);

    if (quantity === 0) {
      // Remover item
      if (existingIndex !== -1) {
        this.currentOrder.items.splice(existingIndex, 1);
      }
    } else {
      // Actualizar o agregar item
      const itemData = {
        id: productId,
        name: product.name,
        price: product.price,
        quantity: quantity
      };

      if (existingIndex !== -1) {
        this.currentOrder.items[existingIndex] = itemData;
      } else {
        this.currentOrder.items.push(itemData);
      }
    }

    this.updateSummaryFast();
  }

  updateSummaryFast() {
    // Calcular total
    this.currentOrder.total = this.currentOrder.items.reduce(
      (total, item) => total + (item.price * item.quantity), 0
    );

    // Crear fragment para mejor rendimiento
    const fragment = document.createDocumentFragment();

    this.currentOrder.items.forEach((item, index) => {
      const itemTotal = item.price * item.quantity;

      const itemEl = document.createElement('div');
      itemEl.className = 'summary-item';
      itemEl.innerHTML = `
        <div class="item-info">
          <span>${item.quantity}x ${this.escapeHtml(item.name)}</span>
          <span>$${itemTotal.toFixed(2)}</span>
        </div>
        <button class="remove-item" data-index="${index}" type="button">
          <i class="fas fa-trash"></i>
        </button>
      `;
      fragment.appendChild(itemEl);
    });

    // Actualizar DOM una sola vez
    this.elements.summaryItems.innerHTML = '';
    this.elements.summaryItems.appendChild(fragment);
    this.elements.orderTotal.textContent = `$${this.currentOrder.total.toFixed(2)}`;

    this.updateCollapsedSummary();
  }

  updateClientData() {
    this.currentOrder.client = {
      name: this.elements.clientName?.value.trim() || '',
      phone: this.elements.clientPhone?.value.trim() || ''
    };
  }

  removeItem(index) {
    if (index < 0 || index >= this.currentOrder.items.length) return;

    const removedItem = this.currentOrder.items[index];
    if (removedItem && !removedItem.isSpecial) {
      // Actualizar UI del producto solo si no es especial
      const cachedCard = this.productCards.get(removedItem.id);
      if (cachedCard) {
        cachedCard.qtyElement.textContent = '0';
      }
    }

    this.currentOrder.items.splice(index, 1);
    this.updateSummaryFast();
  }

  removeSpecialItem(itemId) {
    const itemIndex = this.specialOrder.items.findIndex(item => item.id === itemId);

    if (itemIndex !== -1) {
      // Restar del total
      this.specialOrder.total -= this.specialOrder.items[itemIndex].totalPrice;
      
      // Eliminar del array
      this.specialOrder.items.splice(itemIndex, 1);
      
      // Actualizar UI
      this.updateSpecialOrderUI();
    }
  }

  validateOrder() {
    if (this.currentOrder.items.length === 0) {
      this.showAlert('Debe agregar al menos un producto');
      return false;
    }
    
    // Validación adicional para datos del cliente si es requerido
    const { name, phone } = this.currentOrder.client;
    if (!name && !phone) {
      const proceed = confirm('No se han ingresado datos del cliente. ¿Desea continuar?');
      if (!proceed) return false;
    }
    
    return true;
  }

  saveOrder() {
    if (!this.validateOrder()) return;
    
    // Generar código y timestamp si no existen
    if (!this.currentOrder.code) {
      this.currentOrder.code = this.generateOrderCode();
      this.currentOrder.timestamp = new Date().toISOString();
    }
    
    try {
      // Aquí podrías guardar en localStorage, base de datos, etc.
      console.log('Pedido guardado:', this.currentOrder);
      this.showAlert(`Pedido ${this.currentOrder.code} guardado correctamente`);
    } catch (error) {
      console.error('Error al guardar pedido:', error);
      this.showAlert('Error al guardar el pedido. Inténtelo nuevamente.');
    }
  }

  generateOrderCode() {
    const now = new Date();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear().toString().slice(-2);
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `EA-${month}${year}-${randomPart}`;
  }

  sendWhatsApp() {
    if (!this.validateOrder()) return;

    // Generar código único para el pedido
    if (!this.currentOrder.code) {
      this.currentOrder.code = this.generateOrderCode();
      this.currentOrder.timestamp = new Date().toISOString();
    }

    // Confirmación de seguridad
    const confirmation = confirm(
      `¿Está seguro de enviar el pedido ${this.currentOrder.code} a WhatsApp?\n\n` +
      'Revise que toda la información sea correcta.'
    );
    if (!confirmation) return;

    try {
      const message = this.formatWhatsAppMessage();
      console.log('Mensaje generado:', message); // Debug
      
      // Codificar el mensaje para URL
      const encodedMessage = encodeURIComponent(message);
      console.log('Mensaje codificado:', encodedMessage); // Debug
      
      // Crear URL de WhatsApp
      const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
      console.log('URL de WhatsApp:', whatsappUrl); // Debug
      
      // Intentar abrir WhatsApp de múltiples formas
      const opened = this.openWhatsApp(whatsappUrl);
      
      if (opened) {
        // Limpiar después del envío exitoso
        setTimeout(() => {
          this.resetOrderAfterSend();
        }, 1000); // Dar tiempo para que se abra WhatsApp
      } else {
        this.showAlert('No se pudo abrir WhatsApp. Intente copiar el mensaje manualmente.');
        this.showMessageForCopy(message);
      }
      
    } catch (error) {
      console.error('Error al enviar WhatsApp:', error);
      this.showAlert('Error al generar el mensaje. Inténtelo nuevamente.');
    }
  }

  openWhatsApp(url) {
    try {
      // Método 1: window.open
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      
      if (newWindow) {
        // Verificar si la ventana se abrió
        setTimeout(() => {
          if (newWindow.closed) {
            console.log('WhatsApp se abrió correctamente');
          }
        }, 1000);
        return true;
      }
      
      // Método 2: crear enlace temporal y hacer click
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      // Agregar al DOM temporalmente
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return true;
      
    } catch (error) {
      console.error('Error al abrir WhatsApp:', error);
      
      // Método 3: cambiar location (último recurso)
      try {
        window.location.href = url;
        return true;
      } catch (locationError) {
        console.error('Error con location.href:', locationError);
        return false;
      }
    }
  }

  showMessageForCopy(message) {
    // Crear modal o área de texto para copiar el mensaje manualmente
    const textarea = document.createElement('textarea');
    textarea.value = message;
    textarea.style.position = 'fixed';
    textarea.style.top = '50%';
    textarea.style.left = '50%';
    textarea.style.transform = 'translate(-50%, -50%)';
    textarea.style.width = '80%';
    textarea.style.height = '60%';
    textarea.style.zIndex = '9999';
    textarea.style.padding = '10px';
    textarea.style.border = '2px solid #ccc';
    textarea.style.borderRadius = '5px';
    
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    overlay.style.zIndex = '9998';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Cerrar';
    closeBtn.style.position = 'fixed';
    closeBtn.style.top = '40%';
    closeBtn.style.left = '50%';
    closeBtn.style.transform = 'translateX(-50%)';
    closeBtn.style.zIndex = '10000';
    closeBtn.style.padding = '10px 20px';
    closeBtn.style.backgroundColor = '#007bff';
    closeBtn.style.color = 'white';
    closeBtn.style.border = 'none';
    closeBtn.style.borderRadius = '5px';
    closeBtn.style.cursor = 'pointer';
    
    const cleanup = () => {
      document.body.removeChild(textarea);
      document.body.removeChild(overlay);
      document.body.removeChild(closeBtn);
    };
    
    closeBtn.onclick = cleanup;
    overlay.onclick = cleanup;
    
    document.body.appendChild(overlay);
    document.body.appendChild(textarea);
    document.body.appendChild(closeBtn);
    
    textarea.select();
    textarea.focus();
    
    // Intentar copiar automáticamente
    try {
      document.execCommand('copy');
      alert('Mensaje copiado al portapapeles. Puede pegarlo en WhatsApp manualmente.');
    } catch (e) {
      alert('Copie el mensaje mostrado y péguelo en WhatsApp manualmente.');
    }
  }

  formatWhatsAppMessage() {
    // Función helper para limpiar texto
    const cleanText = (text) => {
      if (!text) return '';
      return text.toString().trim().replace(/\s+/g, ' ');
    };

    // Emojis usando diferentes métodos para mayor compatibilidad
    const emojis = {
        shopping: String.fromCodePoint(0x1F6CD, 0xFE0F), // 🛍️
        package: String.fromCodePoint(0x1F4E6), // 📦
        person: String.fromCodePoint(0x1F464), // 👤
        phone: String.fromCodePoint(0x1F4DE), // 📞
        chicken: String.fromCodePoint(0x1F357), // 🍗
        money: String.fromCodePoint(0x1F4B5), // 💵
        note: String.fromCodePoint(0x1F4DD), // 📝
        card: String.fromCodePoint(0x1F4B3), // 💳
        cash: String.fromCodePoint(0x1F4B0), // 💰
        bank: String.fromCodePoint(0x1F3E6), // 🏦
        check: String.fromCodePoint(0x2705), // ✅
        bullet: String.fromCodePoint(0x2022) // •
    };

    const itemsText = this.currentOrder.items.map(
      ({ name, quantity, price }) => {
        const itemTotal = (price * quantity).toFixed(2);
        return `${emojis.chicken} *${quantity}x* ${cleanText(name)} - $${itemTotal}`;
      }
    ).join('\n');

    const { name, phone } = this.currentOrder.client;
    const notes = cleanText(this.currentOrder.notes);

    let message = `${emojis.shopping} *Nuevo Pedido - EntreAlas* ${emojis.shopping}\n\n` +
      `${emojis.package} *Código de pedido:* ${this.currentOrder.code}\n\n`;

    if (name) {
      message += `${emojis.person} *Cliente:* ${cleanText(name)}\n`;
    }
    
    if (phone) {
      message += `${emojis.phone} *Teléfono:* ${cleanText(phone)}\n`;
    }
    
    if (name || phone) {
      message += `\n`;
    }

    message += 
      `${emojis.package} *Detalle del pedido:*\n${itemsText}\n\n` +
      `${emojis.money} *Total a pagar: $${this.currentOrder.total.toFixed(2)}*\n`;

    if (notes) {
      message += `\n${emojis.note} *Notas:* ${notes}\n`;
    }

    message += `\n` +
      `${emojis.card} *Métodos de pago disponibles:*\n` +
      `${emojis.bullet} Efectivo ${emojis.cash}\n` +
      `${emojis.bullet} Transferencia bancaria ${emojis.bank}\n` +
      `${emojis.bullet} Tarjetas de débito/crédito ${emojis.card}\n\n` +
      `${emojis.check} ¡Gracias por tu pedido! Pronto nos pondremos en contacto contigo.`;

    // Asegurar codificación UTF-8
    return this.ensureUTF8(message);
}

// Función auxiliar para asegurar codificación UTF-8
ensureUTF8(text) {
    try {
        // Método 1: Normalización Unicode
        const normalized = text.normalize('NFC');
        
        // Método 2: Conversión a Buffer y de vuelta (Node.js)
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(normalized, 'utf8').toString('utf8');
        }
        
        // Método 3: Para navegadores
        const encoder = new TextEncoder();
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(encoder.encode(normalized));
        
    } catch (error) {
        console.warn('Error en codificación UTF-8:', error);
        return text;
    }
}

  resetOrderAfterSend() {
    this.currentOrder = this.createEmptyOrder();
    
    // Limpiar campos del formulario
    if (this.elements.clientName) this.elements.clientName.value = '';
    if (this.elements.clientPhone) this.elements.clientPhone.value = '';
    if (this.elements.orderNotes) this.elements.orderNotes.value = '';
    
    // Resetear cantidades de productos
    this.productCards.forEach(cached => {
      cached.qtyElement.textContent = '0';
    });
    
    // Resetear pedido especial
    this.resetSpecialOrder();
    
    // Actualizar UI
    this.updateSummaryFast();
    this.updateSpecialOrderUI();
    
    this.showAlert('Pedido enviado correctamente. Los campos han sido limpiados para un nuevo pedido.');
  }

  resetOrder() {
    const confirmMsg = '¿Está seguro de comenzar un nuevo pedido? Se perderán todos los datos no guardados.';
    if (!confirm(confirmMsg)) return;

    this.currentOrder = this.createEmptyOrder();
    
    // Limpiar campos
    if (this.elements.clientName) this.elements.clientName.value = '';
    if (this.elements.clientPhone) this.elements.clientPhone.value = '';
    if (this.elements.orderNotes) this.elements.orderNotes.value = '';

    // Resetear quantities
    this.productCards.forEach(cached => {
      cached.qtyElement.textContent = '0';
    });

    this.resetSpecialOrder();
    this.updateSummaryFast();
    this.updateSpecialOrderUI();
  }

  resetSpecialOrder() {
    this.specialOrder = { items: [], total: 0 };
    this.specialQty = 0;
    
    if (this.elements.specialQtyDisplay) {
      this.elements.specialQtyDisplay.textContent = '0';
    }
    if (this.elements.specialItemsList) {
      this.elements.specialItemsList.innerHTML = '';
    }
    if (this.elements.specialOrderTotal) {
      this.elements.specialOrderTotal.textContent = '$0.00';
    }
  }

  showStats() {
    // Placeholder para estadísticas
    this.showAlert('Función de estadísticas - Por implementar');
  }

  /* Métodos para Pedidos Especiales */
  handleSpecialQtyChange(action) {
    if (action === 'increase') {
      this.specialQty++;
    } else if (action === 'decrease' && this.specialQty > 0) {
      this.specialQty--;
    }

    if (this.elements.specialQtyDisplay) {
      this.elements.specialQtyDisplay.textContent = this.specialQty;
    }
  }

  addSpecialItem() {
    if (!this.elements.sauceSelect) return;

    const sauce = this.elements.sauceSelect.value;
    const quantity = this.specialQty;

    if (!sauce || quantity <= 0) {
      this.showAlert('Por favor selecciona una salsa y cantidad válida');
      return;
    }

    const sauceName = this.elements.sauceSelect.options[this.elements.sauceSelect.selectedIndex].text;
    const pricePerUnit = this.calculateSpecialPrice(sauce);
    const totalPrice = pricePerUnit * quantity;

    const newItem = {
      id: Date.now(), // Usar timestamp como ID único
      sauce,
      sauceName,
      quantity,
      pricePerUnit,
      totalPrice
    };

    this.specialOrder.items.push(newItem);
    this.specialOrder.total += totalPrice;

    this.updateSpecialOrderUI();

    // Resetear controles
    this.specialQty = 0;
    if (this.elements.specialQtyDisplay) {
      this.elements.specialQtyDisplay.textContent = '0';
    }
  }

  calculateSpecialPrice(sauce) {
    const premiumSauces = ['parmesano', 'mango-habanero', 'limon-pimienta'];
    return 25 + (premiumSauces.includes(sauce) ? 5 : 0);
  }

  updateSpecialOrderUI() {
    if (!this.elements.specialItemsList || !this.elements.specialOrderTotal) return;

    // Limpiar lista
    this.elements.specialItemsList.innerHTML = '';

    // Agregar items
    this.specialOrder.items.forEach(item => {
      const itemElement = document.createElement('div');
      itemElement.className = 'special-item';
      itemElement.innerHTML = `
        <div class="item-info">
          <span>${item.quantity} alitas ${this.escapeHtml(item.sauceName)}</span>
          <span>$${item.pricePerUnit.toFixed(2)} c/u</span>
        </div>
        <span>$${item.totalPrice.toFixed(2)}</span>
        <button class="remove-item" data-id="${item.id}" type="button">
          <i class="fas fa-times"></i>
        </button>
      `;
      this.elements.specialItemsList.appendChild(itemElement);
    });

    // Actualizar total
    this.elements.specialOrderTotal.textContent = `$${this.specialOrder.total.toFixed(2)}`;

    // Habilitar/deshabilitar botón
    if (this.elements.addToCartBtn) {
      this.elements.addToCartBtn.disabled = this.specialOrder.items.length === 0;
    }
  }

  addSpecialToCart() {
    if (this.specialOrder.items.length === 0) return;

    // Crear descripción del pedido especial
    const itemsBySauce = this.groupSpecialItemsBySauce();
    const description = "Pedido Especial: " + 
      Object.entries(itemsBySauce)
        .map(([sauce, qty]) => `${qty} ${sauce}`)
        .join(', ');

    // Agregar al carrito principal
    this.addToCart({
      id: `special-${Date.now()}`,
      name: description,
      price: this.specialOrder.total,
      quantity: 1,
      isSpecial: true
    });

    // Resetear pedido especial
    this.resetSpecialOrder();
    this.updateSpecialOrderUI();

    this.showAlert('Pedido especial agregado al carrito principal');
  }

  groupSpecialItemsBySauce() {
    const itemsBySauce = {};
    this.specialOrder.items.forEach(item => {
      if (!itemsBySauce[item.sauceName]) {
        itemsBySauce[item.sauceName] = 0;
      }
      itemsBySauce[item.sauceName] += item.quantity;
    });
    return itemsBySauce;
  }

  addToCart(item) {
    this.currentOrder.items.push(item);
    this.updateSummaryFast();
  }

  // Helper para mostrar alertas (puede ser reemplazado por un modal)
  showAlert(message) {
    alert(message);
  }

  // Método de limpieza para prevenir memory leaks
  destroy() {
    // Limpiar timers
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    // Limpiar event listeners si es necesario
    // (En este caso, al usar event delegation, no es crítico)
    
    // Limpiar references
    this.productCards.clear();
    this.productCache.clear();
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  try {
    new OrderManager();
  } catch (error) {
    console.error('Error al inicializar OrderManager:', error);
    alert('Error al cargar la aplicación. Revise la consola para más detalles.');
  }
});
