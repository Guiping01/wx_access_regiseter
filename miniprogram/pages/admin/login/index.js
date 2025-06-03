Page({
  data: {
    formData: {
      username: '',
      password: ''
    },
    logging: false,
    canSubmit: false
  },

  onLoad() {
    console.log('管理员登录页面加载');
  },

  onUnload() {
    // 页面卸载时清理
  },

  onInputUsername(e) {
    this.setData({
      'formData.username': e.detail.value
    });
    this.updateSubmitState();
  },

  onInputPassword(e) {
    this.setData({
      'formData.password': e.detail.value
    });
    this.updateSubmitState();
  },

  updateSubmitState() {
    const { username, password } = this.data.formData;
    const canSubmit = username.trim().length > 0 && password.trim().length > 0;
    console.log('更新登录按钮状态:', { username, password, canSubmit });
    this.setData({
      canSubmit: canSubmit
    });
  },

  validateForm() {
    const { username, password } = this.data.formData;
    
    if (!username.trim()) {
      wx.showToast({
        title: '请输入账号',
        icon: 'none'
      });
      return false;
    }
    
    if (!password.trim()) {
      wx.showToast({
        title: '请输入密码',
        icon: 'none'
      });
      return false;
    }
    
    if (password.length < 6) {
      wx.showToast({
        title: '密码至少6位',
        icon: 'none'
      });
      return false;
    }
    
    return true;
  },

  onSubmit() {
    console.log('提交登录表单', {
      canSubmit: this.data.canSubmit,
      logging: this.data.logging,
      formData: this.data.formData
    });

    if (!this.data.canSubmit || this.data.logging) {
      console.log('表单验证失败或正在登录中');
      return;
    }

    if (!this.validateForm()) {
      console.log('表单验证失败');
      return;
    }

    this.setData({ logging: true });

    const { username, password } = this.data.formData;

    console.log('开始调用管理员登录云函数');

    // 调用管理员登录云函数
    wx.cloud.callFunction({
      name: 'adminLogin',
      data: {
        username: username.trim(),
        password: password.trim(),
        loginType: 'password'
      }
    }).then(res => {
      this.setData({ logging: false });
      console.log('管理员登录云函数返回结果:', res);
      
      if (res.result && res.result.success) {
        // 登录成功
        this.loginSuccess('password', res.result.data.adminInfo, res.result.data.token);
      } else {
        // 登录失败
        const message = res.result ? res.result.message : '登录失败';
        console.log('登录失败:', message);
        wx.showToast({
          title: message,
          icon: 'none',
          duration: 2000
        });
      }
    }).catch(err => {
      this.setData({ logging: false });
      console.error('管理员登录失败:', err);
      
      // 开发环境下提供测试账号
      if (username === 'admin' && password === '123456') {
        console.log('使用测试账号登录');
        this.loginSuccess('password', {
          username: 'admin',
          realName: '系统管理员',
          role: 'ADMIN',
          permissions: ['dashboard', 'user_management'],
          email: 'admin@example.com'
        }, 'test_admin_token');
        return;
      }
      
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none',
        duration: 2000
      });
    });
  },

  loginSuccess(method, adminInfo, token) {
    console.log('登录成功:', { method, adminInfo, token });
    
    // 存储登录状态和用户信息
    wx.setStorageSync('adminToken', token || 'mock_admin_token');
    wx.setStorageSync('adminInfo', adminInfo);
    wx.setStorageSync('userRole', adminInfo.role);
    wx.setStorageSync('loginMethod', method);
    wx.setStorageSync('isAdmin', true);
    
    wx.showToast({
      title: '登录成功',
      icon: 'success',
      duration: 1500,
      complete: () => {
        // 跳转到数据大屏
        setTimeout(() => {
          wx.redirectTo({
            url: '/pages/admin/dashboard/index'
          });
        }, 1500);
      }
    });
  },

  onForgotPassword() {
    wx.showModal({
      title: '找回密码',
      content: '请联系系统管理员重置密码\n\n联系方式：\n邮箱：admin@company.com\n电话：400-123-4567\n\n测试账号：admin / 123456',
      showCancel: false
    });
  }
}); 