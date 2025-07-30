const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./pos.db');

// --- APIエンドポイント ---

// 商品取得 (変更なし)
app.get('/api/products', (req, res) => {
    db.all("SELECT * FROM products ORDER BY id ASC", [], (err, rows) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        res.json(rows);
    });
});

// 【変更】商品追加 (在庫数も受け取る)
app.post('/api/products', (req, res) => {
    const { name, price, inventory } = req.body;
    db.run(`INSERT INTO products (name, price, inventory) VALUES (?, ?, ?)`, [name, price, inventory], function(err) {
        if (err) { return res.status(400).json({ error: err.message }); }
        res.json({ id: this.lastID });
    });
});

// 【新規】商品更新 (名前、価格、在庫)
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

// 商品削除 (変更なし)
app.delete('/api/products/:id', (req, res) => {
    db.run(`DELETE FROM products WHERE id = ?`, req.params.id, function(err) {
        if (err) { return res.status(400).json({ error: err.message }); }
        res.json({ changes: this.changes });
    });
});

// 売上履歴取得 (変更なし)
app.get('/api/sales', (req, res) => {
    db.all("SELECT * FROM sales ORDER BY id DESC", [], (err, rows) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        res.json(rows);
    });
});

// 【新規】API: 特定の売上履歴を削除する
app.delete('/api/sales/:id', (req, res) => {
    db.run(`DELETE FROM sales WHERE id = ?`, req.params.id, function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ message: '履歴を削除しました。', changes: this.changes });
    });
});

// 【新規】API: 全ての売上履歴を削除する
app.delete('/api/sales', (req, res) => {
    db.run(`DELETE FROM sales`, function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ message: '全ての履歴を削除しました。' });
    });
});

// 【変更】売上保存 (在庫を減らす処理を追加)
app.post('/api/sales', (req, res) => {
    const { totalPrice, details } = req.body;

    // トランザクション開始
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        // 1. 在庫を減らす
        const updatePromises = JSON.parse(details).map(item => {
            return new Promise((resolve, reject) => {
                db.run(`UPDATE products SET inventory = inventory - ? WHERE id = ? AND inventory >= ?`, 
                       [item.quantity, item.id, item.quantity], function(err) {
                    if (err || this.changes === 0) {
                        // 在庫が足りない、またはエラー
                        reject(new Error(`商品「${item.name}」の在庫が不足しています。`));
                    } else {
                        resolve();
                    }
                });
            });
        });

        // 2. 売上を記録する
        Promise.all(updatePromises)
            .then(() => {
                const saleTime = new Date().toISOString();
                const sql = `INSERT INTO sales (sale_time, total_price, details) VALUES (?, ?, ?)`;
                db.run(sql, [saleTime, totalPrice, details], function(err) {
                    if (err) {
                        db.run("ROLLBACK"); // エラーがあればロールバック
                        res.status(500).json({ error: "売上記録に失敗しました。" });
                    } else {
                        db.run("COMMIT"); // すべて成功したらコミット
                        res.json({ message: '売上を正常に記録しました。' });
                    }
                });
            })
            .catch(error => {
                db.run("ROLLBACK"); // 在庫更新でエラーがあればロールバック
                res.status(400).json({ error: error.message });
            });
    });
});

app.listen(PORT, () => {
    console.log(`サーバーが http://localhost:${PORT} で起動しました`);
});