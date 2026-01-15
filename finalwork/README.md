# 体育场馆预约管理系统

## 项目简介

这是一个完整的体育场馆预约管理系统，用于数据库系统课程大作业。系统实现了从预约到结算的完整业务流程，包含用户、前台管理员和管理员三种角色。

## 技术栈

### 前端
- **React 18** - 前端框架
- **Ant Design 5** - UI组件库
- **Tailwind CSS** - 样式框架
- **Vite** - 构建工具
- **React Router** - 路由管理
- **Axios** - HTTP客户端
- **Day.js** - 日期时间处理库

### 后端
- **Node.js** - 运行环境
- **Express** - Web框架
- **SQLite** - 数据库（无需手动配置，自动创建）
- **Nodemon** - 开发环境自动重启工具

## 功能特性

### 👤 用户功能
- 浏览可预约的体育场馆和子场地
- 在线预约场馆（选择日期和时间段）
- 查看个人预约记录
- 取消待确认的预约
- 查看个人账户余额和交易记录
- 账户充值功能
- 查看系统通知（预约提醒等）
- 对已完成的使用记录进行评价
- 查看场馆评价
- 个人资料管理

### 🧾 前台管理员功能
- 查看待确认的预约列表
- 确认用户预约
- 用户到场登记（开始使用）
- 完成使用并计算费用
- 处理费用结算（支持账户余额支付）
- 查看当前正在使用的场地
- 管理子场地信息

### 🧑‍💼 管理员功能
- 数据统计面板（用户数、场馆数、收入等）
- 按日期统计收入
- 按场馆统计使用情况
- 场馆管理（新增、编辑、删除）
- 子场地管理（新增、编辑、删除）
- 查看所有预约记录
- 查看所有使用记录
- 查看所有用户评价
- 系统通知管理

## 数据库设计

### 表结构

#### 1. users（用户表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| name | TEXT | 姓名 |
| phone | TEXT | 联系电话（唯一） |
| role | TEXT | 角色：user/receptionist/admin |
| created_at | DATETIME | 创建时间 |

#### 2. venues（场馆表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| name | TEXT | 场馆名称 |
| type | TEXT | 场馆类型（篮球场/足球场/羽毛球场等） |
| capacity | INTEGER | 容量（人数） |
| price_per_hour | DECIMAL(10,2) | 每小时价格 |
| status | TEXT | 状态：available/maintenance/closed |
| description | TEXT | 描述信息 |
| created_at | DATETIME | 创建时间 |

#### 3. reservations（预约表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| user_id | INTEGER | 外键，关联users表 |
| venue_id | INTEGER | 外键，关联venues表 |
| reservation_date | DATE | 预约日期 |
| start_time | TIME | 开始时间 |
| end_time | TIME | 结束时间 |
| status | TEXT | 状态：pending/confirmed/in_use/completed/cancelled |
| created_at | DATETIME | 创建时间 |

#### 4. usage_records（使用记录表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| reservation_id | INTEGER | 外键，关联reservations表 |
| user_id | INTEGER | 外键，关联users表 |
| venue_id | INTEGER | 外键，关联venues表 |
| actual_start_time | DATETIME | 实际开始时间 |
| actual_end_time | DATETIME | 实际结束时间 |
| duration_hours | DECIMAL(5,2) | 使用时长（小时） |
| total_amount | DECIMAL(10,2) | 总费用 |
| payment_status | TEXT | 支付状态：unpaid/paid |
| payment_time | DATETIME | 支付时间 |
| created_at | DATETIME | 创建时间 |

### 数据库特性
- ✅ 自动创建数据库文件（`backend/db/sports_venue.db`）
- ✅ 自动初始化表结构（包含多个业务表）
- ✅ 自动插入示例数据
- ✅ 外键约束保证数据完整性
- ✅ CHECK约束保证数据有效性
- ✅ 支持子场地管理
- ✅ 支持账户余额和交易记录
- ✅ 支持通知系统
- ✅ 支持评价系统

> 📖 详细的数据库设计说明请查看 [DATABASE_DESIGN.md](./DATABASE_DESIGN.md)

## 快速开始

### 前置要求
- Node.js >= 16.0.0
- npm >= 7.0.0

### 安装步骤

1. **克隆项目**（如果是从仓库克隆）
```bash
git clone <repository-url>
cd finalwork
```

> 注意：如果项目目录名不同，请相应调整路径

2. **安装后端依赖**
```bash
cd backend
npm install
```

3. **安装前端依赖**
```bash
cd ../frontend
npm install
```

### 运行项目

#### 方式一：分别启动（推荐用于开发）

**终端1 - 启动后端：**
```bash
cd backend
npm run dev
```
后端将在 `http://localhost:5000` 启动

**终端2 - 启动前端：**
```bash
cd frontend
npm run dev
```
前端将在 `http://localhost:3000` 启动

#### 方式二：使用根目录脚本（推荐，一键启动）

在项目根目录运行：
```bash
# 首次运行需要安装所有依赖
npm run install:all

# 启动前后端（需要 concurrently，已包含在 devDependencies 中）
npm run dev
```

这将同时启动后端（端口 5000）和前端（端口 3000）。

#### 方式三：分别启动生产环境

**启动后端：**
```bash
cd backend
npm start
```

**启动前端：**
```bash
cd frontend
npm run dev
```

### 访问系统

1. 打开浏览器访问：`http://localhost:3000`
2. 使用以下测试账号登录：

**普通用户：**
- 电话：13800138001（张三）
- 电话：13800138002（李四）
- 电话：13800138003（王五）

**前台管理员：**
- 电话：13800138010（前台小王）

**系统管理员：**
- 电话：13800138000（管理员）

> 提示：首次使用某个电话号码会自动注册为新用户（角色为user）

## 项目结构

```
finalwork/
├── backend/                 # 后端代码
│   ├── db/                  # 数据库相关
│   │   ├── init.js          # 数据库初始化脚本
│   │   └── sports_venue.db  # SQLite数据库文件（自动生成）
│   ├── routes/              # 路由文件
│   │   ├── users.js         # 用户路由
│   │   ├── venues.js        # 场馆路由
│   │   ├── sub-venues.js    # 子场地路由
│   │   ├── reservations.js # 预约路由
│   │   ├── usage.js         # 使用记录路由
│   │   ├── stats.js         # 统计路由
│   │   ├── accounts.js      # 账户路由（余额、充值、交易）
│   │   ├── notifications.js # 通知路由
│   │   └── reviews.js       # 评价路由
│   ├── utils/               # 工具函数
│   │   └── reminder.js      # 预约提醒服务
│   ├── server.js            # 服务器入口
│   └── package.json         # 后端依赖配置
│
├── frontend/                # 前端代码
│   ├── src/
│   │   ├── pages/           # 页面组件
│   │   │   ├── Login.jsx              # 登录页
│   │   │   ├── UserDashboard.jsx      # 用户面板
│   │   │   ├── ReceptionistDashboard.jsx  # 前台管理面板
│   │   │   ├── AdminDashboard.jsx     # 管理员面板
│   │   │   ├── Profile.jsx            # 个人资料页
│   │   │   ├── Notifications.jsx      # 通知页面
│   │   │   └── Reviews.jsx            # 评价页面
│   │   ├── services/        # API服务
│   │   │   └── api.js       # API调用封装
│   │   ├── App.jsx          # 主应用组件
│   │   ├── main.jsx         # 入口文件
│   │   └── index.css        # 全局样式
│   ├── index.html           # HTML模板
│   ├── vite.config.js       # Vite配置（包含代理配置）
│   ├── tailwind.config.js   # Tailwind配置
│   ├── postcss.config.js    # PostCSS配置
│   └── package.json         # 前端依赖配置
│
├── DATABASE_DESIGN.md       # 数据库设计详细文档
├── package.json             # 根目录脚本配置
└── README.md                # 项目说明文档
```

## API接口说明

### 用户相关
- `GET /api/users` - 获取所有用户
- `GET /api/users/:id` - 根据ID获取用户
- `GET /api/users/phone/:phone` - 根据电话获取用户
- `POST /api/users` - 创建用户
- `PUT /api/users/:id` - 更新用户信息

### 场馆相关
- `GET /api/venues` - 获取所有场馆（支持type、status筛选）
- `GET /api/venues/:id` - 根据ID获取场馆
- `POST /api/venues` - 创建场馆
- `PUT /api/venues/:id` - 更新场馆
- `DELETE /api/venues/:id` - 删除场馆

### 子场地相关
- `GET /api/sub-venues` - 获取所有子场地（支持venue_id、status筛选）
- `GET /api/sub-venues/:id` - 根据ID获取子场地
- `POST /api/sub-venues` - 创建子场地
- `PUT /api/sub-venues/:id` - 更新子场地
- `DELETE /api/sub-venues/:id` - 删除子场地

### 预约相关
- `GET /api/reservations` - 获取所有预约（支持user_id、venue_id、status、date筛选）
- `GET /api/reservations/:id` - 根据ID获取预约
- `POST /api/reservations` - 创建预约
- `PUT /api/reservations/:id/status` - 更新预约状态
- `DELETE /api/reservations/:id` - 取消预约

### 使用记录相关
- `GET /api/usage` - 获取所有使用记录
- `GET /api/usage/current/in-use` - 获取当前使用中的记录
- `POST /api/usage` - 创建使用记录（到场登记）
- `PUT /api/usage/:id/complete` - 完成使用并计算费用
- `PUT /api/usage/:id/pay` - 支付结算

### 账户相关
- `GET /api/accounts/user/:user_id` - 获取用户账户信息（包含余额）
- `POST /api/accounts/user/:user_id/recharge` - 账户充值
- `GET /api/accounts/user/:user_id/transactions` - 获取交易记录

### 通知相关
- `GET /api/notifications/user/:user_id` - 获取用户通知列表
- `GET /api/notifications/user/:user_id/unread-count` - 获取未读通知数量
- `PUT /api/notifications/:id/read` - 标记通知为已读
- `PUT /api/notifications/user/:user_id/read-all` - 标记所有通知为已读

### 评价相关
- `GET /api/reviews` - 获取所有评价（支持venue_id、user_id、reservation_id筛选）
- `GET /api/reviews/:id` - 根据ID获取评价
- `POST /api/reviews` - 创建评价
- `PUT /api/reviews/:id` - 更新评价
- `DELETE /api/reviews/:id` - 删除评价

### 统计相关
- `GET /api/stats/overview` - 获取总体统计
- `GET /api/stats/revenue/by-date` - 按日期统计收入
- `GET /api/stats/venue/usage` - 按场馆统计使用情况

### 健康检查
- `GET /api/health` - 服务器健康检查

## 业务流程

1. **用户预约流程**
   - 用户浏览场馆和子场地 → 选择场馆、子场地和时间 → 提交预约（状态：pending）
   - 系统自动发送预约确认通知
   - 前台管理员确认预约（状态：confirmed）
   - 系统在预约开始前1小时自动发送提醒通知

2. **使用流程**
   - 用户到场 → 前台登记（创建usage_record，状态：in_use）
   - 使用完成 → 前台录入实际时长 → 系统自动计算费用
   - 前台结算 → 用户可选择账户余额支付或现金支付 → 更新支付状态（paid）
   - 支付完成后，用户可对本次使用进行评价

3. **账户管理流程**
   - 用户注册后自动创建账户（初始余额为0）
   - 用户可进行账户充值
   - 所有充值和使用记录都会生成交易记录
   - 用户可查看账户余额和交易历史

4. **数据统计**
   - 管理员可查看收入统计、场馆使用情况等
   - 支持按日期、按场馆等多维度统计

## 注意事项

1. **数据库重置**：如果需要重置数据库，删除 `backend/db/sports_venue.db` 文件，重启后端服务器即可自动重新初始化。

2. **端口配置**：
   - 后端默认端口：5000（在 `backend/server.js` 中配置）
   - 前端默认端口：3000（在 `frontend/vite.config.js` 中配置）
   - 前端已配置代理，开发环境下 API 请求会自动转发到后端

3. **CORS配置**：后端已配置CORS，允许前端跨域访问。

4. **时间格式**：预约时间使用 `HH:mm` 格式（如：09:00），日期使用 `YYYY-MM-DD` 格式。

5. **预约提醒服务**：系统会自动检查即将开始的预约（1小时内），并发送提醒通知。该服务在服务器启动时自动运行。

6. **账户系统**：用户首次使用账户功能时会自动创建账户，初始余额为0。支持账户余额支付和现金支付两种方式。

7. **子场地管理**：每个场馆可以包含多个子场地（如：篮球场1、篮球场2），预约时需要选择具体的子场地。

## 开发说明

### 数据库初始化
数据库初始化在 `backend/db/init.js` 中完成，包括：
- 创建所有表结构
- 设置外键约束
- 插入示例数据

### 前端路由
使用 React Router 进行路由管理，根据用户角色显示不同的菜单和页面。

### 状态管理
使用 React Hooks 进行状态管理，用户信息存储在 localStorage 中。

### 预约提醒服务
系统在 `backend/utils/reminder.js` 中实现了自动提醒功能：
- 定期检查即将开始的预约（1小时内）
- 自动发送通知给用户
- 服务在服务器启动时自动运行

### 前端代理配置
前端使用 Vite 开发服务器，已配置代理将所有 `/api` 请求转发到后端服务器（`http://localhost:5000`），无需手动处理跨域问题。

## 课程作业说明

本系统完全满足数据库课程大作业要求：

✅ **数据库设计**：包含多个核心表（用户、场馆、子场地、预约、使用记录、账户、通知、评价等），设计合理，有主键、外键、约束  
✅ **数据完整性**：使用外键约束和CHECK约束保证数据一致性  
✅ **业务逻辑**：完整的预约→使用→结算流程，包含账户管理、通知提醒、评价系统  
✅ **前后端分离**：清晰的架构设计，RESTful API 接口  
✅ **可直接运行**：无需手动配置数据库，一键启动  
✅ **代码完整**：所有功能均已实现，非伪代码  
✅ **功能丰富**：不仅包含基础预约功能，还包含账户系统、通知系统、评价系统等扩展功能

### 数据库设计亮点
- 多表关联设计，体现复杂业务关系
- 完整的约束体系（主键、外键、CHECK、UNIQUE、NOT NULL）
- 支持子场地管理，体现实际业务场景
- 账户和交易记录表，支持财务统计
- 通知表支持系统消息推送
- 评价表支持用户反馈

> 📖 详细的数据库设计文档请参考 [DATABASE_DESIGN.md](./DATABASE_DESIGN.md)  

## 常见问题

### Q: 如何重置数据库？
A: 删除 `backend/db/sports_venue.db` 文件，重启后端服务器即可。

### Q: 前端无法连接后端？
A: 确保后端服务器已启动（端口5000），检查 `frontend/vite.config.js` 中的代理配置。

### Q: 如何修改端口？
A: 后端端口在 `backend/server.js` 中修改，前端端口在 `frontend/vite.config.js` 中修改。

### Q: 预约提醒不工作？
A: 确保后端服务器正在运行，提醒服务在服务器启动时自动运行。

### Q: 账户余额如何充值？
A: 登录后进入个人资料页面，可以查看账户信息并进行充值。

## 更新日志

### v1.0.0
- ✅ 基础预约功能
- ✅ 用户、前台、管理员三种角色
- ✅ 场馆和子场地管理
- ✅ 账户系统和交易记录
- ✅ 通知提醒系统
- ✅ 评价系统
- ✅ 数据统计功能

## 作者

数据库系统课程大作业

## 许可证

本项目仅用于课程作业，请勿用于商业用途。

---

**提示**：如有问题或建议，请查看项目代码或联系开发者。

