const express = require('express');
const router = express.Router();
const { db } = require('../db/init');

// 获取用户的所有通知
router.get('/user/:user_id', (req, res) => {
  const { user_id } = req.params;
  const { is_read, limit = 100 } = req.query;
  
  let query = `
    SELECT * FROM notifications 
    WHERE user_id = ?
  `;
  const params = [user_id];
  
  if (is_read !== undefined) {
    query += ' AND is_read = ?';
    params.push(parseInt(is_read));
  }
  
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 获取未读通知数量
router.get('/user/:user_id/unread-count', (req, res) => {
  const { user_id } = req.params;
  
  db.get(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
    [user_id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ unreadCount: row.count });
    }
  );
});

// 标记通知为已读
router.put('/:id/read', (req, res) => {
  const { id } = req.params;
  
  db.run(
    'UPDATE notifications SET is_read = 1 WHERE id = ?',
    [id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: '通知不存在' });
      }
      res.json({ message: '已标记为已读' });
    }
  );
});

// 标记所有通知为已读
router.put('/user/:user_id/read-all', (req, res) => {
  const { user_id } = req.params;
  
  db.run(
    'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
    [user_id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: '已全部标记为已读', changes: this.changes });
    }
  );
});

// 删除通知
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM notifications WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: '通知不存在' });
    }
    res.json({ message: '通知已删除' });
  });
});

// 创建通知（内部使用，也可以作为API）
router.post('/', (req, res) => {
  const { user_id, type, title, content, related_id, related_type } = req.body;
  
  if (!user_id || !type || !title) {
    return res.status(400).json({ error: 'user_id, type, title 为必填项' });
  }
  
  db.run(
    'INSERT INTO notifications (user_id, type, title, content, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?)',
    [user_id, type, title, content || null, related_id || null, related_type || null],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, message: '通知创建成功' });
    }
  );
});

module.exports = router;

// 辅助函数：创建通知（供其他模块使用）
function createNotification(userId, type, title, content, relatedId = null, relatedType = null) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO notifications (user_id, type, title, content, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, type, title, content || null, relatedId, relatedType || null],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
}

module.exports.createNotification = createNotification;
