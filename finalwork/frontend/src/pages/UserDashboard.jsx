import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tabs, Card, Row, Col, Button, Table, Tag, Space, Select, DatePicker, Modal, Form, message, Empty, Descriptions, TimePicker, Rate, Input } from 'antd';
import { 
  CalendarOutlined, 
  SearchOutlined, 
  PlusOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  EditOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { 
  getAllVenues, 
  getSubVenues, 
  getAvailableTimes, 
  getRemainingCapacity,
  createReservation, 
  getAllReservations, 
  cancelReservation,
  updateReservationStatus,
  updateReservation,
  getReservationById,
  createReview,
  getAllReviews
} from '../services/api';

const { TabPane } = Tabs;

function UserDashboard({ user, tab = 'venues' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(tab);
  const [venues, setVenues] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState(null);
  const [reservationSearchText, setReservationSearchText] = useState('');
  const [reservationStatusFilter, setReservationStatusFilter] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [subVenues, setSubVenues] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [remainingCapacity, setRemainingCapacity] = useState(null);
  const [selectedSubVenue, setSelectedSubVenue] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewingReservation, setReviewingReservation] = useState(null);
  const [reviewForm] = Form.useForm();

  // 根据URL路径确定当前tab
  useEffect(() => {
    if (location.pathname === '/user/reservations') {
      setActiveTab('reservations');
    } else if (location.pathname === '/user') {
      setActiveTab('venues');
    }
  }, [location.pathname]);

  // 当tab prop变化时，更新activeTab
  useEffect(() => {
    if (tab) {
      setActiveTab(tab);
    }
  }, [tab]);

  useEffect(() => {
    if (activeTab === 'venues') {
      loadVenues();
    } else if (activeTab === 'reservations') {
      loadReservations();
    }
  }, [activeTab, filterType, reservationStatusFilter]);

  const loadVenues = async () => {
    setLoading(true);
    try {
      const params = filterType ? { type: filterType } : {};
      const data = await getAllVenues(params);
      setVenues(data.filter(v => v.status === 'available'));
    } catch (error) {
      message.error('加载场馆失败');
    } finally {
      setLoading(false);
    }
  };

  const loadReservations = async () => {
    setLoading(true);
    try {
      const params = { user_id: user.id };
      if (reservationStatusFilter) {
        params.status = reservationStatusFilter;
      }
      const data = await getAllReservations(params);
      setReservations(data || []);
    } catch (error) {
      message.error('加载预约失败');
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVenueClick = async (venue) => {
    setSelectedVenue(venue);
    setSelectedSubVenue(null);
    setSelectedDate(null);
    setAvailableTimes([]);
    setRemainingCapacity(null);
    
    try {
      // 加载子场地
      const subs = await getSubVenues(venue.id);
      setSubVenues(subs);
      
      // 如果是游泳馆，加载剩余容量
      if (venue.type === '游泳馆') {
        const today = dayjs().format('YYYY-MM-DD');
        const capacity = await getRemainingCapacity(venue.id, today);
        setRemainingCapacity(capacity);
      }
      
      setModalVisible(true);
    } catch (error) {
      message.error('加载子场地失败');
    }
  };

  const handleSubVenueSelect = async (subVenueId) => {
    setSelectedSubVenue(subVenueId);
    const dateToUse = selectedDate || editForm.getFieldValue('reservation_date')?.format('YYYY-MM-DD');
    if (dateToUse) {
      await loadAvailableTimes(subVenueId, dateToUse);
    }
  };

  const handleDateSelect = async (date) => {
    const dateStr = date.format('YYYY-MM-DD');
    setSelectedDate(dateStr);
    const subVenueToUse = selectedSubVenue || editForm.getFieldValue('sub_venue_id');
    if (subVenueToUse) {
      await loadAvailableTimes(subVenueToUse, dateStr);
    }
    
    // 如果是游泳馆，更新剩余容量
    const venueToUse = selectedVenue;
    if (venueToUse?.type === '游泳馆') {
      const capacity = await getRemainingCapacity(venueToUse.id, dateStr);
      setRemainingCapacity(capacity);
    }
  };

  const loadAvailableTimes = async (subVenueId, date) => {
    try {
      const data = await getAvailableTimes(selectedVenue.id, subVenueId, date);
      setAvailableTimes(data.availableSlots || []);
    } catch (error) {
      message.error('加载可用时间失败');
    }
  };

  const handleSubmitReservation = async (values) => {
    if (!selectedSubVenue) {
      message.error('请选择子场地');
      return;
    }
    
    try {
      await createReservation({
        user_id: user.id,
        venue_id: selectedVenue.id,
        sub_venue_id: selectedSubVenue,
        reservation_date: values.reservation_date.format('YYYY-MM-DD'),
        start_time: values.start_time.format('HH:mm'),
        end_time: values.end_time.format('HH:mm')
      });
      message.success('预约成功！');
      setModalVisible(false);
      loadReservations();
    } catch (error) {
      message.error(error.response?.data?.error || '预约失败');
    }
  };

  const handleCancel = async (id) => {
    try {
      await cancelReservation(id);
      message.success('预约已取消');
      loadReservations();
    } catch (error) {
      message.error('取消失败');
    }
  };

  const handleConfirm = async (id) => {
    try {
      await updateReservationStatus(id, 'confirmed');
      message.success('预约已确认');
      loadReservations();
    } catch (error) {
      message.error('确认失败');
    }
  };

  const handleEdit = async (reservation) => {
    try {
      // 获取预约详情
      const reservationDetail = await getReservationById(reservation.id);
      setEditingReservation(reservationDetail);
      
      // 加载场馆和子场地信息
      const venueData = await getAllVenues({ id: reservationDetail.venue_id });
      if (venueData.length > 0) {
        setSelectedVenue(venueData[0]);
        const subVenuesData = await getSubVenues({ venue_id: reservationDetail.venue_id });
        setSubVenues(subVenuesData);
      }
      
      // 设置表单初始值
      editForm.setFieldsValue({
        reservation_date: dayjs(reservationDetail.reservation_date),
        start_time: dayjs(reservationDetail.start_time, 'HH:mm'),
        end_time: dayjs(reservationDetail.end_time, 'HH:mm'),
        sub_venue_id: reservationDetail.sub_venue_id
      });
      
      setSelectedSubVenue(reservationDetail.sub_venue_id);
      setSelectedDate(reservationDetail.reservation_date);
      
      // 加载可用时间
      if (reservationDetail.sub_venue_id && reservationDetail.reservation_date) {
        await loadAvailableTimes(reservationDetail.sub_venue_id, reservationDetail.reservation_date);
      }
      
      setEditModalVisible(true);
    } catch (error) {
      message.error('加载预约信息失败');
    }
  };

  const handleUpdateReservation = async (values) => {
    if (!editingReservation) return;
    
    try {
      await updateReservation(editingReservation.id, {
        venue_id: editingReservation.venue_id,
        sub_venue_id: values.sub_venue_id,
        reservation_date: values.reservation_date.format('YYYY-MM-DD'),
        start_time: values.start_time.format('HH:mm'),
        end_time: values.end_time.format('HH:mm')
      });
      message.success('预约修改成功，需要重新确认');
      setEditModalVisible(false);
      editForm.resetFields();
      setEditingReservation(null);
      loadReservations();
    } catch (error) {
      message.error(error.response?.data?.error || '修改失败');
    }
  };

  const handleReview = async (reservation) => {
    // 检查是否已经评价过
    try {
      const reviews = await getAllReviews({ reservation_id: reservation.id });
      if (reviews && reviews.length > 0) {
        message.info('您已经评价过该预约');
        return;
      }
    } catch (error) {
      console.error('检查评价失败:', error);
    }
    
    setReviewingReservation(reservation);
    reviewForm.resetFields();
    setReviewModalVisible(true);
  };

  const handleSubmitReview = async (values) => {
    if (!reviewingReservation) return;
    
    try {
      await createReview({
        user_id: user.id,
        venue_id: reviewingReservation.venue_id,
        reservation_id: reviewingReservation.id,
        rating: values.rating,
        comment: values.comment
      });
      message.success('评价提交成功');
      setReviewModalVisible(false);
      reviewForm.resetFields();
      setReviewingReservation(null);
      loadReservations();
    } catch (error) {
      message.error(error.response?.data?.error || '评价失败');
    }
  };

  const getStatusTag = (status) => {
    const statusMap = {
      pending: { color: 'orange', text: '待确认', icon: <ClockCircleOutlined /> },
      confirmed: { color: 'blue', text: '已确认', icon: <CheckCircleOutlined /> },
      in_use: { color: 'green', text: '使用中', icon: <CheckCircleOutlined /> },
      completed: { color: 'default', text: '已完成', icon: <CheckCircleOutlined /> },
      cancelled: { color: 'red', text: '已取消', icon: <CloseCircleOutlined /> }
    };
    const config = statusMap[status] || statusMap.pending;
    return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
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
      render: (status) => getStatusTag(status),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && (
            <>
              <Button 
                type="primary" 
                size="small" 
                onClick={() => handleConfirm(record.id)}
              >
                确认
              </Button>
              <Button 
                size="small" 
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              >
                修改
              </Button>
              <Button 
                size="small" 
                danger 
                onClick={() => handleCancel(record.id)}
              >
                取消
              </Button>
            </>
          )}
          {record.status === 'confirmed' && (
            <>
              <Button 
                size="small" 
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              >
                修改
              </Button>
              <Button 
                size="small" 
                danger 
                onClick={() => handleCancel(record.id)}
              >
                取消
              </Button>
            </>
          )}
          {record.status === 'completed' && (
            <Button 
              size="small" 
              type="primary"
              icon={<StarOutlined />}
              onClick={() => handleReview(record)}
            >
              评价
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Tabs 
        activeKey={activeTab} 
        onChange={(key) => {
          setActiveTab(key);
          // 同步更新URL
          if (key === 'reservations') {
            navigate('/user/reservations');
          } else {
            navigate('/user');
          }
        }}
      >
        <TabPane tab="场馆浏览" key="venues">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card>
              <Space>
                <span>筛选类型：</span>
                <Select
                  style={{ width: 150 }}
                  placeholder="全部类型"
                  allowClear
                  value={filterType}
                  onChange={setFilterType}
                >
                  <Select.Option value="篮球场">篮球场</Select.Option>
                  <Select.Option value="足球场">足球场</Select.Option>
                  <Select.Option value="羽毛球场">羽毛球场</Select.Option>
                  <Select.Option value="网球场">网球场</Select.Option>
                  <Select.Option value="乒乓球场">乒乓球场</Select.Option>
                  <Select.Option value="游泳馆">游泳馆</Select.Option>
                </Select>
                <Button icon={<SearchOutlined />} onClick={loadVenues}>
                  刷新
                </Button>
              </Space>
            </Card>

            {venues.length === 0 ? (
              <Empty description="暂无可用场馆" />
            ) : (
              <Row gutter={[16, 16]}>
                {venues.map(venue => (
                  <Col xs={24} sm={12} lg={8} key={venue.id}>
                    <Card
                      hoverable
                      style={{ height: '100%' }}
                      actions={[
                        <Button 
                          type="primary" 
                          icon={<PlusOutlined />}
                          onClick={() => handleVenueClick(venue)}
                        >
                          查看详情
                        </Button>
                      ]}
                    >
                      <Card.Meta
                        title={venue.name}
                        description={
                          <Space direction="vertical" size="small" style={{ width: '100%' }}>
                            <div>
                              <Tag color="blue">{venue.type}</Tag>
                              <Tag color="green">¥{venue.price_per_hour}/小时</Tag>
                            </div>
                            <div style={{ color: '#666', fontSize: 12 }}>
                              {venue.description || '标准场地'}
                            </div>
                            <div style={{ color: '#999', fontSize: 12 }}>
                              开放时间：8:00-12:00, 14:00-22:00
                            </div>
                          </Space>
                        }
                      />
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Space>
        </TabPane>

        <TabPane tab="我的预约" key="reservations">
          <Card style={{ marginBottom: 16 }}>
            <Space>
              <Input.Search
                placeholder="搜索场馆名称"
                value={reservationSearchText}
                onChange={(e) => setReservationSearchText(e.target.value)}
                style={{ width: 200 }}
                allowClear
              />
              <Select
                placeholder="筛选状态"
                style={{ width: 150 }}
                allowClear
                value={reservationStatusFilter}
                onChange={setReservationStatusFilter}
              >
                <Select.Option value="pending">待确认</Select.Option>
                <Select.Option value="confirmed">已确认</Select.Option>
                <Select.Option value="in_use">使用中</Select.Option>
                <Select.Option value="completed">已完成</Select.Option>
                <Select.Option value="cancelled">已取消</Select.Option>
              </Select>
              <Button onClick={loadReservations}>刷新</Button>
            </Space>
          </Card>
          <Table
            columns={reservationColumns}
            dataSource={reservations.filter(r => {
              if (reservationSearchText && !r.venue_name?.toLowerCase().includes(reservationSearchText.toLowerCase())) {
                return false;
              }
              return true;
            })}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </TabPane>
      </Tabs>

      <Modal
        title={`预约 ${selectedVenue?.name}`}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setSelectedSubVenue(null);
          setSelectedDate(null);
          setAvailableTimes([]);
        }}
        footer={null}
        width={700}
      >
        {selectedVenue && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="场馆类型">{selectedVenue.type}</Descriptions.Item>
              <Descriptions.Item label="价格">¥{selectedVenue.price_per_hour}/小时</Descriptions.Item>
              <Descriptions.Item label="开放时间" span={2}>
                8:00-12:00, 14:00-22:00
              </Descriptions.Item>
            </Descriptions>

            {selectedVenue.type === '游泳馆' && remainingCapacity && (
              <Card size="small" title="剩余容量">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="总容量">{remainingCapacity.totalCapacity}人</Descriptions.Item>
                  <Descriptions.Item label="剩余容量">
                    <Tag color={remainingCapacity.remainingCapacity > 0 ? 'green' : 'red'}>
                      {remainingCapacity.remainingCapacity}人
                    </Tag>
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmitReservation}
            >
              <Form.Item
                name="reservation_date"
                label="预约日期"
                rules={[{ required: true, message: '请选择预约日期' }]}
              >
                <DatePicker 
                  style={{ width: '100%' }}
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                  onChange={handleDateSelect}
                />
              </Form.Item>

              <Form.Item label="选择子场地" required>
                <Select
                  placeholder="请选择子场地"
                  value={selectedSubVenue}
                  onChange={handleSubVenueSelect}
                >
                  {subVenues.map(sv => (
                    <Select.Option key={sv.id} value={sv.id}>
                      {sv.name} {sv.capacity > 1 ? `(容量: ${sv.capacity}人)` : ''}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              {selectedSubVenue && selectedDate && availableTimes.length > 0 && (
                <Form.Item label="可用时间段">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {availableTimes.map((slot, index) => (
                      <Tag key={index} color="green" style={{ padding: '4px 8px', cursor: 'pointer' }}>
                        {slot.start} - {slot.end}
                      </Tag>
                    ))}
                  </div>
                </Form.Item>
              )}

              <Form.Item
                name="start_time"
                label="开始时间"
                rules={[{ required: true, message: '请选择开始时间' }]}
              >
                <TimePicker 
                  format="HH:mm"
                  style={{ width: '100%' }}
                  minuteStep={60}
                  disabledHours={() => {
                    // 禁用非开放时间：0-7, 12-13, 22-23
                    return [...Array(8).keys(), 12, 13, ...Array.from({length: 2}, (_, i) => 22 + i)];
                  }}
                />
              </Form.Item>

              <Form.Item
                name="end_time"
                label="结束时间"
                rules={[{ required: true, message: '请选择结束时间' }]}
              >
                <TimePicker 
                  format="HH:mm"
                  style={{ width: '100%' }}
                  minuteStep={60}
                  disabledHours={() => {
                    return [...Array(8).keys(), 12, 13, ...Array.from({length: 2}, (_, i) => 22 + i)];
                  }}
                />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" block>
                  确认预约
                </Button>
              </Form.Item>
            </Form>
          </Space>
        )}
      </Modal>

      {/* 修改预约模态框 */}
      <Modal
        title={`修改预约 - ${editingReservation?.venue_name}`}
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setEditingReservation(null);
          setSelectedSubVenue(null);
          setSelectedDate(null);
          setAvailableTimes([]);
        }}
        footer={null}
        width={700}
      >
        {editingReservation && selectedVenue && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="场馆类型">{selectedVenue.type}</Descriptions.Item>
              <Descriptions.Item label="价格">¥{selectedVenue.price_per_hour}/小时</Descriptions.Item>
              <Descriptions.Item label="开放时间" span={2}>
                8:00-12:00, 14:00-22:00
              </Descriptions.Item>
            </Descriptions>

            {selectedVenue.type === '游泳馆' && remainingCapacity && (
              <Card size="small" title="剩余容量">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="总容量">{remainingCapacity.totalCapacity}人</Descriptions.Item>
                  <Descriptions.Item label="剩余容量">
                    <Tag color={remainingCapacity.remainingCapacity > 0 ? 'green' : 'red'}>
                      {remainingCapacity.remainingCapacity}人
                    </Tag>
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}

            <Form
              form={editForm}
              layout="vertical"
              onFinish={handleUpdateReservation}
            >
              <Form.Item
                name="reservation_date"
                label="预约日期"
                rules={[{ required: true, message: '请选择预约日期' }]}
              >
                <DatePicker 
                  style={{ width: '100%' }}
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                  onChange={handleDateSelect}
                />
              </Form.Item>

              <Form.Item
                name="sub_venue_id"
                label="选择子场地"
                rules={[{ required: true, message: '请选择子场地' }]}
              >
                <Select
                  placeholder="请选择子场地"
                  onChange={handleSubVenueSelect}
                >
                  {subVenues.map(sv => (
                    <Select.Option key={sv.id} value={sv.id}>
                      {sv.name} {sv.capacity > 1 ? `(容量: ${sv.capacity}人)` : ''}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              {selectedSubVenue && selectedDate && availableTimes.length > 0 && (
                <Form.Item label="可用时间段">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {availableTimes.map((slot, index) => (
                      <Tag key={index} color="green" style={{ padding: '4px 8px', cursor: 'pointer' }}>
                        {slot.start} - {slot.end}
                      </Tag>
                    ))}
                  </div>
                </Form.Item>
              )}

              <Form.Item
                name="start_time"
                label="开始时间"
                rules={[{ required: true, message: '请选择开始时间' }]}
              >
                <TimePicker 
                  format="HH:mm"
                  style={{ width: '100%' }}
                  minuteStep={60}
                  disabledHours={() => {
                    return [...Array(8).keys(), 12, 13, ...Array.from({length: 2}, (_, i) => 22 + i)];
                  }}
                />
              </Form.Item>

              <Form.Item
                name="end_time"
                label="结束时间"
                rules={[{ required: true, message: '请选择结束时间' }]}
              >
                <TimePicker 
                  format="HH:mm"
                  style={{ width: '100%' }}
                  minuteStep={60}
                  disabledHours={() => {
                    return [...Array(8).keys(), 12, 13, ...Array.from({length: 2}, (_, i) => 22 + i)];
                  }}
                />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" block>
                  确认修改
                </Button>
              </Form.Item>
            </Form>
          </Space>
        )}
      </Modal>

      {/* 评价模态框 */}
      <Modal
        title={`评价预约 - ${reviewingReservation?.venue_name}`}
        open={reviewModalVisible}
        onCancel={() => {
          setReviewModalVisible(false);
          reviewForm.resetFields();
          setReviewingReservation(null);
        }}
        footer={null}
        width={500}
      >
        {reviewingReservation && (
          <Form
            form={reviewForm}
            layout="vertical"
            onFinish={handleSubmitReview}
          >
            <Form.Item label="预约信息">
              <div>
                <div>场馆：{reviewingReservation.venue_name}</div>
                <div>日期：{reviewingReservation.reservation_date}</div>
                <div>时间：{reviewingReservation.start_time} - {reviewingReservation.end_time}</div>
              </div>
            </Form.Item>

            <Form.Item
              name="rating"
              label="评分"
              rules={[{ required: true, message: '请选择评分' }]}
            >
              <Rate />
            </Form.Item>

            <Form.Item
              name="comment"
              label="评价内容（可选）"
            >
              <Input.TextArea
                rows={4}
                placeholder="请输入您的评价"
                maxLength={500}
                showCount
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block>
                提交评价
              </Button>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}

export default UserDashboard;
