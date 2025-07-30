document.addEventListener('DOMContentLoaded', () => {
    // --- 要素の取得 ---
    const registerSection = document.getElementById('register-section');
    const historySection = document.getElementById('history-section');
    const settingsSection = document.getElementById('settings-section');
    const showRegisterBtn = document.getElementById('show-register');
    const showHistoryBtn = document.getElementById('show-history');
    const showSettingsBtn = document.getElementById('show-settings');
    const navButtons = [showRegisterBtn, showHistoryBtn, showSettingsBtn];
    const productListDiv = document.querySelector('.product-list-container');
    const cartDiv = document.querySelector('.cart');
    const totalPriceSpan = document.getElementById('total-price');
    const confirmBtn = document.querySelector('.confirm-btn');
    const historyTableBody = document.querySelector('#history-section tbody');
    const settingsProductList = document.getElementById('settings-product-list');
    const addProductForm = document.getElementById('add-product-form');

    // --- アプリケーションの状態 ---
    let products = [];
    let cart = [];

    // --- 画面表示 更新関数 ---
    function showSection(sectionToShow) { [registerSection, historySection, settingsSection].forEach(s => s.classList.add('hidden')); sectionToShow.classList.remove('hidden'); }
    function updateNav(activeBtn) { navButtons.forEach(btn => btn.classList.remove('active')); activeBtn.classList.add('active'); }
    function renderProducts() {
        productListDiv.innerHTML = '';
        products.forEach(product => {
            const cartItem = cart.find(item => item.id === product.id);
            const quantityInCart = cartItem ? cartItem.quantity : 0;
            const itemDiv = document.createElement('div');
            itemDiv.className = 'product-item';
            itemDiv.innerHTML = `<div class="product-info"><div class="name">${product.name} (残: ${product.inventory})</div><div class="price">¥${product.price}</div></div><div class="quantity-controls"><button class="quantity-btn minus-btn" data-id="${product.id}">-</button><span class="quantity-display">${quantityInCart}</span><button class="quantity-btn plus-btn" data-id="${product.id}">+</button></div>`;
            productListDiv.appendChild(itemDiv);
        });
    }
    function renderCart() {
        cartDiv.innerHTML = '';
        let total = 0;
        cart.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'cart-item';
            itemDiv.textContent = `${item.name} x ${item.quantity}`;
            cartDiv.appendChild(itemDiv);
            total += item.price * item.quantity;
        });
        totalPriceSpan.textContent = `¥${total}`;
    }

    // --- カート操作ロジック ---
    function addToCart(productId) {
        const product = products.find(p => p.id === productId);
        const cartItem = cart.find(item => item.id === productId);
        if (product.inventory <= (cartItem ? cartItem.quantity : 0)) { alert('在庫がありません。'); return; }
        if (cartItem) { cartItem.quantity++; } else { cart.push({ ...product, quantity: 1 }); }
        renderProducts(); renderCart();
    }
    function removeFromCart(productId) {
        const cartItem = cart.find(item => item.id === productId);
        if (!cartItem) return;
        cartItem.quantity--;
        if (cartItem.quantity === 0) { cart = cart.filter(item => item.id !== productId); }
        renderProducts(); renderCart();
    }

    // --- API通信 & ページごとの処理 ---
    async function initRegisterPage() {
        try {
            const response = await fetch('http://localhost:3000/api/products');
            products = await response.json();
            renderProducts(); renderCart();
        } catch (error) { console.error('商品データの取得に失敗:', error); }
    }
    async function confirmSale() {
        if (cart.length === 0) { alert('カートが空です。'); return; }
        const saleData = {
            totalPrice: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
            details: JSON.stringify(cart.map(item => ({ id: item.id, name: item.name, quantity: item.quantity })))
        };
        try {
            const response = await fetch('http://localhost:3000/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(saleData) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            alert('ありがとうございました！');
            cart = [];
            initRegisterPage();
        } catch (error) { alert(`エラー: ${error.message}`); }
    }
    async function displayHistoryPage() {
        try {
            const response = await fetch('http://localhost:3000/api/sales');
            const sales = await response.json();
            const totalSalesAmountSpan = document.getElementById('total-sales-amount');
            historyTableBody.innerHTML = '';
            let totalSales = 0;
            sales.forEach(sale => {
                const details = JSON.parse(sale.details).map(d => `${d.name} x${d.quantity}`).join(', ');
                const date = new Date(sale.sale_time).toLocaleString('ja-JP');
                historyTableBody.innerHTML += `<tr data-id="${sale.id}"><td>${date}</td><td>¥${sale.total_price}</td><td>${details}</td><td class="actions-cell"><button class="delete-btn">削除</button></td></tr>`;
                totalSales += sale.total_price;
            });
            totalSalesAmountSpan.textContent = `¥${totalSales}`;
            document.querySelector('#total-sales-amount').parentElement.children[0].colSpan = 3;
        } catch (error) { console.error('履歴の取得に失敗:', error); }
    }
    async function displaySettingsPage() {
        try {
            const response = await fetch('http://localhost:3000/api/products');
            const products = await response.json();
            settingsProductList.innerHTML = '';
            products.forEach(p => {
                const row = document.createElement('tr');
                row.dataset.id = p.id;
                row.innerHTML = `<td><input type="text" class="name-input" value="${p.name}"></td><td><input type="number" class="price-input" value="${p.price}"></td><td><input type="number" class="inventory-input" value="${p.inventory}"></td><td class="actions-cell"><button class="save-btn">保存</button><button class="delete-btn">削除</button></td>`;
                settingsProductList.appendChild(row);
            });
        } catch (error) { console.error('設定の表示に失敗:', error); }
    }

    // --- イベントリスナー設定 ---
    showRegisterBtn.addEventListener('click', () => { showSection(registerSection); updateNav(showRegisterBtn); initRegisterPage(); });
    showHistoryBtn.addEventListener('click', () => { showSection(historySection); updateNav(showHistoryBtn); displayHistoryPage(); });
    showSettingsBtn.addEventListener('click', () => { showSection(settingsSection); updateNav(showSettingsBtn); displaySettingsPage(); });
    confirmBtn.addEventListener('click', confirmSale);
    productListDiv.addEventListener('click', e => {
        const id = parseInt(e.target.dataset.id);
        if (e.target.classList.contains('plus-btn')) addToCart(id);
        if (e.target.classList.contains('minus-btn')) removeFromCart(id);
    });
    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('new-product-name').value;
        const price = document.getElementById('new-product-price').value;
        const inventory = document.getElementById('new-product-inventory').value;
        try {
            await fetch('http://localhost:3000/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, price, inventory }) });
            addProductForm.reset();
            displaySettingsPage();
        } catch (error) { console.error('商品追加エラー:', error); }
    });
    settingsProductList.addEventListener('click', async e => {
        const row = e.target.closest('tr');
        if (!row) return;
        const id = row.dataset.id;
        if (e.target.classList.contains('save-btn')) {
            const name = row.querySelector('.name-input').value;
            const price = row.querySelector('.price-input').value;
            const inventory = row.querySelector('.inventory-input').value;
            await fetch(`http://localhost:3000/api/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, price, inventory }) });
            alert('保存しました。');
        }
        if (e.target.classList.contains('delete-btn')) {
            if (confirm('本当にこの商品を削除しますか？')) {
                await fetch(`http://localhost:3000/api/products/${id}`, { method: 'DELETE' });
                displaySettingsPage();
            }
        }
    });
    // 【ここが履歴削除のイベントリスナーです】
    historySection.addEventListener('click', async e => {
        if (e.target.id === 'delete-all-history-btn') {
            if (confirm('本当に全ての購入履歴を削除しますか？\nこの操作は元に戻せません。')) {
                await fetch('http://localhost:3000/api/sales', { method: 'DELETE' });
                displayHistoryPage();
            }
        }
        if (e.target.classList.contains('delete-btn') && e.target.id !== 'delete-all-history-btn') {
            const row = e.target.closest('tr');
            const id = row.dataset.id;
            if (confirm('この会計履歴を削除しますか？')) {
                await fetch(`http://localhost:3000/api/sales/${id}`, { method: 'DELETE' });
                displayHistoryPage();
            }
        }
    });

    // --- 初期化 ---
    initRegisterPage();
});