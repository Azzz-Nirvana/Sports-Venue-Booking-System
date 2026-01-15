const express = require('express');
const router = express.Router();
const { db } = require('../db/init');

// 获取所有使用记录
router.get('/', (req, res) => {
  const { user_id, venue_id, payment_status, date } = req.query;
  let query = `
    SELECT 
      ur.*,
      u.name as user_name,
      u.phone as user_phone,
      v.name as venue_name,
      v.type as venue_type,
      r.reservation_date,
      r.start_time as reserved_start_time,
      r.end_time as reserved_end_time
    FROM usage_records ur
    LEFT JOIN users u ON ur.user_id = u.id
    LEFT JOIN venues v ON ur.venue_id = v.id
    LEFT JOIN reservations r ON ur.reservation_id = r.id
    WHERE 1=1
  `;
  const params = [];

  if (user_id) {
    query += ' AND ur.user_id = ?';
    params.push(user_id);
  }
  if (venue_id) {
    query += ' AND ur.venue_id = ?';
    params.push(venue_id);
  }
  if (payment_status) {
    query += ' AND ur.payment_status = ?';
    params.push(payment_status);
  }
  if (date) {
    query += ' AND DATE(ur.created_at) = ?';
    params.push(date);
  }

  query += ' ORDER BY ur.created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 根据ID获取使用记录
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT 
      ur.*,
      u.name as user_name,
      u.phone as user_phone,
      v.name as venue_name,
      v.type as venue_type,
      r.reservation_date,
      r.start_time as reserved_start_time,
      r.end_time as reserved_end_time
    FROM usage_records ur
    LEFT JOIN users u ON ur.user_id = u.id
    LEFT JOIN venues v ON ur.venue_id = v.id
    LEFT JOIN reservations r ON ur.reservation_id = r.id
    WHERE ur.id = ?
  `;
  
  db.get(query, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: '使用记录不存在' });
    }
    res.json(row);
  });
});

// 创建使用记录（到场登记并开始使用）
router.post('/', (req, res) => {
  const { reservation_id } = req.body;
  
  if (!reservation_id) {
    return res.status(400).json({ error: '预约ID为必填项' });
  }

  // 获取预约信息
  db.get(
    `SELECT r.*, v.price_per_hour 
     FROM reservations r 
     LEFT JOIN venues v ON r.venue_id = v.id 
     WHERE r.id = ?`,
    [reservation_id],
    (err, reservation) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!reservation) {
        return res.status(404).json({ error: '预约不存在' });
      }
      if (reservation.status !== 'confirmed') {
        return res.status(400).json({ error: '只能对已确认的预约进行到场登记' });
      }

      // 更新预约状态为使用中
      db.run(
        'UPDATE reservations SET status = ? WHERE id = ?',
        ['in_use', reservation_id],
        (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // 创建使用记录（初始状态，未完成）
          const actual_start_time = new Date().toISOString();
          db.run(
            `INSERT INTO usage_records 
             (reservation_id, user_id, venue_id, actual_start_time, duration_hours, total_amount, payment_status) 
             VALUES (?, ?, ?, ?, 0, 0, 'unpaid')`,
            [reservation_id, reservation.user_id, reservation.venue_id, actual_start_time],
            function(err) {
              if (err) {
                return res.status(500).json({ error: err.message });
              }
              res.json({ id: this.lastID, message: '到场登记成功，使用已开始' });
            }
          );
        }
      );
    }
  );
});

// 完成使用并结算
router.put('/:id/complete', (req, res) => {
  const { id } = req.params;
  const { duration_hours } = req.body;

  if (!duration_hours || duration_hours <= 0) {
    return res.status(400).json({ error: '使用时长必须大于0' });
  }

  // 获取使用记录和场馆价格
  db.get(
    `SELECT ur.*, v.price_per_hour 
     FROM usage_records ur 
     LEFT JOIN venues v ON ur.venue_id = v.id 
     WHERE ur.id = ?`,
    [id],
    (err, record) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!record) {
        return res.status(404).json({ error: '使用记录不存在' });
      }

      // 计算费用
      const total_amount = (parseFloat(duration_hours) * parseFloat(record.price_per_hour)).toFixed(2);
      const actual_end_time = new Date().toISOString();

      // 更新使用记录
      db.run(
        `UPDATE usage_records 
         SET actual_end_time = ?, duration_hours = ?, total_amount = ? 
         WHERE id = ?`,
        [actual_end_time, duration_hours, total_amount, id],
        (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // 更新预约状态为已完成
          db.run(
            'UPDATE reservations SET status = ? WHERE id = ?',
            ['completed', record.reservation_id],
            (err) => {
              if (err) {
                return res.status(500).json({ error: err.message });
              }
              res.json({ 
                message: '使用完成，费用已计算',
                duration_hours,
                total_amount: parseFloat(total_amount)
              });
            }
          );
        }
      );
    }
  );
});

// 支付结算
router.put('/:id/pay', (req, res) => {
  const { id } = req.params;
  const payment_time = new Date().toISOString();

  db.run(
    'UPDATE usage_records SET payment_status = ?, payment_time = ? WHERE id = ?',
    ['paid', payment_time, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: '使用记录不存在' });
      }
      res.json({ message: '支付成功', payment_time });
    }
  );
});

// 获取当前正在使用的场地
router.get('/current/in-use', (req, res) => {
  const query = `
    SELECT 
      ur.*,
      u.name as user_name,
      u.phone as user_phone,
      v.name as venue_name,
      v.type as venue_type,
      r.reservation_date,
      r.start_time as reserved_start_time,
      r.end_time as reserved_end_time
    FROM usage_records ur
    LEFT JOIN users u ON ur.user_id = u.id
    LEFT JOIN venues v ON ur.venue_id = v.id
    LEFT JOIN reservations r ON ur.reservation_id = r.id
    WHERE ur.actual_end_time IS NULL
    ORDER BY ur.actual_start_time DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

module.exports = router;

