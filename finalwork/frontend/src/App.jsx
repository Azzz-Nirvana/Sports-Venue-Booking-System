import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography, Avatar, Dropdown, Space, Badge, Button } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  HomeOutlined,
  CalendarOutlined,
  BarChartOutlined,
  ShopOutlined,
  ProfileOutlined,
  BellOutlined,
  StarOutlined
} from '@ant-design/icons';
import UserDashboard from './pages/UserDashboard';
import ReceptionistDashboard from './pages/ReceptionistDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Reviews from './pages/Reviews';
import { getUnreadNotificationCount } from './services/api';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

function AppContent() {
  const [currentUser, setCurrentUser] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 尝试从localStorage恢复用户信息
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  // 加载未读通知数量
  useEffect(() => {
    if (currentUser) {
      loadUnreadCount();
      // 每30秒刷新一次未读数量
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const loadUnreadCount = async () => {
    if (!currentUser) return;
    try {
      const data = await getUnreadNotificationCount(currentUser.id);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      // 静默失败
    }
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    navigate('/');
  };

  const getMenuItems = () => {
    if (!currentUser) return [];
    
    const role = currentUser.role;
    
    if (role === 'user') {
      return [
        { key: '/user', icon: <HomeOutlined />, label: '场馆浏览' },
        { key: '/user/reservations', icon: <CalendarOutlined />, label: '我的预约' },
        { key: '/user/reviews', icon: <StarOutlined />, label: '我的评价' },
      ];
    } else if (role === 'admin') {
      return [
        { key: '/admin', icon: <BarChartOutlined />, label: '数据统计' },
        { key: '/admin/users', icon: <TeamOutlined />, label: '用户管理' },
        { key: '/admin/applications', icon: <CalendarOutlined />, label: '申请列表' },
        { key: '/admin/venues', icon: <ShopOutlined />, label: '场馆管理' },
        { key: '/admin/reservations', icon: <CalendarOutlined />, label: '预约记录' },
        { key: '/admin/reviews', icon: <StarOutlined />, label: '评价管理' },
      ];
    }
    return [];
  };

  const handleMenuClick = ({ key }) => {
    if (key === 'profile') {
      const profilePath = currentUser.role === 'user' ? '/user/profile' : '/admin/profile';
      navigate(profilePath);
    } else if (key === 'logout') {
      handleLogout();
    }
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <ProfileOutlined />,
      label: '个人信息',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
    },
  ];

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const defaultPath = currentUser.role === 'user' ? '/user' : '/admin';

  return (
    <Layout style={{ minHeight: '100vh' }}>
        <Sider 
          collapsible 
          collapsed={collapsed} 
          onCollapse={setCollapsed}
          theme="light"
          style={{
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
          }}
        >
          <div style={{ 
            height: 64, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            borderBottom: '1px solid #f0f0f0'
          }}>
            {!collapsed ? (
              <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
                场馆预约系统
              </Title>
            ) : (
              <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
                场馆
              </Title>
            )}
          </div>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={getMenuItems()}
            onClick={({ key }) => navigate(key)}
            style={{ borderRight: 0 }}
          />
        </Sider>
        <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'all 0.2s' }}>
          <Header style={{ 
            background: '#fff', 
            padding: '0 24px', 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <Title level={4} style={{ margin: 0 }}>
              {currentUser.role === 'user' ? '用户中心' : '系统管理'}
            </Title>
            <Space>
              <Badge count={unreadCount} size="small">
                <Button
                  type="text"
                  icon={<BellOutlined />}
                  onClick={() => {
                    const notificationsPath = currentUser.role === 'user' ? '/user/notifications' : '/admin/notifications';
                    navigate(notificationsPath);
                  }}
                  style={{ fontSize: 18 }}
                />
              </Badge>
              <span>{currentUser.name}</span>
              <Dropdown menu={{ items: userMenuItems, onClick: handleMenuClick }} placement="bottomRight">
                <Avatar 
                  style={{ backgroundColor: '#1890ff', cursor: 'pointer' }} 
                  icon={<UserOutlined />} 
                />
              </Dropdown>
            </Space>
          </Header>
          <Content style={{ margin: '24px', background: '#fff', padding: 24, borderRadius: 8 }}>
            <Routes>
              <Route path="/" element={<Navigate to={defaultPath} replace />} />
              <Route path="/user" element={<UserDashboard user={currentUser} />} />
              <Route path="/user/reservations" element={<UserDashboard user={currentUser} tab="reservations" />} />
              <Route path="/user/profile" element={<Profile user={currentUser} />} />
              <Route path="/user/notifications" element={<Notifications user={currentUser} />} />
              <Route path="/user/reviews" element={<Reviews user={currentUser} />} />
              <Route path="/admin" element={<AdminDashboard user={currentUser} />} />
              <Route path="/admin/users" element={<AdminDashboard user={currentUser} tab="users" />} />
              <Route path="/admin/applications" element={<AdminDashboard user={currentUser} tab="applications" />} />
              <Route path="/admin/venues" element={<AdminDashboard user={currentUser} tab="venues" />} />
              <Route path="/admin/reservations" element={<AdminDashboard user={currentUser} tab="reservations" />} />
              <Route path="/admin/profile" element={<Profile user={currentUser} />} />
              <Route path="/admin/notifications" element={<Notifications user={currentUser} />} />
              <Route path="/admin/reviews" element={<Reviews user={currentUser} />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;

