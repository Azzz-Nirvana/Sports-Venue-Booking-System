const express = require('express');
const router = express.Router();
const { db } = require('../db/init');

// 获取所有评价（支持筛选）
router.get('/', (req, res) => {
  const { venue_id, user_id, reservation_id, limit = 100 } = req.query;
  
  let query = `
    SELECT 
      r.*,
      u.name as user_name,
      u.phone as user_phone,
      v.name as venue_name,
      v.type as venue_type,
      res.reservation_date,
      res.start_time,
      res.end_time
    FROM reviews r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN venues v ON r.venue_id = v.id
    LEFT JOIN reservations res ON r.reservation_id = res.id
    WHERE 1=1
  `;
  const params = [];
  
  if (venue_id) {
    query += ' AND r.venue_id = ?';
    params.push(venue_id);
  }
  if (user_id) {
    query += ' AND r.user_id = ?';
    params.push(user_id);
  }
  if (reservation_id) {
    query += ' AND r.reservation_id = ?';
    params.push(reservation_id);
  }
  
  query += ' ORDER BY r.created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 获取场馆的平均评分和评价数量
router.get('/venue/:venue_id/stats', (req, res) => {
  const { venue_id } = req.params;
  
  db.get(
    `SELECT 
      COUNT(*) as total_reviews,
      AVG(rating) as average_rating,
      COUNT(CASE WHEN rating = 5 THEN 1 END) as rating_5,
      COUNT(CASE WHEN rating = 4 THEN 1 END) as rating_4,
      COUNT(CASE WHEN rating = 3 THEN 1 END) as rating_3,
      COUNT(CASE WHEN rating = 2 THEN 1 END) as rating_2,
      COUNT(CASE WHEN rating = 1 THEN 1 END) as rating_1
    FROM reviews 
    WHERE venue_id = ?`,
    [venue_id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({
        totalReviews: row.total_reviews || 0,
        averageRating: row.average_rating ? parseFloat(row.average_rating).toFixed(1) : 0,
        ratingDistribution: {
          5: row.rating_5 || 0,
          4: row.rating_4 || 0,
          3: row.rating_3 || 0,
          2: row.rating_2 || 0,
          1: row.rating_1 || 0
        }
      });
    }
  );
});

// 根据ID获取评价
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      r.*,
      u.name as user_name,
      u.phone as user_phone,
      v.name as venue_name,
      v.type as venue_type,
      res.reservation_date,
      res.start_time,
      res.end_time
    FROM reviews r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN venues v ON r.venue_id = v.id
    LEFT JOIN reservations res ON r.reservation_id = res.id
    WHERE r.id = ?
  `;
  
  db.get(query, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: '评价不存在' });
    }
    res.json(row);
  });
});

// 创建评价
router.post('/', (req, res) => {
  const { user_id, venue_id, reservation_id, rating, comment } = req.body;
  
  if (!user_id || !venue_id || !rating) {
    return res.status(400).json({ error: 'user_id, venue_id, rating 为必填项' });
  }
  
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: '评分必须在1-5之间' });
  }
  
  // 检查是否已经评价过该预约（如果提供了reservation_id）
  if (reservation_id) {
    db.get(
      'SELECT id FROM reviews WHERE user_id = ? AND reservation_id = ?',
      [user_id, reservation_id],
      (err, existingReview) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (existingReview) {
          return res.status(400).json({ error: '您已经评价过该预约' });
        }
        createReview();
      }
    );
  } else {
    createReview();
  }
  
  function createReview() {
    db.run(
      'INSERT INTO reviews (user_id, venue_id, reservation_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
      [user_id, venue_id, reservation_id || null, rating, comment || null],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        // 获取创建的评价信息
        db.get(
          `SELECT 
            r.*,
            u.name as user_name,
            v.name as venue_name
          FROM reviews r
          LEFT JOIN users u ON r.user_id = u.id
          LEFT JOIN venues v ON r.venue_id = v.id
          WHERE r.id = ?`,
          [this.lastID],
          (err, newReview) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, message: '评价提交成功', review: newReview });
          }
        );
      }
    );
  }
});

// 更新评价
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;
  
  if (!rating && !comment) {
    return res.status(400).json({ error: '至少需要提供 rating 或 comment' });
  }
  
  if (rating && (rating < 1 || rating > 5)) {
    return res.status(400).json({ error: '评分必须在1-5之间' });
  }
  
  let updates = [];
  const params = [];
  
  if (rating) {
    updates.push('rating = ?');
    params.push(rating);
  }
  if (comment !== undefined) {
    updates.push('comment = ?');
    params.push(comment);
  }
  
  params.push(id);
  
  db.run(
    `UPDATE reviews SET ${updates.join(', ')} WHERE id = ?`,
    params,
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: '评价不存在' });
      }
      res.json({ message: '评价更新成功', changes: this.changes });
    }
  );
});

// 删除评价
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM reviews WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: '评价不存在' });
    }
    res.json({ message: '评价已删除' });
  });
});

module.exports = router;
