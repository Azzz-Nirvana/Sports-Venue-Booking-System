const express = require('express');
const router = express.Router();
const { db } = require('../db/init');
const { createNotification } = require('./notifications');

// 获取用户账户信息（包含余额）
// 注意：这个路由必须在 /:user_id/recharge 和 /:user_id/transactions 之前定义
router.get('/user/:user_id', (req, res) => {
  const { user_id } = req.params;
  
  db.get(
    `SELECT ua.*, u.name as user_name, u.phone as user_phone 
     FROM user_accounts ua 
     LEFT JOIN users u ON ua.user_id = u.id 
     WHERE ua.user_id = ?`,
    [user_id],
    (err, row) => {
      if (err) {
        console.error('获取账户信息错误:', err);
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        // 如果账户不存在，创建一个
        db.run(
          'INSERT INTO user_accounts (user_id, balance) VALUES (?, ?)',
          [user_id, 0.00],
          function(err) {
            if (err) {
              console.error('创建账户错误:', err);
              return res.status(500).json({ error: err.message });
            }
            db.get(
              `SELECT ua.*, u.name as user_name, u.phone as user_phone 
               FROM user_accounts ua 
               LEFT JOIN users u ON ua.user_id = u.id 
               WHERE ua.id = ?`,
              [this.lastID],
              (err, newRow) => {
                if (err) {
                  console.error('获取新账户错误:', err);
                  return res.status(500).json({ error: err.message });
                }
                res.json(newRow);
              }
            );
          }
        );
        return;
      }
      res.json(row);
    }
  );
});

// 账户充值
router.post('/:user_id/recharge', (req, res) => {
  const { user_id } = req.params;
  const { amount, description } = req.body;
  
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: '充值金额必须大于0' });
  }

  // 开始事务
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // 获取当前账户信息
    db.get(
      'SELECT * FROM user_accounts WHERE user_id = ?',
      [user_id],
      (err, account) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }
        
        // 如果账户不存在，创建账户
        if (!account) {
          db.run(
            'INSERT INTO user_accounts (user_id, balance) VALUES (?, ?)',
            [user_id, 0.00],
            function(err) {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
              }
              account = { id: this.lastID, user_id, balance: 0.00 };
              processRecharge();
            }
          );
        } else {
          processRecharge();
        }
        
        function processRecharge() {
          const balanceBefore = parseFloat(account.balance || 0);
          const balanceAfter = balanceBefore + parseFloat(amount);
          const updatedAt = new Date().toISOString();
          
          // 更新账户余额
          db.run(
            'UPDATE user_accounts SET balance = ?, updated_at = ? WHERE id = ?',
            [balanceAfter, updatedAt, account.id],
            (err) => {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
              }
              
              // 记录交易
              db.run(
                `INSERT INTO account_transactions 
                 (user_id, account_id, transaction_type, amount, balance_before, balance_after, description) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [user_id, account.id, 'recharge', amount, balanceBefore, balanceAfter, description || '账户充值'],
                function(err) {
                  if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                  }
                  
                  db.run('COMMIT', async (err) => {
                    if (err) {
                      db.run('ROLLBACK');
                      return res.status(500).json({ error: err.message });
                    }
                    
                    // 创建充值成功通知
                    try {
                      await createNotification(
                        user_id,
                        'recharge_success',
                        '充值成功',
                        `您的账户已成功充值 ¥${parseFloat(amount).toFixed(2)}，当前余额：¥${balanceAfter.toFixed(2)}`,
                        this.lastID,
                        'transaction'
                      );
                    } catch (notifErr) {
                      console.error('创建通知失败:', notifErr);
                    }
                    
                    res.json({
                      message: '充值成功',
                      balance: balanceAfter,
                      transaction_id: this.lastID
                    });
                  });
                }
              );
            }
          );
        }
      }
    );
  });
});

// 获取交易记录
router.get('/:user_id/transactions', (req, res) => {
  const { user_id } = req.params;
  const { type, limit = 100 } = req.query;
  
  let query = `
    SELECT 
      at.*,
      ur.venue_name,
      ur.total_amount as usage_amount
    FROM account_transactions at
    LEFT JOIN usage_records ur ON at.related_usage_record_id = ur.id
    WHERE at.user_id = ?
  `;
  const params = [user_id];
  
  if (type) {
    query += ' AND at.transaction_type = ?';
    params.push(type);
  }
  
  query += ' ORDER BY at.created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 从账户余额支付
router.post('/:user_id/pay', (req, res) => {
  const { user_id } = req.params;
  const { usage_record_id, amount } = req.body;
  
  if (!usage_record_id || !amount || amount <= 0) {
    return res.status(400).json({ error: '使用记录ID和金额为必填项' });
  }

  // 开始事务
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // 获取账户信息
    db.get(
      'SELECT * FROM user_accounts WHERE user_id = ?',
      [user_id],
      (err, account) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }
        
        if (!account) {
          db.run('ROLLBACK');
          return res.status(404).json({ error: '账户不存在' });
        }
        
        const balanceBefore = parseFloat(account.balance || 0);
        const paymentAmount = parseFloat(amount);
        
        if (balanceBefore < paymentAmount) {
          db.run('ROLLBACK');
          return res.status(400).json({ error: '账户余额不足' });
        }
        
        const balanceAfter = balanceBefore - paymentAmount;
        const updatedAt = new Date().toISOString();
        const paymentTime = new Date().toISOString();
        
        // 更新账户余额
        db.run(
          'UPDATE user_accounts SET balance = ?, updated_at = ? WHERE id = ?',
          [balanceAfter, updatedAt, account.id],
          (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: err.message });
            }
            
            // 更新使用记录支付状态
            db.run(
              'UPDATE usage_records SET payment_status = ?, payment_time = ? WHERE id = ?',
              ['paid', paymentTime, usage_record_id],
              (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: err.message });
                }
                
                // 记录交易
                db.run(
                  `INSERT INTO account_transactions 
                   (user_id, account_id, transaction_type, amount, balance_before, balance_after, description, related_usage_record_id) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                  [user_id, account.id, 'payment', paymentAmount, balanceBefore, balanceAfter, '场馆使用费用', usage_record_id],
                  function(err) {
                    if (err) {
                      db.run('ROLLBACK');
                      return res.status(500).json({ error: err.message });
                    }
                    
                    db.run('COMMIT', (err) => {
                      if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: err.message });
                      }
                      
                      res.json({
                        message: '支付成功',
                        balance: balanceAfter,
                        transaction_id: this.lastID
                      });
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  });
});

module.exports = router;
