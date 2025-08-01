const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./pos.db');

db.serialize(() => {
    // テーブル作成
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price INTEGER NOT NULL,
        inventory INTEGER NOT NULL DEFAULT 0
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_time TEXT NOT NULL,
        total_price INTEGER NOT NULL,
        details TEXT NOT NULL
    )`);

    // データ投入の確認と実行
    db.get("SELECT count(*) as count FROM products", (err, row) => {
        if (err) {
            console.error("データベースエラー:", err.message);
            db.close(); // エラー時もDBを閉じる
            return;
        }
        if (row.count === 0) {
            console.log('商品テーブルに初期データを投入します...');
            const products = [
                { name: '商品A', price: 500, inventory: 20 },
                { name: '商品B', price: 800, inventory: 15 },
                { name: '商品C', price: 350, inventory: 30 },
                { name: '商品D', price: 1200, inventory: 10 },
            ];
            const stmt = db.prepare("INSERT INTO products (name, price, inventory) VALUES (?, ?, ?)");
            products.forEach(p => {
                stmt.run(p.name, p.price, p.inventory);
            });
            stmt.finalize();
        }
        
        db.close((err) => {
            if (err) {
                return console.error(err.message);
            }
            console.log('データベースのセットアップが完了し、接続を閉じました。');
        });
    });
});