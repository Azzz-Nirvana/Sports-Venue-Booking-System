import React, { useState, useEffect } from 'react';
import { Tabs, Card, Table, Button, Space, Tag, Modal, Form, InputNumber, message, Statistic, Row, Col, Radio, Alert } from 'antd';
import { 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  DollarOutlined,
  PlayCircleOutlined,
  WalletOutlined
} from '@ant-design/icons';
import { 
  getAllReservations, 
  updateReservationStatus, 
  createUsageRecord, 
  completeUsageRecord, 
  payUsageRecord,
  getCurrentInUse,
  getAllUsageRecords,
  getUserAccount,
  payFromAccount
} from '../services/api';

const { TabPane } = Tabs;

function ReceptionistDashboard({ user, tab = 'reservations' }) {
  const [activeTab, setActiveTab] = useState(tab);
  const [reservations, setReservations] = useState([]);
  const [inUseRecords, setInUseRecords] = useState([]);
  const [unpaidRecords, setUnpaidRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedPayRecord, setSelectedPayRecord] = useState(null);
  const [userAccount, setUserAccount] = useState(null);
  const [form] = Form.useForm();
  const [payForm] = Form.useForm();

  useEffect(() => {
    if (activeTab === 'reservations') {
      loadReservations();
    } else {
      loadInUseRecords();
    }
  }, [activeTab]);

  const loadReservations = async () => {
    setLoading(true);
    try {
      // 加载待确认和已确认的预约
      const [pending, confirmed] = await Promise.all([
        getAllReservations({ status: 'pending' }),
        getAllReservations({ status: 'confirmed' })
      ]);
      setReservations([...pending, ...confirmed]);
    } catch (error) {
      message.error('加载预约失败');
    } finally {
      setLoading(false);
    }
  };

  const loadInUseRecords = async () => {
    setLoading(true);
    try {
      const [inUse, unpaid] = await Promise.all([
        getCurrentInUse(),
        getAllUsageRecords({ payment_status: 'unpaid' })
      ]);
      setInUseRecords(inUse);
      setUnpaidRecords(unpaid.filter(r => r.total_amount > 0));
    } catch (error) {
      message.error('加载使用记录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (id) => {
    try {
      await updateReservationStatus(id, 'confirmed');
      message.success('预约已确认');
      loadReservations();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleCheckIn = async (id) => {
    try {
      await createUsageRecord({ reservation_id: id });
      message.success('到场登记成功，使用已开始');
      loadReservations();
      if (activeTab === 'usage') {
        loadInUseRecords();
      }
    } catch (error) {
      message.error(error.response?.data?.error || '操作失败');
    }
  };

  const handleComplete = (record) => {
    setSelectedRecord(record);
    form.resetFields();
    form.setFieldsValue({ duration_hours: 2 });
    setCompleteModalVisible(true);
  };

  const handleSubmitComplete = async (values) => {
    try {
      await completeUsageRecord(selectedRecord.id, values.duration_hours);
      message.success('使用完成，费用已计算');
      setCompleteModalVisible(false);
      loadInUseRecords();
    } catch (error) {
      message.error(error.response?.data?.error || '操作失败');
    }
  };

  const handlePay = async (record) => {
    setSelectedPayRecord(record);
    try {
      // 获取用户账户信息
      const account = await getUserAccount(record.user_id);
      setUserAccount(account);
      payForm.setFieldsValue({ payment_method: 'balance' });
      setPayModalVisible(true);
    } catch (error) {
      message.error('获取账户信息失败');
    }
  };

  const handleSubmitPay = async (values) => {
    try {
      if (values.payment_method === 'balance') {
        // 余额支付
        await payFromAccount(selectedPayRecord.user_id, selectedPayRecord.id, selectedPayRecord.total_amount);
        message.success('余额支付成功');
      } else {
        // 现金支付
        await payUsageRecord(selectedPayRecord.id);
        message.success('现金支付成功');
      }
      setPayModalVisible(false);
      payForm.resetFields();
      loadInUseRecords();
    } catch (error) {
      message.error(error.response?.data?.error || '支付失败');
    }
  };

  const reservationColumns = [
    {
      title: '预约日期',
      dataIndex: 'reservation_date',
      key: 'reservation_date',
    },
    {
      title: '时间段',
      key: 'time',
      render: (_, record) => `${record.start_time} - ${record.end_time}`,
    },
    {
      title: '用户',
      dataIndex: 'user_name',
      key: 'user_name',
    },
    {
      title: '联系电话',
      dataIndex: 'user_phone',
      key: 'user_phone',
    },
    {
      title: '场馆',
      dataIndex: 'venue_name',
      key: 'venue_name',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && (
            <Button 
              type="primary" 
              size="small"
              onClick={() => handleConfirm(record.id)}
            >
              确认预约
            </Button>
          )}
          {record.status === 'confirmed' && (
            <Button 
              type="default" 
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleCheckIn(record.id)}
            >
              到场登记
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const inUseColumns = [
    {
      title: '用户',
      dataIndex: 'user_name',
      key: 'user_name',
    },
    {
      title: '联系电话',
      dataIndex: 'user_phone',
      key: 'user_phone',
    },
    {
      title: '场馆',
      dataIndex: 'venue_name',
      key: 'venue_name',
    },
    {
      title: '开始时间',
      dataIndex: 'actual_start_time',
      key: 'actual_start_time',
      render: (text) => text ? new Date(text).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button 
            type="primary" 
            size="small"
            onClick={() => handleComplete(record)}
          >
            完成使用
          </Button>
        </Space>
      ),
    },
  ];

  const usageRecordsColumns = [
    {
      title: '用户',
      dataIndex: 'user_name',
      key: 'user_name',
    },
    {
      title: '场馆',
      dataIndex: 'venue_name',
      key: 'venue_name',
    },
    {
      title: '使用时长',
      dataIndex: 'duration_hours',
      key: 'duration_hours',
      render: (text) => text ? `${text} 小时` : '-',
    },
    {
      title: '费用',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (text) => text ? `¥${parseFloat(text).toFixed(2)}` : '-',
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
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          {record.payment_status === 'unpaid' && record.total_amount > 0 && (
            <Button 
              type="primary" 
              size="small"
              icon={<DollarOutlined />}
              onClick={() => handlePay(record)}
            >
              结算
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="预约管理" key="reservations">
          <Card>
            <Table
              columns={reservationColumns}
              dataSource={reservations}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>

        <TabPane tab="使用管理" key="usage">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic 
                    title="当前使用中" 
                    value={inUseRecords.length} 
                    prefix={<PlayCircleOutlined />}
                  />
                </Col>
              </Row>
            </Card>

            <Card title="当前使用中的场地">
              <Table
                columns={inUseColumns}
                dataSource={inUseRecords}
                rowKey="id"
                loading={loading}
                pagination={false}
              />
            </Card>

            <Card title="待结算记录">
              <Table
                columns={usageRecordsColumns}
                dataSource={unpaidRecords}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
              />
            </Card>
          </Space>
        </TabPane>
      </Tabs>

      {/* 支付弹窗 */}
      <Modal
        title="费用结算"
        open={payModalVisible}
        onCancel={() => {
          setPayModalVisible(false);
          payForm.resetFields();
        }}
        onOk={() => payForm.submit()}
        okText="确认支付"
      >
        {selectedPayRecord && (
          <Form
            form={payForm}
            layout="vertical"
            onFinish={handleSubmitPay}
          >
            <Alert
              message={`费用：¥${parseFloat(selectedPayRecord.total_amount).toFixed(2)}`}
              type="info"
              style={{ marginBottom: 16 }}
            />
            
            {userAccount && (
              <Alert
                message={`账户余额：¥${parseFloat(userAccount.balance || 0).toFixed(2)}`}
                type={parseFloat(userAccount.balance || 0) >= parseFloat(selectedPayRecord.total_amount) ? 'success' : 'warning'}
                style={{ marginBottom: 16 }}
              />
            )}

            <Form.Item
              name="payment_method"
              label="支付方式"
              rules={[{ required: true, message: '请选择支付方式' }]}
            >
              <Radio.Group>
                <Radio value="balance">
                  <Space>
                    <WalletOutlined /> 账户余额支付
                    {userAccount && parseFloat(userAccount.balance || 0) < parseFloat(selectedPayRecord.total_amount) && (
                      <Tag color="red">余额不足</Tag>
                    )}
                  </Space>
                </Radio>
                <Radio value="cash">
                  <Space>
                    <DollarOutlined /> 现金支付
                  </Space>
                </Radio>
              </Radio.Group>
            </Form.Item>
          </Form>
        )}
      </Modal>

      <Modal
        title="完成使用并结算"
        open={completeModalVisible}
        onCancel={() => setCompleteModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitComplete}
        >
          <Form.Item
            name="duration_hours"
            label="实际使用时长（小时）"
            rules={[
              { required: true, message: '请输入使用时长' },
              { type: 'number', min: 0.5, message: '时长必须大于0.5小时' }
            ]}
          >
            <InputNumber 
              min={0.5} 
              step={0.5} 
              style={{ width: '100%' }}
              placeholder="请输入使用时长"
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              确认完成
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default ReceptionistDashboard;

