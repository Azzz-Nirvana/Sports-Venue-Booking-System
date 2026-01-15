const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'sports_venue.db');

// 确保数据库目录存在
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 数据库文件如果已存在则直接使用，不删除（保留数据）
// 如果需要重新初始化，请手动删除数据库文件

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
    process.exit(1);
  }
  console.log('✅ 已连接到 SQLite 数据库');
});

// 启用外键约束
db.run('PRAGMA foreign_keys = ON');

// 创建表结构
function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 1. 用户表
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          phone TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('创建用户表失败:', err);
          reject(err);
          return;
        }
        console.log('✅ 用户表创建成功');
      });

      // 2. 场馆表（场馆类型）
      db.run(`
        CREATE TABLE IF NOT EXISTS venues (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('篮球场', '足球场', '羽毛球场', '网球场', '乒乓球场', '游泳馆')),
          price_per_hour DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'maintenance', 'closed')),
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('创建场馆表失败:', err);
          reject(err);
          return;
        }
        console.log('✅ 场馆表创建成功');
      });

      // 2.5. 子场地表（具体场地，如1号台、2号台等）
      db.run(`
        CREATE TABLE IF NOT EXISTS sub_venues (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          venue_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          capacity INTEGER NOT NULL DEFAULT 1,
          status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'maintenance', 'closed')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('创建子场地表失败:', err);
          reject(err);
          return;
        }
        console.log('✅ 子场地表创建成功');
      });

      // 3. 预约表
      db.run(`
        CREATE TABLE IF NOT EXISTS reservations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          venue_id INTEGER NOT NULL,
          sub_venue_id INTEGER NOT NULL,
          reservation_date DATE NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'in_use', 'completed', 'cancelled')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE,
          FOREIGN KEY (sub_venue_id) REFERENCES sub_venues(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('创建预约表失败:', err);
          reject(err);
          return;
        }
        console.log('✅ 预约表创建成功');
      });

      // 4. 使用记录表（结算记录）
      db.run(`
        CREATE TABLE IF NOT EXISTS usage_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          reservation_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          venue_id INTEGER NOT NULL,
          actual_start_time DATETIME,
          actual_end_time DATETIME,
          duration_hours DECIMAL(5, 2) NOT NULL,
          total_amount DECIMAL(10, 2) NOT NULL,
          payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid', 'paid')),
          payment_time DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('创建使用记录表失败:', err);
          reject(err);
          return;
        }
        console.log('✅ 使用记录表创建成功');
      });

      // 5. 用户账户表（存储用户余额）
      db.run(`
        CREATE TABLE IF NOT EXISTS user_accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL UNIQUE,
          balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('创建用户账户表失败:', err);
          reject(err);
          return;
        }
        console.log('✅ 用户账户表创建成功');
      });

      // 6. 账户交易记录表（记录充值和消费）
      db.run(`
        CREATE TABLE IF NOT EXISTS account_transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          account_id INTEGER NOT NULL,
          transaction_type TEXT NOT NULL CHECK(transaction_type IN ('recharge', 'payment', 'refund')),
          amount DECIMAL(10, 2) NOT NULL,
          balance_before DECIMAL(10, 2) NOT NULL,
          balance_after DECIMAL(10, 2) NOT NULL,
          description TEXT,
          related_usage_record_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (account_id) REFERENCES user_accounts(id) ON DELETE CASCADE,
          FOREIGN KEY (related_usage_record_id) REFERENCES usage_records(id) ON DELETE SET NULL
        )
      `, (err) => {
        if (err) {
          console.error('创建账户交易记录表失败:', err);
          reject(err);
          return;
        }
        console.log('✅ 账户交易记录表创建成功');
      });

      // 7. 通知表（站内消息）
      db.run(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('reservation_confirmed', 'reservation_cancelled', 'reservation_modified', 'reservation_reminder', 'payment_success', 'recharge_success', 'system')),
          title TEXT NOT NULL,
          content TEXT,
          is_read INTEGER NOT NULL DEFAULT 0 CHECK(is_read IN (0, 1)),
          related_id INTEGER,
          related_type TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('创建通知表失败:', err);
          reject(err);
          return;
        }
        console.log('✅ 通知表创建成功');
      });

      // 8. 评价表（用户对场馆的评价）
      db.run(`
        CREATE TABLE IF NOT EXISTS reviews (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          venue_id INTEGER NOT NULL,
          reservation_id INTEGER,
          rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
          comment TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE,
          FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE SET NULL
        )
      `, (err) => {
        if (err) {
          console.error('创建评价表失败:', err);
          reject(err);
          return;
        }
        console.log('✅ 评价表创建成功');
      });

      // 检查是否已有数据，如果没有则插入示例数据
      db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
        if (err) {
          console.error('检查数据失败:', err);
          reject(err);
          return;
        }
        
        if (row.count === 0) {
          // 没有数据，插入示例数据
          insertSampleData()
            .then(() => {
              console.log('✅ 数据库初始化完成');
              resolve();
            })
            .catch(reject);
        } else {
          // 已有数据，为没有账户的用户创建账户
          initUserAccounts()
            .then(() => {
              console.log('✅ 数据库已存在，用户账户初始化完成');
              resolve();
            })
            .catch(reject);
        }
      });
    });
  });
}

// 插入示例数据
function insertSampleData() {
  return new Promise((resolve, reject) => {
    // 插入用户（密码默认为123456，实际应用中应该加密）
    const users = [
      ['张三', '13800138001', '123456', 'user'],
      ['李四', '13800138002', '123456', 'user'],
      ['王五', '13800138003', '123456', 'user'],
      ['管理员', 'admin', 'admin123', 'admin']
    ];

    let userCount = 0;
    const totalUsers = users.length;
    
    users.forEach(user => {
      db.run(
        'INSERT INTO users (name, phone, password, role) VALUES (?, ?, ?, ?)',
        user,
        function(err) {
          if (err) {
            console.error('插入用户数据失败:', err);
            userCount++;
            if (userCount === totalUsers) {
              reject(err);
            }
            return;
          }
          
          // 为新用户创建账户，初始余额为100元
          db.run(
            'INSERT INTO user_accounts (user_id, balance) VALUES (?, ?)',
            [this.lastID, 100.00],
            (err) => {
              if (err) {
                console.error(`创建用户账户失败 (user_id: ${this.lastID}):`, err);
              }
              userCount++;
              if (userCount === totalUsers) {
                console.log('✅ 用户示例数据和账户创建成功');
                // 继续插入场馆数据
                insertVenues()
                  .then(() => {
                    insertSubVenues()
                      .then(() => {
                        insertReservations()
                          .then(() => resolve())
                          .catch(reject);
                      })
                      .catch(reject);
                  })
                  .catch(reject);
              }
            }
          );
        }
      );
    });

  });
}

// 插入场馆数据
function insertVenues() {
  return new Promise((resolve, reject) => {
    const venues = [
      ['篮球场', '篮球场', 80.00, 'available', '标准室内篮球场，配备专业地板'],
      ['足球场', '足球场', 200.00, 'available', '标准11人制足球场，人工草皮'],
      ['羽毛球场', '羽毛球场', 60.00, 'available', '标准室内羽毛球场，木地板'],
      ['网球场', '网球场', 100.00, 'available', '标准室外网球场，硬地'],
      ['乒乓球场', '乒乓球场', 40.00, 'available', '标准乒乓球台，室内'],
      ['游泳馆', '游泳馆', 50.00, 'available', '标准游泳池，25米×50米']
    ];

    const venueStmt = db.prepare('INSERT INTO venues (name, type, price_per_hour, status, description) VALUES (?, ?, ?, ?, ?)');
    venues.forEach(venue => {
      venueStmt.run(venue);
    });
    venueStmt.finalize((err) => {
      if (err) {
        console.error('插入场馆数据失败:', err);
        reject(err);
        return;
      }
      console.log('✅ 场馆示例数据插入成功');
      resolve();
    });
  });
}

// 插入子场地
function insertSubVenues() {
  return new Promise((resolve, reject) => {
    // 为每个场馆类型创建子场地
    // 篮球场：2个场地
    // 足球场：1个场地
    // 羽毛球场：3个场地
    // 网球场：2个场地
    // 乒乓球场：4个台子
    // 游泳馆：1个泳池（容量50人）
    
    const subVenues = [
      // 篮球场（venue_id=1）
      [1, '1号篮球场', 10, 'available'],
      [1, '2号篮球场', 10, 'available'],
      // 足球场（venue_id=2）
      [2, '1号足球场', 22, 'available'],
      // 羽毛球场（venue_id=3）
      [3, '1号羽毛球场', 4, 'available'],
      [3, '2号羽毛球场', 4, 'available'],
      [3, '3号羽毛球场', 4, 'available'],
      // 网球场（venue_id=4）
      [4, '1号网球场', 2, 'available'],
      [4, '2号网球场', 2, 'available'],
      // 乒乓球场（venue_id=5）
      [5, '1号台', 2, 'available'],
      [5, '2号台', 2, 'available'],
      [5, '3号台', 2, 'available'],
      [5, '4号台', 2, 'available'],
      // 游泳馆（venue_id=6）
      [6, '主泳池', 50, 'available']
    ];

    const subVenueStmt = db.prepare('INSERT INTO sub_venues (venue_id, name, capacity, status) VALUES (?, ?, ?, ?)');
    subVenues.forEach(subVenue => {
      subVenueStmt.run(subVenue);
    });
    subVenueStmt.finalize((err) => {
      if (err) {
        console.error('插入子场地数据失败:', err);
        reject(err);
        return;
      }
      console.log('✅ 子场地示例数据插入成功');
      resolve();
    });
  });
}

// 插入预约记录
function insertReservations() {
  return new Promise((resolve, reject) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 预约记录需要包含sub_venue_id
    const reservations = [
      [1, 3, 4, tomorrow.toISOString().split('T')[0], '10:00', '12:00', 'pending'], // 用户1预约羽毛球场1号场
      [2, 5, 9, tomorrow.toISOString().split('T')[0], '14:00', '16:00', 'pending'], // 用户2预约乒乓球场1号台
    ];

    const resStmt = db.prepare('INSERT INTO reservations (user_id, venue_id, sub_venue_id, reservation_date, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
    reservations.forEach(res => {
      resStmt.run(res);
    });
    resStmt.finalize((err) => {
      if (err) {
        console.error('插入预约数据失败:', err);
        reject(err);
        return;
      }
      console.log('✅ 预约示例数据插入成功');
      resolve();
    });
  });
}

// 为现有用户初始化账户（如果还没有账户）
function initUserAccounts() {
  return new Promise((resolve, reject) => {
    // 查找所有没有账户的用户
    db.all(`
      SELECT u.id, u.name 
      FROM users u 
      LEFT JOIN user_accounts ua ON u.id = ua.user_id 
      WHERE ua.id IS NULL
    `, [], (err, users) => {
      if (err) {
        console.error('查询用户失败:', err);
        reject(err);
        return;
      }

      if (users.length === 0) {
        console.log('✅ 所有用户已有账户');
        resolve();
        return;
      }

      // 为没有账户的用户创建账户，初始余额为100元
      const accountStmt = db.prepare('INSERT INTO user_accounts (user_id, balance) VALUES (?, ?)');
      let completed = 0;
      
      users.forEach(user => {
        accountStmt.run([user.id, 100.00], (err) => {
          if (err) {
            console.error(`为用户 ${user.name} 创建账户失败:`, err);
          }
          completed++;
          if (completed === users.length) {
            accountStmt.finalize((err) => {
              if (err) {
                console.error('完成账户创建失败:', err);
                reject(err);
                return;
              }
              console.log(`✅ 为 ${users.length} 个用户创建了账户`);
              resolve();
            });
          }
        });
      });
    });
  });
}

// 导出数据库实例和初始化函数
module.exports = {
  db,
  initDatabase,
  DB_PATH
};

