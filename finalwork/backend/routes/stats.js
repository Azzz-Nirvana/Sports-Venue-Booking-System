const express = require('express');
const router = express.Router();
const { db } = require('../db/init');

// 按日期统计收入
router.get('/revenue/by-date', (req, res) => {
  const { start_date, end_date } = req.query;
  
  let query = `
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as count,
      SUM(total_amount) as total_revenue,
      SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as paid_revenue
    FROM usage_records
    WHERE 1=1
  `;
  const params = [];

  if (start_date) {
    query += ' AND DATE(created_at) >= ?';
    params.push(start_date);
  }
  if (end_date) {
    query += ' AND DATE(created_at) <= ?';
    params.push(end_date);
  }

  query += ' GROUP BY DATE(created_at) ORDER BY date DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 按场馆统计使用次数和收入
router.get('/venue/usage', (req, res) => {
  const query = `
    SELECT 
      v.id,
      v.name,
      v.type,
      COUNT(ur.id) as usage_count,
      SUM(ur.total_amount) as total_revenue,
      SUM(CASE WHEN ur.payment_status = 'paid' THEN ur.total_amount ELSE 0 END) as paid_revenue,
      AVG(ur.duration_hours) as avg_duration
    FROM venues v
    LEFT JOIN usage_records ur ON v.id = ur.venue_id
    GROUP BY v.id, v.name, v.type
    ORDER BY usage_count DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 总体统计
router.get('/overview', (req, res) => {
  const queries = {
    total_users: 'SELECT COUNT(*) as count FROM users',
    total_venues: 'SELECT COUNT(*) as count FROM venues',
    total_reservations: 'SELECT COUNT(*) as count FROM reservations',
    active_reservations: "SELECT COUNT(*) as count FROM reservations WHERE status IN ('pending', 'confirmed', 'in_use')",
    total_usage_records: 'SELECT COUNT(*) as count FROM usage_records',
    total_revenue: "SELECT COALESCE(SUM(total_amount), 0) as total FROM usage_records WHERE payment_status = 'paid'",
    unpaid_amount: "SELECT COALESCE(SUM(total_amount), 0) as total FROM usage_records WHERE payment_status = 'unpaid'"
  };

  const results = {};
  let completed = 0;
  const total = Object.keys(queries).length;

  Object.keys(queries).forEach((key, index) => {
    db.get(queries[key], [], (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      results[key] = row.count !== undefined ? row.count : row.total;
      completed++;
      
      if (completed === total) {
        res.json(results);
      }
    });
  });
});

module.exports = router;

