const express = require('express');
const router = express.Router();
const { db } = require('../db/init');
const { createNotification } = require('./notifications');

// 获取所有预约
router.get('/', (req, res) => {
  const { user_id, venue_id, status, date } = req.query;
  let query = `
    SELECT 
      r.*,
      u.name as user_name,
      u.phone as user_phone,
      v.name as venue_name,
      v.type as venue_type,
      v.price_per_hour,
      sv.name as sub_venue_name
    FROM reservations r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN venues v ON r.venue_id = v.id
    LEFT JOIN sub_venues sv ON r.sub_venue_id = sv.id
    WHERE 1=1
  `;
  const params = [];

  if (user_id) {
    query += ' AND r.user_id = ?';
    params.push(user_id);
  }
  if (venue_id) {
    query += ' AND r.venue_id = ?';
    params.push(venue_id);
  }
  if (status) {
    query += ' AND r.status = ?';
    params.push(status);
  }
  if (date) {
    query += ' AND r.reservation_date = ?';
    params.push(date);
  }

  query += ' ORDER BY r.reservation_date DESC, r.start_time DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 根据ID获取预约
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT 
      r.*,
      u.name as user_name,
      u.phone as user_phone,
      v.name as venue_name,
      v.type as venue_type,
      v.price_per_hour,
      sv.name as sub_venue_name
    FROM reservations r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN venues v ON r.venue_id = v.id
    LEFT JOIN sub_venues sv ON r.sub_venue_id = sv.id
    WHERE r.id = ?
  `;
  
  db.get(query, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: '预约不存在' });
    }
    res.json(row);
  });
});

// 检查时间段是否在开放时间内（8:00-12:00, 14:00-22:00）
function isTimeInOpenHours(startTime, endTime) {
  const start = parseInt(startTime.split(':')[0]);
  const end = parseInt(endTime.split(':')[0]);
  
  // 检查是否在上午时段（8:00-12:00）
  const inMorning = start >= 8 && end <= 12;
  // 检查是否在下午时段（14:00-22:00）
  const inAfternoon = start >= 14 && end <= 22;
  
  return inMorning || inAfternoon;
}

// 创建预约
router.post('/', (req, res) => {
  const { user_id, venue_id, sub_venue_id, reservation_date, start_time, end_time } = req.body;
  
  if (!user_id || !venue_id || !sub_venue_id || !reservation_date || !start_time || !end_time) {
    return res.status(400).json({ error: '所有字段为必填项' });
  }

  // 检查时间段是否在开放时间内
  if (!isTimeInOpenHours(start_time, end_time)) {
    return res.status(400).json({ error: '预约时间必须在开放时间内（8:00-12:00 或 14:00-22:00）' });
  }

  // 检查时间冲突（针对子场地）
  const checkConflictQuery = `
    SELECT COUNT(*) as count FROM reservations 
    WHERE sub_venue_id = ? 
    AND reservation_date = ? 
    AND status IN ('pending', 'confirmed', 'in_use')
    AND (
      (start_time < ? AND end_time > ?) OR
      (start_time < ? AND end_time > ?) OR
      (start_time >= ? AND end_time <= ?)
    )
  `;

  db.get(checkConflictQuery, [sub_venue_id, reservation_date, start_time, start_time, end_time, end_time, start_time, end_time], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (row.count > 0) {
      return res.status(400).json({ error: '该时间段已被预约' });
    }

    // 创建预约
    db.run(
      'INSERT INTO reservations (user_id, venue_id, sub_venue_id, reservation_date, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user_id, venue_id, sub_venue_id, reservation_date, start_time, end_time, 'pending'],
      async function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        // 获取场馆名称用于通知
        db.get('SELECT name FROM venues WHERE id = ?', [venue_id], async (err, venue) => {
          if (!err && venue) {
            // 创建通知
            try {
              await createNotification(
                user_id,
                'system',
                '预约已提交',
                `您的预约已提交，场馆：${venue.name}，日期：${reservation_date}，时间：${start_time}-${end_time}，等待确认`,
                this.lastID,
                'reservation'
              );
            } catch (notifErr) {
              console.error('创建通知失败:', notifErr);
            }
          }
        });
        
        res.json({ id: this.lastID, message: '预约创建成功' });
      }
    );
  });
});

// 更新预约信息（修改预约）
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { venue_id, sub_venue_id, reservation_date, start_time, end_time } = req.body;

  // 先获取原预约信息
  db.get('SELECT * FROM reservations WHERE id = ?', [id], (err, reservation) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!reservation) {
      return res.status(404).json({ error: '预约不存在' });
    }

    // 检查预约状态，只有pending和confirmed状态的预约可以修改
    if (!['pending', 'confirmed'].includes(reservation.status)) {
      return res.status(400).json({ error: '只有待确认或已确认的预约可以修改' });
    }

    // 使用新值或保留原值
    const newVenueId = venue_id || reservation.venue_id;
    const newSubVenueId = sub_venue_id || reservation.sub_venue_id;
    const newDate = reservation_date || reservation.reservation_date;
    const newStartTime = start_time || reservation.start_time;
    const newEndTime = end_time || reservation.end_time;

    // 检查时间段是否在开放时间内
    if (!isTimeInOpenHours(newStartTime, newEndTime)) {
      return res.status(400).json({ error: '预约时间必须在开放时间内（8:00-12:00 或 14:00-22:00）' });
    }

    // 检查时间冲突（排除当前预约本身）
    const checkConflictQuery = `
      SELECT COUNT(*) as count FROM reservations 
      WHERE sub_venue_id = ? 
      AND reservation_date = ? 
      AND id != ?
      AND status IN ('pending', 'confirmed', 'in_use')
      AND (
        (start_time < ? AND end_time > ?) OR
        (start_time < ? AND end_time > ?) OR
        (start_time >= ? AND end_time <= ?)
      )
    `;

    db.get(checkConflictQuery, [
      newSubVenueId, 
      newDate, 
      id,
      newStartTime, 
      newStartTime, 
      newEndTime, 
      newEndTime, 
      newStartTime, 
      newEndTime
    ], (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (row.count > 0) {
        return res.status(400).json({ error: '该时间段已被预约' });
      }

      // 更新预约信息，如果修改了时间或场馆，状态重置为pending需要重新确认
      const newStatus = (newDate !== reservation.reservation_date || 
                        newStartTime !== reservation.start_time || 
                        newEndTime !== reservation.end_time ||
                        newSubVenueId !== reservation.sub_venue_id) 
                        ? 'pending' : reservation.status;

      db.run(
        'UPDATE reservations SET venue_id = ?, sub_venue_id = ?, reservation_date = ?, start_time = ?, end_time = ?, status = ? WHERE id = ?',
        [newVenueId, newSubVenueId, newDate, newStartTime, newEndTime, newStatus, id],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          if (this.changes === 0) {
            return res.status(404).json({ error: '预约不存在' });
          }
          
          // 获取更新后的预约信息
          db.get(
            `SELECT 
              r.*,
              u.name as user_name,
              u.phone as user_phone,
              v.name as venue_name,
              v.type as venue_type,
              v.price_per_hour,
              sv.name as sub_venue_name
            FROM reservations r
            LEFT JOIN users u ON r.user_id = u.id
            LEFT JOIN venues v ON r.venue_id = v.id
            LEFT JOIN sub_venues sv ON r.sub_venue_id = sv.id
            WHERE r.id = ?`,
            [id],
            async (err, updatedReservation) => {
              if (err) {
                return res.status(500).json({ error: err.message });
              }
              
              // 如果状态变为pending，创建修改通知
              if (newStatus === 'pending' && updatedReservation) {
                try {
                  await createNotification(
                    reservation.user_id,
                    'reservation_modified',
                    '预约已修改',
                    `您的预约已修改，场馆：${updatedReservation.venue_name}，日期：${newDate}，时间：${newStartTime}-${newEndTime}，需要重新确认`,
                    id,
                    'reservation'
                  );
                } catch (notifErr) {
                  console.error('创建通知失败:', notifErr);
                }
              }
              
              res.json({ 
                message: newStatus === 'pending' ? '预约已修改，需要重新确认' : '预约修改成功',
                reservation: updatedReservation
              });
            }
          );
        }
      );
    });
  });
});

// 更新预约状态
router.put('/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: '状态为必填项' });
  }

  db.run(
    'UPDATE reservations SET status = ? WHERE id = ?',
    [status, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: '预约不存在' });
      }
      res.json({ message: '状态更新成功', changes: this.changes });
    }
  );
});

// 取消预约
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  // 先获取预约信息
  db.get('SELECT * FROM reservations WHERE id = ?', [id], (err, reservation) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!reservation) {
      return res.status(404).json({ error: '预约不存在' });
    }
    
    db.run('UPDATE reservations SET status = ? WHERE id = ?', ['cancelled', id], async function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: '预约不存在' });
      }
      
      // 创建取消通知
      db.get(
        `SELECT v.name as venue_name FROM reservations r 
         JOIN venues v ON r.venue_id = v.id 
         WHERE r.id = ?`,
        [id],
        async (err, row) => {
          if (!err && row) {
            try {
              await createNotification(
                reservation.user_id,
                'reservation_cancelled',
                '预约已取消',
                `您的预约已取消，场馆：${row.venue_name}，日期：${reservation.reservation_date}，时间：${reservation.start_time}-${reservation.end_time}`,
                id,
                'reservation'
              );
            } catch (notifErr) {
              console.error('创建通知失败:', notifErr);
            }
          }
        }
      );
      
      res.json({ message: '预约已取消', changes: this.changes });
    });
  });
});

module.exports = router;

