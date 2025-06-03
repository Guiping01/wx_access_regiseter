const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    console.log('获取手机号请求参数:', event)
    
    // 使用新的API方式 - 通过code获取手机号
    if (event.code) {
      console.log('使用新API方式获取手机号, code:', event.code)
      
      const result = await cloud.openapi.phonenumber.getPhoneNumber({
        code: event.code
      })
      
      console.log('调用官方API结果:', result)
      
      if (result && result.phoneInfo) {
        return {
          success: true,
          phoneNumber: result.phoneInfo.phoneNumber,
          purePhoneNumber: result.phoneInfo.purePhoneNumber,
          countryCode: result.phoneInfo.countryCode
        }
      } else {
        console.error('API返回格式异常:', result)
        return {
          success: false,
          error: 'API返回格式异常'
        }
      }
    }
    
    // 如果有cloudID，使用云开发方式
    if (event.cloudID) {
      console.log('使用cloudID方式获取手机号')
      const result = await cloud.openapi.cloudbase.getOpenData({
        list: [event.cloudID]
      })
      
      if (result && result.list && result.list[0] && result.list[0].data) {
        const phoneData = result.list[0].data
        return {
          success: true,
          phoneNumber: phoneData.phoneNumber,
          purePhoneNumber: phoneData.purePhoneNumber,
          countryCode: phoneData.countryCode
        }
      }
    }
    
    // 如果既没有code也没有cloudID，返回错误
    return {
      success: false,
      error: '缺少必要参数code或cloudID'
    }
    
  } catch (err) {
    console.error('获取手机号失败:', err)
    return {
      success: false,
      error: err.message,
      errCode: err.errCode
    }
  }
} 