App({
  onLaunch() {
    console.log('人员登记系统启动');
    
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud1-7giil3924402a7a3',
        traceUser: true
      });
      console.log('云开发初始化成功');
    }
    
    // 检查微信授权状态
    this.checkWechatAuth();
    
    // 初始化应用数据
    this.initAppData();
  },

  onShow() {
    console.log('应用进入前台');
  },

  onHide() {
    console.log('应用进入后台');
  },

  // 检查微信授权状态
  checkWechatAuth() {
    console.log('检查微信授权状态...');
    
    // 检查是否已有用户信息
    const userInfo = wx.getStorageSync('userInfo');
    
    if (!userInfo) {
      console.log('未检测到用户信息，需要微信授权');
      // 将授权状态保存到全局，供注册页使用
      this.globalData.needAuth = true;
    } else {
      console.log('已有用户信息:', userInfo);
      this.globalData.userInfo = userInfo;
      this.globalData.needAuth = false;
    }
  },

  // 执行微信授权
  doWechatAuth(callback) {
    console.log('开始微信授权流程...');
    
    wx.getUserProfile({
      desc: '用于完善用户信息',
      success: (res) => {
        console.log('微信授权成功:', res.userInfo);
        
        // 同时获取登录code
        wx.login({
          success: (loginRes) => {
            console.log('获取登录code成功:', loginRes.code);
            
            // 保存用户信息
            const userInfo = res.userInfo;
            wx.setStorageSync('userInfo', userInfo);
            wx.setStorageSync('loginCode', loginRes.code);
            wx.setStorageSync('isLoggedIn', true);
            
            // 更新全局数据
            this.globalData.userInfo = userInfo;
            this.globalData.needAuth = false;
            
            // 回调通知授权完成
            if (callback) callback(true, userInfo);
            
            wx.showToast({
              title: '授权成功',
              icon: 'success'
            });
          },
          fail: (err) => {
            console.error('获取登录code失败:', err);
            if (callback) callback(false, null);
          }
        });
      },
      fail: (err) => {
        console.log('用户拒绝授权:', err);
        if (callback) callback(false, null);
        
        wx.showModal({
          title: '授权提示',
          content: '需要获取您的基本信息才能使用小程序功能',
          showCancel: false,
          confirmText: '知道了'
        });
      }
    });
  },

  initAppData() {
    // 初始化全局数据
    this.globalData = {
      userInfo: null,
      needAuth: true,
      isAdmin: false,
      isLoggedIn: false,
      systemInfo: wx.getSystemInfoSync()
    };
  },

  // 全局数据
  globalData: {
    userInfo: null,
    needAuth: true,
    isAdmin: false,
    isLoggedIn: false,
    systemInfo: null
  }
}); 