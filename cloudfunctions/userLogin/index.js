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
    const { phone } = event;

    // 参数验证
    if (!phone) {
      return {
        success: false,
        message: '请提供手机号'
      };
    }

    // 查找用户
    const userResult = await db.collection('users').where({
      phone: phone
    }).get();

    if (userResult.data.length === 0) {
      return {
        success: false,
        message: '用户不存在，请先注册'
      };
    }

    const userData = userResult.data[0];

    // 检查用户状态
    if (userData.status !== 'active') {
      return {
        success: false,
        message: '账号已被禁用，请联系管理员'
      };
    }

    // 更新最后登录时间
    await db.collection('users').doc(userData._id).update({
      data: {
        lastLoginTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    });

    // 记录登录日志
    await db.collection('login_logs').add({
      data: {
        userId: userData._id,
        openid: wxContext.OPENID,
        phone: phone,
        loginTime: db.serverDate(),
        loginType: 'phone',
        deviceInfo: event.deviceInfo || {},
        createTime: db.serverDate()
      }
    });

    return {
      success: true,
      message: '登录成功',
      data: {
        userId: userData._id,
        userInfo: {
          name: userData.name,
          gender: userData.gender,
          age: userData.age,
          phone: userData.phone,
          avatarUrl: userData.avatarUrl,
          registerTime: userData.registerTime,
          lastLoginTime: userData.lastLoginTime
        }
      }
    };

  } catch (error) {
    console.error('用户登录错误:', error);
    return {
      success: false,
      message: '服务器错误，请稍后重试'
    };
  }
}; 