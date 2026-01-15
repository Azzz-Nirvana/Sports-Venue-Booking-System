import React, { useState, useEffect } from 'react';
import { Card, List, Tag, Button, Space, Empty, message, Typography, Badge, Popconfirm } from 'antd';
import { 
  BellOutlined, 
  CheckCircleOutlined, 
  DeleteOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  deleteNotification 
} from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;

function Notifications({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState(null);
  const [readFilter, setReadFilter] = useState(null);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await getUserNotifications(user.id);
      setNotifications(data || []);
      const unread = (data || []).filter(n => !n.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      message.error('加载通知失败');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, is_read: 1 } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
      message.success('已标记为已读');
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead(user.id);
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
      message.success('已全部标记为已读');
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id);
      setNotifications(notifications.filter(n => n.id !== id));
      const deleted = notifications.find(n => n.id === id);
      if (deleted && !deleted.is_read) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
      message.success('通知已删除');
    } catch (error) {
      message.error('删除失败');
    }
  };

  const getNotificationIcon = (type) => {
    const iconMap = {
      reservation_confirmed: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      reservation_cancelled: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      reservation_modified: <ClockCircleOutlined style={{ color: '#faad14' }} />,
      reservation_reminder: <CalendarOutlined style={{ color: '#1890ff' }} />,
      payment_success: <DollarOutlined style={{ color: '#52c41a' }} />,
      recharge_success: <DollarOutlined style={{ color: '#52c41a' }} />,
      system: <BellOutlined style={{ color: '#1890ff' }} />
    };
    return iconMap[type] || <BellOutlined />;
  };

  const getNotificationTitle = (type) => {
    const titleMap = {
      reservation_confirmed: '预约确认',
      reservation_cancelled: '预约取消',
      reservation_modified: '预约修改',
      reservation_reminder: '预约提醒',
      payment_success: '支付成功',
      recharge_success: '充值成功',
      system: '系统通知'
    };
    return titleMap[type] || '通知';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          <BellOutlined /> 消息中心
        </Title>
        {unreadCount > 0 && (
          <Space>
            <span>未读消息：<Badge count={unreadCount} /></span>
            <Button 
              type="primary" 
              icon={<CheckOutlined />}
              onClick={handleMarkAllAsRead}
            >
              全部标记为已读
            </Button>
          </Space>
        )}
      </div>

      <Card>
        {notifications.length === 0 ? (
          <Empty description="暂无通知" />
        ) : (
          <List
            loading={loading}
            dataSource={notifications}
            renderItem={(item) => (
              <List.Item
                style={{
                  backgroundColor: item.is_read ? '#fff' : '#f0f7ff',
                  padding: '16px',
                  marginBottom: 8,
                  borderRadius: 4,
                  border: item.is_read ? '1px solid #d9d9d9' : '1px solid #1890ff'
                }}
                actions={[
                  !item.is_read && (
                    <Button
                      type="link"
                      size="small"
                      icon={<CheckCircleOutlined />}
                      onClick={() => handleMarkAsRead(item.id)}
                    >
                      标记已读
                    </Button>
                  ),
                  <Popconfirm
                    title="确定要删除这条通知吗？"
                    onConfirm={() => handleDelete(item.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button
                      type="link"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                    >
                      删除
                    </Button>
                  </Popconfirm>
                ]}
              >
                <List.Item.Meta
                  avatar={getNotificationIcon(item.type)}
                  title={
                    <Space>
                      <span>{item.title}</span>
                      {!item.is_read && <Badge status="processing" />}
                    </Space>
                  }
                  description={
                    <div>
                      <div style={{ marginBottom: 8 }}>{item.content}</div>
                      <div style={{ fontSize: 12, color: '#999' }}>
                        {dayjs(item.created_at).format('YYYY-MM-DD HH:mm:ss')}
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}

export default Notifications;
