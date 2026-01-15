const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { db, initDatabase } = require('./db/init');

const app = express();
const PORT = 5000;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 初始化数据库
initDatabase()
  .then(() => {
    console.log('✅ 数据库初始化完成，服务器启动中...');
    
    // 启动预约提醒服务
    require('./utils/reminder');
    console.log('✅ 预约提醒服务已启动');
    
    // 路由
    app.use('/api/users', require('./routes/users'));
    app.use('/api/venues', require('./routes/venues'));
    app.use('/api/sub-venues', require('./routes/sub-venues'));
    app.use('/api/reservations', require('./routes/reservations'));
    app.use('/api/usage', require('./routes/usage'));
    app.use('/api/stats', require('./routes/stats'));
    app.use('/api/accounts', require('./routes/accounts'));
    app.use('/api/notifications', require('./routes/notifications'));
    app.use('/api/reviews', require('./routes/reviews'));

    // 健康检查
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', message: '服务器运行正常' });
    });

    // 启动服务器
    app.listen(PORT, () => {
      console.log(`🚀 后端服务器运行在 http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ 数据库初始化失败:', err);
    process.exit(1);
  });

// 优雅关闭
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('关闭数据库连接失败:', err);
    } else {
      console.log('✅ 数据库连接已关闭');
    }
    process.exit(0);
  });
});

