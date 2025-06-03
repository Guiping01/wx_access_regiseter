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
    console.log('检查用户状态，openid:', wxContext.OPENID);
    
    // 根据openid查询用户信息
    const userResult = await db.collection('users').where({
      openid: wxContext.OPENID,
      status: 'active'
    }).get();

    if (userResult.data && userResult.data.length > 0) {
      // 用户已注册
      const userInfo = userResult.data[0];
      console.log('用户已存在:', userInfo);
      
      return {
        success: true,
        data: {
          _id: userInfo._id,
          name: userInfo.name,
          gender: userInfo.gender,
          age: userInfo.age,
          phone: userInfo.phone,
          isWxPhone: userInfo.isWxPhone,
          avatarUrl: userInfo.avatarUrl || 'https://tdesign.gtimg.com/site/avatar.jpg',
          createTime: userInfo.createTime,
          updateTime: userInfo.updateTime
        }
      };
    } else {
      // 用户未注册
      console.log('用户未注册');
      return {
        success: false,
        message: '用户未注册'
      };
    }

  } catch (error) {
    console.error('获取用户信息失败:', error);
    return {
      success: false,
      message: '获取用户信息失败'
    };
  }
}; 