// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  
  try {
    const { deviceId = 'LOCK-01', location = '北京市朝阳区' } = event;

    console.log('开门请求:', { openid: wxContext.OPENID, deviceId, location });

    // 获取用户信息
    const userResult = await db.collection('users').where({
      openid: wxContext.OPENID,
      status: 'active'
    }).get();

    if (!userResult.data || userResult.data.length === 0) {
      return {
        success: false,
        message: '用户不存在或已被禁用'
      };
    }

    const user = userResult.data[0];
    console.log('用户信息:', { userId: user._id, name: user.name });

    // 模拟门禁系统API调用
    const doorResult = await callRealDoorSystem(deviceId);
    
    // 记录开门日志
    const logData = {
      userId: user._id,
      openId: wxContext.OPENID,
      userName: user.name,
      deviceId: deviceId,
      deviceName: getDeviceName(deviceId),
      action: 'door_access',
      result: doorResult.success ? 'success' : 'failed',
      status: doorResult.success ? 'success' : 'failed',
      latency: doorResult.latency,
      responseTime: doorResult.latency,
      location: location,
      ipAddress: '192.168.1.100',
      userAgent: 'MiniProgram/DoorAccess',
      description: doorResult.success ? '开门成功' : '开门失败',
      errorCode: doorResult.errorCode || null,
      errorMessage: doorResult.errorMessage || null,
      createTime: new Date(),
      updateTime: new Date()
    };

    // 插入开门记录
    const logResult = await db.collection('door_logs').add({
      data: logData
    });

    console.log('开门记录已保存:', logResult._id);

    return {
      success: doorResult.success,
      message: doorResult.message,
      data: {
        logId: logResult._id,
        deviceName: logData.deviceName,
        latency: doorResult.latency,
        timestamp: logData.createTime
      }
    };

  } catch (error) {
    console.error('开门处理失败:', error);
    
    // 即使出错也要记录失败日志
    try {
      const userResult = await db.collection('users').where({
        openid: wxContext.OPENID
      }).get();
      
      if (userResult.data && userResult.data.length > 0) {
        const user = userResult.data[0];
        await db.collection('door_logs').add({
          data: {
            userId: user._id,
            openId: wxContext.OPENID,
            userName: user.name,
            deviceId: event.deviceId || 'LOCK-01',
            deviceName: getDeviceName(event.deviceId || 'LOCK-01'),
            action: 'door_access',
            result: 'failed',
            status: 'error',
            latency: 0,
            responseTime: 0,
            location: event.location || '北京市朝阳区',
            errorCode: 'SYSTEM_ERROR',
            errorMessage: error.message,
            description: '系统错误导致开门失败',
            createTime: new Date(),
            updateTime: new Date()
          }
        });
      }
    } catch (logError) {
      console.error('记录错误日志失败:', logError);
    }

    return {
      success: false,
      message: '门禁系统故障，请联系管理员'
    };
  }
};

// 调用真实门禁系统API
async function callRealDoorSystem(deviceId) {
  return new Promise((resolve) => {
    // 模拟API调用延迟
    const latency = Math.floor(Math.random() * 300) + 100; // 100-400ms
    
    setTimeout(() => {
      // 85%成功率，模拟真实场景
      const success = Math.random() > 0.15;
      
      if (success) {
        resolve({
          success: true,
          message: '开门成功',
          latency: latency
        });
      } else {
        // 随机失败原因
        const failureReasons = [
          { code: 'NETWORK_TIMEOUT', message: '网络超时' },
          { code: 'DEVICE_BUSY', message: '设备繁忙' },
          { code: 'PERMISSION_DENIED', message: '权限不足' },
          { code: 'DEVICE_OFFLINE', message: '设备离线' }
        ];
        
        const failure = failureReasons[Math.floor(Math.random() * failureReasons.length)];
        
        resolve({
          success: false,
          message: failure.message,
          latency: latency,
          errorCode: failure.code,
          errorMessage: failure.message
        });
      }
    }, latency);
  });
}

// 获取设备名称
function getDeviceName(deviceId) {
  const deviceMap = {
    'LOCK-01': '办公楼大门',
    'LOCK-02': '侧门',
    'LOCK-03': '后门',
    'main_entrance_001': '主入口',
    'test_device_001': '测试设备'
  };
  
  return deviceMap[deviceId] || '门禁设备';
} 