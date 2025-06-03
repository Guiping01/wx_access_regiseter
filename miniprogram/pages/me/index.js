Page({
  data: {
    user: {
      avatarUrl: 'https://tdesign.gtimg.com/site/avatar.jpg',
      name: '张三',
      gender: 'male',
      age: 28,
      phone: '13800138000',
      registerTime: '2024-01-15'
    },
    logs: []
  },

  onLoad() {
    console.log('我的页面加载');
    this.loadUserData();
  },

  onShow() {
    console.log('我的页面显示');
    this.loadUserData();
  },

  // 加载用户数据
  async loadUserData() {
    try {
      // 调用云函数获取用户信息
      const { result } = await wx.cloud.callFunction({
        name: 'getUserInfo'
      });

      if (result && result.success && result.data) {
        const userData = result.data;
        console.log('获取用户数据:', userData);
        
        const userInfo = {
          name: userData.name,
          gender: userData.gender,
          age: userData.age,
          phone: userData.phone,
          avatarUrl: userData.avatarUrl || 'https://tdesign.gtimg.com/site/avatar.jpg',
          registerTime: this.formatDate(userData.createTime)
        };
        
        this.setData({ user: userInfo });
        
        // 加载开门记录
        this.loadOpenLogs();
        
      } else {
        // 用户未注册，跳转到注册页面
        console.log('用户未注册，跳转到注册页面');
        wx.showModal({
          title: '提示',
          content: '请先完成注册',
          showCancel: false,
          success: () => {
            wx.switchTab({
              url: '/pages/register/index'
            });
          }
        });
      }
    } catch (error) {
      console.error('加载用户数据失败:', error);
      wx.showToast({
        title: '加载数据失败',
        icon: 'none'
      });
    }
  },

  // 加载开门记录（近10日）
  async loadOpenLogs() {
    try {
      console.log('开始加载开门记录...');
      
      // 计算10日前的日期
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      
      console.log('查询开门记录，时间范围:', {
        startDate: tenDaysAgo.toISOString(),
        limit: 50
      });
      
      // 调用云函数获取开门记录
      const { result } = await wx.cloud.callFunction({
        name: 'getUserDoorLogs',
        data: {
          startDate: tenDaysAgo.toISOString(),
          limit: 50
        }
      });

      console.log('云函数返回结果:', result);

      if (result && result.success) {
        if (result.data && result.data.length > 0) {
          const logs = result.data.map(log => ({
            time: this.formatDateTime(log.createTime),
            deviceId: log.deviceId,
            deviceName: log.deviceName || '门禁设备',
            result: log.result === 'success' ? '成功' : '失败'
          }));
          
          this.setData({ logs });
          console.log('开门记录加载完成:', logs.length, '条');
        } else {
          console.log('返回的开门记录为空');
          this.setData({ logs: [] });
        }
      } else {
        console.log('云函数返回失败或无数据:', result);
        this.setData({ logs: [] });
      }
    } catch (error) {
      console.error('获取开门记录失败:', error);
      // 设置空数组而不是使用模拟数据
      this.setData({ logs: [] });
      
      wx.showToast({
        title: '开门记录加载失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 选择头像
  onChooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        
        wx.showLoading({ title: '上传头像中...' });
        
        // 上传到云存储
        wx.cloud.uploadFile({
          cloudPath: `avatars/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`,
          filePath: tempFilePath,
          success: (uploadRes) => {
            console.log('头像上传成功:', uploadRes.fileID);
            
            // 更新用户头像
            this.updateUserAvatar(uploadRes.fileID);
          },
          fail: (err) => {
            wx.hideLoading();
            console.error('头像上传失败:', err);
            wx.showToast({
              title: '头像上传失败',
              icon: 'none'
            });
          }
        });
      },
      fail: (err) => {
        console.error('选择头像失败:', err);
        wx.showToast({
          title: '选择头像失败',
          icon: 'none'
        });
      }
    });
  },

  // 更新用户头像
  async updateUserAvatar(avatarUrl) {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'updateUserAvatar',
        data: {
          avatarUrl: avatarUrl
        }
      });

      wx.hideLoading();

      if (result && result.success) {
        // 更新本地数据
        this.setData({
          'user.avatarUrl': avatarUrl
        });
        
        wx.showToast({
          title: '头像更新成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: '头像更新失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('更新头像失败:', error);
      wx.showToast({
        title: '头像更新失败',
        icon: 'none'
      });
    }
  },

  // 编辑资料
  onEdit() {
    wx.showModal({
      title: '编辑提示',
      content: '当前版本只支持更换头像，其他信息如需修改请联系管理员',
      confirmText: '更换头像',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.onChooseAvatar();
        }
      }
    });
  },

  // 管理员入口（长按触发）
  onAdminEntrance() {
    wx.showModal({
      title: '管理员入口',
      content: '确定要进入管理后台吗？',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: '/pages/admin/login/index'
          });
        }
      }
    });
  },

  // 格式化日期
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  // 格式化日期时间
  formatDateTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadUserData();
    wx.stopPullDownRefresh();
  }
}); 