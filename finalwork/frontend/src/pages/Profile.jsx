import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Descriptions, Table, Tag, message, Spin, Typography, Button, Modal, Form, InputNumber, Input, Tabs } from 'antd';
import { 
  UserOutlined, 
  WalletOutlined, 
  DollarOutlined, 
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  TransactionOutlined
} from '@ant-design/icons';
import { 
  getUserById, 
  getAllReservations, 
  getAllUsageRecords,
  getUserAccount,
  rechargeAccount,
  getAccountTransactions,
  changePassword
} from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TabPane } = Tabs;

function Profile({ user }) {
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [accountInfo, setAccountInfo] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({
    totalReservations: 0,
    activeReservations: 0,
    totalSpent: 0,
    unpaidAmount: 0,
    totalUsageRecords: 0
  });
  const [reservations, setReservations] = useState([]);
  const [usageRecords, setUsageRecords] = useState([]);
  const [rechargeModalVisible, setRechargeModalVisible] = useState(false);
  const [rechargeForm] = Form.useForm();
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordForm] = Form.useForm();

  useEffect(() => {
    if (user) {
      loadUserData();
    } else {
      console.warn('Profile组件：user参数为空', user);
      setLoading(false);
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user || !user.id) {
      console.error('Profile组件：user或user.id为空', user);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // 加载用户信息
      const userData = await getUserById(user.id);
      setUserInfo(userData);

      // 加载账户信息（如果失败，使用默认值）
      try {
        const account = await getUserAccount(user.id);
        setAccountInfo(account);
      } catch (error) {
        console.warn('加载账户信息失败:', error);
        setAccountInfo({ balance: 0 });
      }

      // 加载交易记录（如果失败，使用空数组）
      try {
        const transactionsData = await getAccountTransactions(user.id);
        setTransactions(transactionsData || []);
      } catch (error) {
        console.warn('加载交易记录失败:', error);
        setTransactions([]);
      }

      // 加载预约记录
      let reservationsData = [];
      try {
        reservationsData = await getAllReservations({ user_id: user.id });
        setReservations(reservationsData || []);
      } catch (error) {
        console.warn('加载预约记录失败:', error);
        setReservations([]);
      }

      // 加载使用记录
      let usageData = [];
      try {
        usageData = await getAllUsageRecords({ user_id: user.id });
        setUsageRecords(usageData || []);
      } catch (error) {
        console.warn('加载使用记录失败:', error);
        setUsageRecords([]);
      }

      // 计算统计信息
      const totalReservations = (reservationsData || []).length;
      const activeReservations = (reservationsData || []).filter(
        r => ['pending', 'confirmed', 'in_use'].includes(r.status)
      ).length;
      
      const paidRecords = (usageData || []).filter(r => r.payment_status === 'paid');
      const unpaidRecords = (usageData || []).filter(r => r.payment_status === 'unpaid');
      
      const totalSpent = paidRecords.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0);
      const unpaidAmount = unpaidRecords.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0);

      setStats({
        totalReservations,
        activeReservations,
        totalSpent,
        unpaidAmount,
        totalUsageRecords: (usageData || []).length
      });
    } catch (error) {
      message.error('加载用户信息失败: ' + (error.response?.data?.error || error.message));
      console.error('加载用户数据错误:', error);
      // 设置默认值，确保页面可以显示
      setUserInfo(user);
      setAccountInfo({ balance: 0 });
      setTransactions([]);
      setReservations([]);
      setUsageRecords([]);
      setStats({
        totalReservations: 0,
        activeReservations: 0,
        totalSpent: 0,
        unpaidAmount: 0,
        totalUsageRecords: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecharge = async (values) => {
    try {
      const result = await rechargeAccount(user.id, values.amount, values.description);
      message.success(`充值成功！当前余额：¥${result.balance.toFixed(2)}`);
      setRechargeModalVisible(false);
      rechargeForm.resetFields();
      loadUserData(); // 重新加载数据
    } catch (error) {
      message.error(error.response?.data?.error || '充值失败');
    }
  };

  const handleChangePassword = async (values) => {
    try {
      await changePassword(user.id, values.oldPassword, values.newPassword);
      message.success('密码修改成功');
      setPasswordModalVisible(false);
      passwordForm.resetFields();
    } catch (error) {
      message.error(error.response?.data?.error || '密码修改失败');
    }
  };

  const reservationColumns = [
    {
      title: '预约日期',
      dataIndex: 'reservation_date',
      key: 'reservation_date',
      render: (text) => dayjs(text).format('YYYY-MM-DD'),
    },
    {
      title: '时间段',
      key: 'time',
      render: (_, record) => `${record.start_time} - ${record.end_time}`,
    },
    {
      title: '场馆',
      dataIndex: 'venue_name',
      key: 'venue_name',
    },
    {
      title: '子场地',
      dataIndex: 'sub_venue_name',
      key: 'sub_venue_name',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap = {
          pending: { color: 'orange', text: '待确认' },
          confirmed: { color: 'blue', text: '已确认' },
          in_use: { color: 'green', text: '使用中' },
          completed: { color: 'default', text: '已完成' },
          cancelled: { color: 'red', text: '已取消' },
        };
        const config = statusMap[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm'),
    },
  ];

  const usageColumns = [
    {
      title: '场馆',
      dataIndex: 'venue_name',
      key: 'venue_name',
    },
    {
      title: '使用时长',
      dataIndex: 'duration_hours',
      key: 'duration_hours',
      render: (hours) => hours ? `${hours} 小时` : '-',
    },
    {
      title: '费用',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount) => amount ? `¥${parseFloat(amount).toFixed(2)}` : '-',
    },
    {
      title: '支付状态',
      dataIndex: 'payment_status',
      key: 'payment_status',
      render: (status) => (
        <Tag color={status === 'paid' ? 'green' : 'orange'}>
          {status === 'paid' ? '已支付' : '未支付'}
        </Tag>
      ),
    },
    {
      title: '开始时间',
      dataIndex: 'actual_start_time',
      key: 'actual_start_time',
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '结束时间',
      dataIndex: 'actual_end_time',
      key: 'actual_end_time',
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-',
    },
  ];

  // 如果没有用户信息，显示错误提示
  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Typography.Title level={3}>用户信息未找到</Typography.Title>
        <Typography.Text type="secondary">请重新登录</Typography.Text>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载中...</div>
      </div>
    );
  }

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>
        <UserOutlined /> 个人信息
      </Title>

      {/* 用户基本信息 */}
      <Card 
        title="基本信息" 
        extra={
          <Button 
            type="link" 
            onClick={() => setPasswordModalVisible(true)}
          >
            修改密码
          </Button>
        }
        style={{ marginBottom: 24 }}
      >
        <Descriptions bordered column={2}>
          <Descriptions.Item label="姓名">{userInfo?.name || user.name}</Descriptions.Item>
          <Descriptions.Item label="电话">{userInfo?.phone || user.phone}</Descriptions.Item>
          <Descriptions.Item label="角色">
            <Tag color={userInfo?.role === 'admin' ? 'red' : 'blue'}>
              {userInfo?.role === 'admin' ? '管理员' : '普通用户'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="注册时间">
            {userInfo?.created_at ? dayjs(userInfo.created_at).format('YYYY-MM-DD HH:mm') : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 账户余额卡片 */}
      <Card 
        title={
          <span>
            <WalletOutlined /> 账户余额
          </span>
        }
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setRechargeModalVisible(true)}
          >
            充值
          </Button>
        }
        style={{ marginBottom: 24 }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Statistic
              title="当前余额"
              value={accountInfo?.balance || 0}
              prefix="¥"
              precision={2}
              valueStyle={{ color: '#1890ff', fontSize: 32 }}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="待支付金额"
              value={stats.unpaidAmount}
              prefix="¥"
              precision={2}
              valueStyle={{ color: '#faad14', fontSize: 24 }}
            />
          </Col>
        </Row>
      </Card>

      {/* 统计信息 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总预约数"
              value={stats.totalReservations}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="进行中预约"
              value={stats.activeReservations}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总消费"
              value={stats.totalSpent}
              prefix={<DollarOutlined />}
              precision={2}
              suffix="元"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="使用记录数"
              value={stats.totalUsageRecords}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 使用Tabs组织内容 */}
      <Tabs defaultActiveKey="reservations">
        <TabPane 
          tab={
            <span>
              <CalendarOutlined /> 预约记录
            </span>
          } 
          key="reservations"
        >
          <Table
            columns={reservationColumns}
            dataSource={reservations}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: '暂无预约记录' }}
          />
        </TabPane>
        
        <TabPane 
          tab={
            <span>
              <CheckCircleOutlined /> 使用记录
            </span>
          } 
          key="usage"
        >
          <Table
            columns={usageColumns}
            dataSource={usageRecords}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: '暂无使用记录' }}
          />
        </TabPane>

        <TabPane 
          tab={
            <span>
              <TransactionOutlined /> 交易记录
            </span>
          } 
          key="transactions"
        >
          <Table
            columns={[
              {
                title: '交易时间',
                dataIndex: 'created_at',
                key: 'created_at',
                render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
              },
              {
                title: '交易类型',
                dataIndex: 'transaction_type',
                key: 'transaction_type',
                render: (type) => {
                  const typeMap = {
                    recharge: { color: 'green', text: '充值' },
                    payment: { color: 'orange', text: '支付' },
                    refund: { color: 'blue', text: '退款' },
                  };
                  const config = typeMap[type] || { color: 'default', text: type };
                  return <Tag color={config.color}>{config.text}</Tag>;
                },
              },
              {
                title: '交易金额',
                dataIndex: 'amount',
                key: 'amount',
                render: (amount, record) => {
                  const isPositive = record.transaction_type === 'recharge' || record.transaction_type === 'refund';
                  return (
                    <span style={{ color: isPositive ? '#52c41a' : '#ff4d4f' }}>
                      {isPositive ? '+' : '-'}¥{parseFloat(amount).toFixed(2)}
                    </span>
                  );
                },
              },
              {
                title: '交易前余额',
                dataIndex: 'balance_before',
                key: 'balance_before',
                render: (amount) => `¥${parseFloat(amount || 0).toFixed(2)}`,
              },
              {
                title: '交易后余额',
                dataIndex: 'balance_after',
                key: 'balance_after',
                render: (amount) => `¥${parseFloat(amount || 0).toFixed(2)}`,
              },
              {
                title: '关联场馆',
                dataIndex: 'venue_name',
                key: 'venue_name',
                render: (text) => text || '-',
              },
              {
                title: '描述',
                dataIndex: 'description',
                key: 'description',
              },
            ]}
            dataSource={transactions}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: '暂无交易记录' }}
          />
        </TabPane>
      </Tabs>

      {/* 充值弹窗 */}
      <Modal
        title="账户充值"
        open={rechargeModalVisible}
        onCancel={() => {
          setRechargeModalVisible(false);
          rechargeForm.resetFields();
        }}
        onOk={() => rechargeForm.submit()}
        okText="确认充值"
      >
        <Form
          form={rechargeForm}
          layout="vertical"
          onFinish={handleRecharge}
        >
          <Form.Item
            name="amount"
            label="充值金额"
            rules={[
              { required: true, message: '请输入充值金额' },
              { type: 'number', min: 0.01, message: '充值金额必须大于0' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              prefix="¥"
              placeholder="请输入充值金额"
              precision={2}
              min={0.01}
              step={10}
            />
          </Form.Item>
          <Form.Item
            name="description"
            label="备注（可选）"
          >
            <Input.TextArea
              rows={3}
              placeholder="请输入备注信息"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 修改密码弹窗 */}
      <Modal
        title="修改密码"
        open={passwordModalVisible}
        onCancel={() => {
          setPasswordModalVisible(false);
          passwordForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleChangePassword}
        >
          <Form.Item
            name="oldPassword"
            label="旧密码"
            rules={[{ required: true, message: '请输入旧密码' }]}
          >
            <Input.Password placeholder="请输入旧密码" />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度至少为6位' }
            ]}
          >
            <Input.Password placeholder="请输入新密码（至少6位）" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              确认修改
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default Profile;
