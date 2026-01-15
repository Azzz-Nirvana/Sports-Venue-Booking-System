# 数据库设计说明

## 一、数据库概述

本系统使用 **SQLite** 数据库，数据库文件自动创建在 `backend/db/sports_venue.db`。

数据库设计遵循以下原则：
- ✅ 规范化设计（第三范式）
- ✅ 外键约束保证数据完整性
- ✅ CHECK约束保证数据有效性
- ✅ 合理的字段类型和长度
- ✅ 索引优化（主键自动索引）

## 二、表结构设计

### 1. users（用户表）

**用途**：存储系统所有用户信息，包括普通用户、前台管理员和系统管理员。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|---------|------|------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | 用户ID，主键 |
| name | TEXT | NOT NULL | 用户姓名 |
| phone | TEXT | NOT NULL, UNIQUE | 联系电话，唯一约束 |
| role | TEXT | NOT NULL, DEFAULT 'user', CHECK | 用户角色：user/receptionist/admin |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**索引**：
- PRIMARY KEY (id)
- UNIQUE (phone)

**约束说明**：
- `role` 字段使用 CHECK 约束，只允许 'user'、'receptionist'、'admin' 三个值
- `phone` 字段设置 UNIQUE 约束，防止重复注册

### 2. venues（场馆表）

**用途**：存储所有体育场馆的基本信息和定价。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|---------|------|------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | 场馆ID，主键 |
| name | TEXT | NOT NULL | 场馆名称 |
| type | TEXT | NOT NULL, CHECK | 场馆类型 |
| capacity | INTEGER | NOT NULL, DEFAULT 1 | 容量（人数） |
| price_per_hour | DECIMAL(10,2) | NOT NULL, DEFAULT 0.00 | 每小时价格 |
| status | TEXT | NOT NULL, DEFAULT 'available', CHECK | 场馆状态 |
| description | TEXT | | 场馆描述 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**索引**：
- PRIMARY KEY (id)

**约束说明**：
- `type` 字段 CHECK 约束，允许值：'篮球场'、'足球场'、'羽毛球场'、'网球场'、'乒乓球场'、'游泳馆'
- `status` 字段 CHECK 约束，允许值：'available'（可用）、'maintenance'（维护中）、'closed'（已关闭）
- `price_per_hour` 使用 DECIMAL(10,2) 保证价格精度

### 3. reservations（预约表）

**用途**：存储用户对场馆的预约信息。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|---------|------|------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | 预约ID，主键 |
| user_id | INTEGER | NOT NULL, FOREIGN KEY | 用户ID，外键关联users表 |
| venue_id | INTEGER | NOT NULL, FOREIGN KEY | 场馆ID，外键关联venues表 |
| reservation_date | DATE | NOT NULL | 预约日期 |
| start_time | TIME | NOT NULL | 开始时间 |
| end_time | TIME | NOT NULL | 结束时间 |
| status | TEXT | NOT NULL, DEFAULT 'pending', CHECK | 预约状态 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**索引**：
- PRIMARY KEY (id)
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
- FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE

**约束说明**：
- `status` 字段 CHECK 约束，允许值：
  - 'pending'（待确认）
  - 'confirmed'（已确认）
  - 'in_use'（使用中）
  - 'completed'（已完成）
  - 'cancelled'（已取消）
- 外键设置 `ON DELETE CASCADE`，当用户或场馆被删除时，相关预约自动删除

### 4. usage_records（使用记录表）

**用途**：记录用户实际使用场馆的情况和费用结算信息。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|---------|------|------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | 记录ID，主键 |
| reservation_id | INTEGER | NOT NULL, FOREIGN KEY | 预约ID，外键关联reservations表 |
| user_id | INTEGER | NOT NULL, FOREIGN KEY | 用户ID，外键关联users表 |
| venue_id | INTEGER | NOT NULL, FOREIGN KEY | 场馆ID，外键关联venues表 |
| actual_start_time | DATETIME | | 实际开始时间 |
| actual_end_time | DATETIME | | 实际结束时间 |
| duration_hours | DECIMAL(5,2) | NOT NULL | 使用时长（小时） |
| total_amount | DECIMAL(10,2) | NOT NULL | 总费用 |
| payment_status | TEXT | NOT NULL, DEFAULT 'unpaid', CHECK | 支付状态 |
| payment_time | DATETIME | | 支付时间 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**索引**：
- PRIMARY KEY (id)
- FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
- FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE

**约束说明**：
- `payment_status` 字段 CHECK 约束，允许值：'unpaid'（未支付）、'paid'（已支付）
- `duration_hours` 使用 DECIMAL(5,2) 支持小数小时（如 1.5 小时）
- `total_amount` 使用 DECIMAL(10,2) 保证金额精度

## 三、实体关系图（ER图）

```
users (用户)
  ├── id (PK)
  ├── name
  ├── phone (UNIQUE)
  └── role

venues (场馆)
  ├── id (PK)
  ├── name
  ├── type
  ├── price_per_hour
  └── status

reservations (预约)
  ├── id (PK)
  ├── user_id (FK → users.id)
  ├── venue_id (FK → venues.id)
  ├── reservation_date
  ├── start_time
  ├── end_time
  └── status

usage_records (使用记录)
  ├── id (PK)
  ├── reservation_id (FK → reservations.id)
  ├── user_id (FK → users.id)
  ├── venue_id (FK → venues.id)
  ├── duration_hours
  ├── total_amount
  └── payment_status
```

**关系说明**：
- 一个用户可以有多个预约（1:N）
- 一个场馆可以有多个预约（1:N）
- 一个预约对应一个使用记录（1:1）
- 一个用户可以有多个使用记录（1:N）
- 一个场馆可以有多个使用记录（1:N）

## 四、数据完整性保证

### 1. 实体完整性
- 每个表都有主键（PRIMARY KEY）
- 主键自动递增，保证唯一性

### 2. 参照完整性
- 所有外键都设置了 FOREIGN KEY 约束
- 使用 `ON DELETE CASCADE` 保证级联删除的一致性

### 3. 域完整性
- 使用 CHECK 约束限制字段取值范围
- 使用 NOT NULL 约束保证必填字段
- 使用 UNIQUE 约束保证唯一性（如用户电话）

### 4. 业务完整性
- 预约时间冲突检查（在应用层实现）
- 费用自动计算（使用时长 × 单价）
- 状态流转控制（pending → confirmed → in_use → completed）

## 五、示例数据

系统初始化时会自动插入以下示例数据：

### 用户数据
- 3个普通用户（张三、李四、王五）
- 1个前台管理员（前台小王）
- 1个系统管理员（管理员）

### 场馆数据
- 2个篮球场
- 2个足球场
- 3个羽毛球场
- 2个网球场
- 1个乒乓球场
- 1个游泳馆

### 预约数据
- 若干条示例预约记录（包含不同状态）

## 六、数据库初始化

数据库初始化在 `backend/db/init.js` 中完成：

1. **创建数据库连接**
   - 如果数据库文件不存在，自动创建
   - 如果数据库文件已存在，删除后重新创建（用于重置）

2. **启用外键约束**
   ```sql
   PRAGMA foreign_keys = ON;
   ```

3. **创建表结构**
   - 按依赖顺序创建表（先创建被引用表，再创建引用表）

4. **插入示例数据**
   - 使用事务保证数据一致性

## 七、查询优化建议

虽然 SQLite 是轻量级数据库，但以下优化可以提高查询性能：

1. **索引优化**
   - 主键自动创建索引
   - 外键字段建议创建索引（SQLite 3.8.0+ 自动为外键创建索引）

2. **常用查询**
   - 按日期查询预约：`reservation_date` 字段
   - 按状态查询：`status` 字段
   - 按用户查询：`user_id` 字段

3. **统计查询**
   - 使用聚合函数（SUM、COUNT、AVG）
   - 使用 GROUP BY 进行分组统计

## 八、数据库维护

### 重置数据库
删除 `backend/db/sports_venue.db` 文件，重启后端服务器即可自动重新初始化。

### 备份数据库
直接复制 `backend/db/sports_venue.db` 文件即可完成备份。

### 查看数据库
可以使用 SQLite 命令行工具或图形化工具（如 DB Browser for SQLite）查看数据库内容。

## 九、课程作业要点

本数据库设计完全满足数据库课程要求：

✅ **规范化设计**：符合第三范式，消除数据冗余  
✅ **完整性约束**：主键、外键、CHECK、UNIQUE、NOT NULL  
✅ **关系设计**：清晰的实体关系，合理的外键设计  
✅ **数据类型**：选择合适的字段类型和长度  
✅ **业务逻辑**：通过约束和状态字段体现业务规则  

