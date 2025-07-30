const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

const db = new sqlite3.Database('./pos.db', (err) => {
    if (err) {
        console.error("データベース接続エラー:", err.message);
    }
});

// API: 全ての商品を取得する
app.get('/api/products', (req, res) => {
    db.all("SELECT * FROM products ORDER BY id ASC", [], (err, rows) => {
        if (err) { return res.status(500).json({ error: err.message }); }
        res.json(rows);
    });
});
// API: 商品を追加する
app.post('/api/products', (req, res) => {
    const { name, price, inventory } = req.body;
    db.run(`INSERT INTO products (name, price, inventory) VALUES (?, ?, ?)`, [name, price, inventory], function(err) {
        if (err) { return res.status(400).json({ error: err.message }); }
        res.json({ id: this.lastID });
    });
});
// API: 商品を更新する
app.put('/api/products/:id', (req, res) => {
    const { name, price, inventory } = req.body;
    db.run(`UPDATE products SET name = ?, price = ?, inventory = ? WHERE id = ?`,
        [name, price, inventory, req.params.id],
        function(err) {
            if (err) { return res.status(400).json({ error: err.message }); }
            res.json({ changes: this.changes });
        }
    );
});
// API: 商品を削除する
app.delete('/api/products/:id', (req, res) => {
    db.run(`DELETE FROM products WHERE id = ?`, req.params.id, function(err) {
        if (err) { return res.status(400).json({ error: err.message }); }
        res.json({ changes: this.changes });
    });
});
// API: 全ての売上履歴を取得する
app.get('/api/sales', (req, res) => {
    db.all("SELECT * FROM sales ORDER BY id DESC", [], (err, rows) => {
        if (err) { return res.status(500).json({ error: err.message }); }
        res.json(rows);
    });
});
// API: 売上を保存する
app.post('/api/sales', (req, res) => {
    const { totalPrice, details } = req.body;
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        const updatePromises = JSON.parse(details).map(item => {
            return new Promise((resolve, reject) => {
                db.run(`UPDATE products SET inventory = inventory - ? WHERE id = ? AND inventory >= ?`, 
                       [item.quantity, item.id, item.quantity], function(err) {
                    if (err || this.changes === 0) { reject(new Error(`商品「${item.name}」の在庫が不足しています。`)); } else { resolve(); }
                });
            });
        });
        Promise.all(updatePromises)
            .then(() => {
                const saleTime = new Date().toISOString();
                const sql = `INSERT INTO sales (sale_time, total_price, details) VALUES (?, ?, ?)`;
                db.run(sql, [saleTime, totalPrice, details], function(err) {
                    if (err) { db.run("ROLLBACK"); res.status(500).json({ error: "売上記録に失敗しました。" }); } 
                    else { db.run("COMMIT"); res.json({ message: '売上を正常に記録しました。' }); }
                });
            })
            .catch(error => {
                db.run("ROLLBACK");
                res.status(400).json({ error: error.message });
            });
    });
});
// API: 特定の売上履歴を削除する
app.delete('/api/sales/:id', (req, res) => {
    db.run(`DELETE FROM sales WHERE id = ?`, req.params.id, function(err) {
        if (err) { return res.status(400).json({ error: err.message }); }
        res.json({ message: '履歴を削除しました。', changes: this.changes });
    });
});
// API: 全ての売上履歴を削除する
app.delete('/api/sales', (req, res) => {
    db.run(`DELETE FROM sales`, function(err) {
        if (err) { return res.status(400).json({ error: err.message }); }
        res.json({ message: '全ての履歴を削除しました。' });
    });
});
// サーバーの起動
app.listen(PORT, () => {
    console.log(`サーバーが http://localhost:${PORT} で起動しました`);
});