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
    const { 
      name, 
      gender, 
      age, 
      phone, 
      avatarUrl, 
      smsCode, 
      isWxPhone 
    } = event;

    // 参数验证
    if (!name || !gender || !age || !phone) {
      return {
        success: false,
        message: '请填写完整信息'
      };
    }

    // 手机号格式验证
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return {
        success: false,
        message: '手机号格式不正确'
      };
    }

    // 年龄验证
    if (age < 1 || age > 120) {
      return {
        success: false,
        message: '年龄必须在1-120之间'
      };
    }

    // 手动输入的手机号需要验证短信验证码
    if (!isWxPhone) {
      if (!smsCode || smsCode.length !== 6) {
        return {
          success: false,
          message: '请输入6位验证码'
        };
      }
      
      // 验证短信验证码（这里应该与实际的短信服务集成）
      const smsResult = await verifySMSCode(phone, smsCode);
      if (!smsResult.success) {
        return {
          success: false,
          message: smsResult.message
        };
      }
    }

    // 检查手机号是否已注册
    const existingUser = await db.collection('users').where({
      phone: phone
    }).get();

    if (existingUser.data.length > 0) {
      return {
        success: false,
        message: '该手机号已注册'
      };
    }

    // 创建用户记录
    const userData = {
      openid: wxContext.OPENID,
      name: name,
      gender: gender,
      age: parseInt(age),
      phone: phone,
      avatarUrl: avatarUrl || 'https://tdesign.gtimg.com/site/avatar.jpg',
      isWxPhone: isWxPhone,
      status: 'active',
      registerTime: new Date(),
      lastLoginTime: new Date(),
      createBy: wxContext.OPENID,
      updateBy: wxContext.OPENID,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    };

    const result = await db.collection('users').add({
      data: userData
    });

    if (result._id) {
      return {
        success: true,
        message: '注册成功',
        data: {
          userId: result._id,
          userInfo: {
            name: userData.name,
            gender: userData.gender,
            age: userData.age,
            phone: userData.phone,
            avatarUrl: userData.avatarUrl,
            registerTime: userData.registerTime
          }
        }
      };
    } else {
      return {
        success: false,
        message: '注册失败，请重试'
      };
    }

  } catch (error) {
    console.error('用户注册错误:', error);
    return {
      success: false,
      message: '服务器错误，请稍后重试'
    };
  }
};

// 验证短信验证码
async function verifySMSCode(phone, code) {
  try {
    // 从数据库获取验证码记录
    const smsRecords = await db.collection('sms_codes').where({
      phone: phone,
      code: code,
      used: false
    }).orderBy('createTime', 'desc').limit(1).get();

    if (smsRecords.data.length === 0) {
      return {
        success: false,
        message: '验证码错误或已过期'
      };
    }

    const smsRecord = smsRecords.data[0];
    const now = new Date();
    const codeTime = new Date(smsRecord.createTime);
    const timeDiff = (now - codeTime) / 1000 / 60; // 分钟

    // 验证码5分钟有效期
    if (timeDiff > 5) {
      return {
        success: false,
        message: '验证码已过期'
      };
    }

    // 标记验证码为已使用
    await db.collection('sms_codes').doc(smsRecord._id).update({
      data: {
        used: true,
        usedTime: db.serverDate()
      }
    });

    return {
      success: true,
      message: '验证码验证成功'
    };

  } catch (error) {
    console.error('验证码验证错误:', error);
    return {
      success: false,
      message: '验证码验证失败'
    };
  }
} 