const express = require('express');
const router = express.Router();
const { db } = require('../db/init');

// 获取所有用户（仅管理员）
router.get('/', (req, res) => {
  db.all('SELECT id, name, phone, role, created_at FROM users ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 根据ID获取用户
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT id, name, phone, role, created_at FROM users WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json(row);
  });
});

// 用户注册
router.post('/register', (req, res) => {
  const { name, phone, password } = req.body;
  
  if (!name || !phone || !password) {
    return res.status(400).json({ error: '姓名、电话和密码为必填项' });
  }

  db.run(
    'INSERT INTO users (name, phone, password, role) VALUES (?, ?, ?, ?)',
    [name, phone, password, 'user'],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint')) {
          return res.status(400).json({ error: '该电话号码已注册' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, name, phone, role: 'user', message: '注册成功' });
    }
  );
});

// 用户登录
router.post('/login', (req, res) => {
  const { phone, password } = req.body;
  
  if (!phone || !password) {
    return res.status(400).json({ error: '电话和密码为必填项' });
  }

  db.get('SELECT id, name, phone, role FROM users WHERE phone = ? AND password = ?', [phone, password], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(401).json({ error: '电话或密码错误' });
    }
    res.json({ ...row, message: '登录成功' });
  });
});

// 更新用户
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, role, password } = req.body;

  let query = 'UPDATE users SET ';
  const updates = [];
  const params = [];

  if (name) {
    updates.push('name = ?');
    params.push(name);
  }
  if (role) {
    updates.push('role = ?');
    params.push(role);
  }
  if (password) {
    updates.push('password = ?');
    params.push(password);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: '没有要更新的字段' });
  }

  params.push(id);
  query += updates.join(', ') + ' WHERE id = ?';

  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json({ message: '更新成功', changes: this.changes });
  });
});

// 修改密码
router.put('/:id/password', (req, res) => {
  const { id } = req.params;
  const { oldPassword, newPassword } = req.body;
  
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: '旧密码和新密码为必填项' });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ error: '新密码长度至少为6位' });
  }
  
  // 先验证旧密码
  db.get('SELECT password FROM users WHERE id = ?', [id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    if (user.password !== oldPassword) {
      return res.status(401).json({ error: '旧密码错误' });
    }
    
    // 更新密码
    db.run(
      'UPDATE users SET password = ? WHERE id = ?',
      [newPassword, id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: '用户不存在' });
        }
        res.json({ message: '密码修改成功' });
      }
    );
  });
});

// 删除用户
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json({ message: '删除成功', changes: this.changes });
  });
});

module.exports = router;

