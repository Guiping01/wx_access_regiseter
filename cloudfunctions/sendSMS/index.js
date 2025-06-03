// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 开发模式标识 - 生产环境请设置为false
const isDevelopment = true;

// 生成6位随机数字验证码
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { phone } = event;
  
  console.log('发送短信验证码:', phone);
  
  if (!phone) {
    return {
      success: false,
      message: '手机号不能为空'
    };
  }
  
  // 验证手机号格式
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return {
      success: false,
      message: '手机号格式不正确'
    };
  }
  
  try {
    // 生成验证码
    const code = generateCode();
    
    // 保存验证码到数据库（5分钟有效期）
    const expireTime = new Date(Date.now() + 5 * 60 * 1000);
    
    await db.collection('sms_codes').add({
      data: {
        phone,
        code,
        expireTime,
        used: false,
        createTime: new Date(),
        openid: wxContext.OPENID
      }
    });
    
    // 发送短信验证码
    const smsResult = await sendRealSMS(phone, code);
    
    if (!smsResult.success) {
      return {
        success: false,
        message: smsResult.message
      };
    }
    
    console.log(`验证码已生成 - 手机号: ${phone}, 验证码: ${code}`);
    
    // 返回结果
    const result = {
      success: true,
      message: isDevelopment ? '验证码发送成功（开发模式）' : '验证码发送成功'
    };

    // 开发环境下返回验证码，生产环境不返回
    if (isDevelopment) {
      result.data = {
        code: code,
        note: '这是开发模式，验证码会显示。生产环境请关闭此功能。'
      };
    }

    return result;
    
  } catch (error) {
    console.error('发送短信失败:', error);
    return {
      success: false,
      message: '发送失败，请稍后重试'
    };
  }
};

// 发送真实短信
async function sendRealSMS(phone, code) {
  try {
    if (isDevelopment) {
      // 开发模式：模拟发送成功
      console.log(`[开发模式] 发送验证码到 ${phone}: ${code}`);
      return {
        success: true,
        message: '开发模式：验证码模拟发送成功'
      };
    }

    // 生产模式：集成真实的短信服务
    // 示例：腾讯云短信服务
    /*
    const tencentcloud = require("tencentcloud-sdk-nodejs");
    const SmsClient = tencentcloud.sms.v20210111.Client;
    
    const client = new SmsClient({
      credential: {
        secretId: "your-secret-id",
        secretKey: "your-secret-key",
      },
      region: "ap-beijing",
    });
    
    const params = {
      PhoneNumberSet: [`+86${phone}`],
      SmsSdkAppId: "your-app-id",
      TemplateId: "your-template-id",
      TemplateParamSet: [code, "5"], // 验证码，有效期5分钟
    };
    
    const result = await client.SendSms(params);
    return {
      success: true,
      data: result
    };
    */

    // 如果还没配置真实短信服务，返回错误
    return {
      success: false,
      message: '短信服务尚未配置，请联系开发者'
    };

  } catch (error) {
    console.error('短信发送API错误:', error);
    return {
      success: false,
      message: '短信发送失败'
    };
  }
} 