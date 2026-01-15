const express = require('express');
const router = express.Router();
const { db } = require('../db/init');

// 获取所有场馆
router.get('/', (req, res) => {
  const { type, status } = req.query;
  let query = 'SELECT * FROM venues WHERE 1=1';
  const params = [];

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 根据ID获取场馆
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM venues WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: '场馆不存在' });
    }
    res.json(row);
  });
});

// 获取场馆的子场地列表
router.get('/:id/sub-venues', (req, res) => {
  const { id } = req.params;
  db.all('SELECT * FROM sub_venues WHERE venue_id = ? AND status = ? ORDER BY name', [id, 'available'], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 获取子场地的可用时间段
router.get('/:id/sub-venues/:subId/available-times', (req, res) => {
  const { id, subId } = req.params;
  const { date } = req.query;
  
  if (!date) {
    return res.status(400).json({ error: '日期参数必填' });
  }

  // 开放时间段：8:00-12:00, 14:00-22:00
  const timeSlots = [];
  // 上午：8:00-12:00，每小时一个时间段
  for (let hour = 8; hour < 12; hour++) {
    timeSlots.push({
      start: `${hour.toString().padStart(2, '0')}:00`,
      end: `${(hour + 1).toString().padStart(2, '0')}:00`
    });
  }
  // 下午：14:00-22:00，每小时一个时间段
  for (let hour = 14; hour < 22; hour++) {
    timeSlots.push({
      start: `${hour.toString().padStart(2, '0')}:00`,
      end: `${(hour + 1).toString().padStart(2, '0')}:00`
    });
  }

  // 查询该日期已预约的时间段
  db.all(
    `SELECT start_time, end_time FROM reservations 
     WHERE sub_venue_id = ? AND reservation_date = ? 
     AND status IN ('pending', 'confirmed', 'in_use')`,
    [subId, date],
    (err, bookedSlots) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // 过滤出可用时间段
      const availableSlots = timeSlots.filter(slot => {
        return !bookedSlots.some(booked => {
          // 检查时间段是否冲突
          return (slot.start < booked.end_time && slot.end > booked.start_time);
        });
      });

      res.json({
        date,
        availableSlots,
        allSlots: timeSlots
      });
    }
  );
});

// 获取游泳馆剩余容量
router.get('/:id/remaining-capacity', (req, res) => {
  const { id } = req.params;
  const { date, time } = req.query;

  // 查询该场馆的所有子场地
  db.all('SELECT id, name, capacity FROM sub_venues WHERE venue_id = ?', [id], (err, subVenues) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (subVenues.length === 0) {
      return res.json({ totalCapacity: 0, remainingCapacity: 0, subVenues: [] });
    }

    // 查询该时间段已预约的人数
    const query = date && time 
      ? `SELECT sub_venue_id, SUM(capacity) as booked_capacity 
         FROM reservations r
         JOIN sub_venues sv ON r.sub_venue_id = sv.id
         WHERE r.venue_id = ? AND r.reservation_date = ? 
         AND r.start_time <= ? AND r.end_time > ?
         AND r.status IN ('pending', 'confirmed', 'in_use')
         GROUP BY sub_venue_id`
      : `SELECT sub_venue_id, SUM(sv.capacity) as booked_capacity 
         FROM reservations r
         JOIN sub_venues sv ON r.sub_venue_id = sv.id
         WHERE r.venue_id = ? AND r.reservation_date = ?
         AND r.status IN ('pending', 'confirmed', 'in_use')
         GROUP BY sub_venue_id`;

    const params = date && time 
      ? [id, date, time, time]
      : [id, date];

    db.all(query, params, (err, bookedData) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const bookedMap = {};
      bookedData.forEach(item => {
        bookedMap[item.sub_venue_id] = item.booked_capacity || 0;
      });

      let totalCapacity = 0;
      let remainingCapacity = 0;
      const subVenueInfo = subVenues.map(sv => {
        const booked = bookedMap[sv.id] || 0;
        const remaining = sv.capacity - booked;
        totalCapacity += sv.capacity;
        remainingCapacity += remaining;
        return {
          ...sv,
          booked,
          remaining
        };
      });

      res.json({
        totalCapacity,
        remainingCapacity,
        subVenues: subVenueInfo
      });
    });
  });
});

// 创建场馆
router.post('/', (req, res) => {
  const { name, type, price_per_hour, status, description } = req.body;
  
  if (!name || !type || !price_per_hour) {
    return res.status(400).json({ error: '场馆名称、类型和价格为必填项' });
  }

  db.run(
    'INSERT INTO venues (name, type, price_per_hour, status, description) VALUES (?, ?, ?, ?, ?)',
    [name, type, price_per_hour, status || 'available', description || ''],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, name, type, price_per_hour, status, description });
    }
  );
});

// 更新场馆
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, type, price_per_hour, status, description } = req.body;

  db.run(
    'UPDATE venues SET name = ?, type = ?, price_per_hour = ?, status = ?, description = ? WHERE id = ?',
    [name, type, price_per_hour, status, description, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: '场馆不存在' });
      }
      res.json({ message: '更新成功', changes: this.changes });
    }
  );
});

// 删除场馆
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM venues WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: '场馆不存在' });
    }
    res.json({ message: '删除成功', changes: this.changes });
  });
});

module.exports = router;

