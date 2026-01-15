const express = require('express');
const router = express.Router();
const { db } = require('../db/init');

// 获取所有子场地
router.get('/', (req, res) => {
  const { venue_id, status } = req.query;
  let query = 'SELECT * FROM sub_venues WHERE 1=1';
  const params = [];

  if (venue_id) {
    query += ' AND venue_id = ?';
    params.push(venue_id);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY name';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 创建子场地
router.post('/', (req, res) => {
  const { venue_id, name, capacity, status } = req.body;
  
  if (!venue_id || !name || !capacity) {
    return res.status(400).json({ error: '场馆ID、名称和容量为必填项' });
  }

  db.run(
    'INSERT INTO sub_venues (venue_id, name, capacity, status) VALUES (?, ?, ?, ?)',
    [venue_id, name, capacity, status || 'available'],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, venue_id, name, capacity, status });
    }
  );
});

// 更新子场地
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, capacity, status } = req.body;

  db.run(
    'UPDATE sub_venues SET name = ?, capacity = ?, status = ? WHERE id = ?',
    [name, capacity, status, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: '子场地不存在' });
      }
      res.json({ message: '更新成功', changes: this.changes });
    }
  );
});

// 删除子场地
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM sub_venues WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: '子场地不存在' });
    }
    res.json({ message: '删除成功', changes: this.changes });
  });
});

module.exports = router;

