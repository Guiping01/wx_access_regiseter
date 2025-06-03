Page({
  data: {
    overview: {
      totalVisitors: 0,
      todayVisitors: 0,
      successRate: 0,
      avgLatency: 0
    },
    weeklyData: [],
    monthlyStats: {
      dailyAvg: 0,
      monthlyTotal: 0
    },
    genderStats: {
      male: 0,
      female: 0
    },
    ageDistribution: [],
    peakHours: [],
    maxWeeklyCount: 0,
    maxAgeCount: 0,
    yAxisLabels: [],
    exporting: false,
    loading: false,
    adminInfo: null
  },

  onLoad() {
    // 检查管理员登录状态
    this.checkAdminAuth();
    this.loadDashboardData();
  },

  checkAdminAuth() {
    const adminToken = wx.getStorageSync('adminToken');
    const adminInfo = wx.getStorageSync('adminInfo');
    const userRole = wx.getStorageSync('userRole');

    if (!adminToken || !adminInfo) {
      wx.showModal({
        title: '权限验证失败',
        content: '请重新登录管理后台',
        showCancel: false,
        success: () => {
          wx.redirectTo({
            url: '/pages/admin/login/index'
          });
        }
      });
      return;
    }

    // 检查权限
    if (!adminInfo.permissions || !adminInfo.permissions.includes('dashboard')) {
      wx.showModal({
        title: '权限不足',
        content: '您没有访问数据大屏的权限',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
      return;
    }

    this.setData({ adminInfo });
  },

  onLogout() {
    const adminInfo = this.data.adminInfo;
    const adminName = adminInfo ? adminInfo.realName || adminInfo.username : '管理员';
    
    wx.showModal({
      title: '确认退出',
      content: `${adminName}，确定要退出管理后台吗？`,
      success: (res) => {
        if (res.confirm) {
          // 清除管理员登录状态
          wx.removeStorageSync('adminToken');
          wx.removeStorageSync('adminInfo');
          wx.removeStorageSync('userRole');
          wx.removeStorageSync('loginMethod');
          wx.removeStorageSync('isAdmin');
          
          wx.reLaunch({
            url: '/pages/register/index'
          });
        }
      }
    });
  },

  loadDashboardData() {
    this.setData({ loading: true });
    
    // 调用云函数获取dashboard数据，不传筛选参数
    wx.cloud.callFunction({
      name: 'getDashboardData',
      data: {}
    }).then(res => {
      this.setData({ loading: false });
      
      if (res.result && res.result.success) {
        const data = res.result.data;
        console.log('云函数返回的数据:', data);
        
        // 直接处理返回的数据
        this.processRealData(data);
      } else {
        console.error('数据获取失败:', res.result);
        // 使用模拟数据作为fallback
        this.loadEnhancedMockData();
        wx.showToast({
          title: '数据获取失败，使用模拟数据',
          icon: 'none',
          duration: 2000
        });
      }
    }).catch(err => {
      this.setData({ loading: false });
      console.error('Dashboard数据加载失败:', err);
      
      // 使用模拟数据作为fallback
      this.loadEnhancedMockData();
      wx.showToast({
        title: '数据加载失败，使用模拟数据',
        icon: 'none',
        duration: 2000
      });
    });
  },

  // 处理真实数据
  processRealData(data) {
    // 计算最大值用于图表显示
    const maxWeeklyCount = Math.max(...data.weeklyData.map(item => item.count), 1);
    const maxAgeCount = Math.max(...data.ageDistribution.map(item => item.count), 1);
    
    // 处理折线图数据
    const processedWeeklyData = this.processLineChartData(data.weeklyData, maxWeeklyCount);
    const yAxisLabels = this.generateYAxisLabels(maxWeeklyCount);
    
    this.setData({
      overview: data.overview,
      weeklyData: processedWeeklyData,
      monthlyStats: data.monthlyStats,
      genderStats: data.genderStats,
      ageDistribution: data.ageDistribution,
      peakHours: data.peakHours,
      maxWeeklyCount,
      maxAgeCount,
      yAxisLabels
    });
  },

  // 增强的模拟数据
  loadEnhancedMockData() {
    const mockData = {
      overview: {
        totalVisitors: 45,
        todayVisitors: 8,
        successRate: 94.2,
        avgLatency: 156
      },
      weeklyData: [
        { date: '5-23', count: 5 },
        { date: '5-24', count: 8 },
        { date: '5-25', count: 3 },
        { date: '5-26', count: 12 },
        { date: '5-27', count: 7 },
        { date: '5-28', count: 15 },
        { date: '5-29', count: 6 }
      ],
      monthlyStats: {
        dailyAvg: 7.2,
        monthlyTotal: 216
      },
      genderStats: {
        male: 65,
        female: 35
      },
      ageDistribution: [
        { range: '18-29', count: 18 },
        { range: '30-39', count: 15 },
        { range: '40-49', count: 8 },
        { range: '50+', count: 4 }
      ],
      peakHours: ['9:00-9:59', '14:00-14:59', '18:00-18:59']
    };

    this.processRealData(mockData);
    
    console.log('已加载增强模拟数据');
  },

  // 处理折线图数据
  processLineChartData(data, maxCount) {
    if (!data || data.length === 0) return [];
    
    // 确保maxCount至少为1，避免除零错误
    const safeMaxCount = Math.max(maxCount, 1);
    
    const processedData = data.map((item, index) => {
      // X坐标：平均分布在图表宽度上，留出左右边距
      const x = data.length > 1 ? (index / (data.length - 1)) * 80 + 10 : 50;
      
      // Y坐标：从底部开始向上，0在底部，最大值在顶部
      let y;
      if (item.count === 0) {
        y = 10; // 0值显示在底部（10%位置）
      } else {
        y = 10 + (item.count / safeMaxCount) * 70; // 10%-80%区间，值越大越靠上
      }
      
      return {
        ...item,
        x: x,
        y: y
      };
    });
    
    console.log('修复后的数据点:', processedData.map(d => ({ 
      date: d.date, 
      count: d.count, 
      x: d.x.toFixed(1), 
      y: d.y.toFixed(1)
    })));
    
    // 生成连接线段
    this.generateLineSegments(processedData);
    
    return processedData;
  },

  // 生成连接线段
  generateLineSegments(data) {
    if (!data || data.length < 2) {
      return;
    }

    // 使用定时器确保canvas已经渲染
    setTimeout(() => {
      this.drawCanvasLines(data);
    }, 100);
  },

  // 使用canvas绘制连线
  drawCanvasLines(data) {
    const ctx = wx.createCanvasContext('lineChart', this);
    const query = this.createSelectorQuery();
    
    query.select('.chart-content').boundingClientRect((rect) => {
      if (!rect) return;
      
      const { width, height } = rect;
      console.log('Canvas尺寸:', width, height);
      
      // 清空画布
      ctx.clearRect(0, 0, width, height);
      
      // 设置线条样式
      ctx.setStrokeStyle('#667eea');
      ctx.setLineWidth(2);
      ctx.setLineCap('round');
      ctx.setLineJoin('round');
      
      // 开始绘制路径
      ctx.beginPath();
      
      // 移动到第一个点
      const firstPoint = data[0];
      const firstX = (firstPoint.x / 100) * width;
      const firstY = height - (firstPoint.y / 100) * height; // Canvas Y轴从上到下
      ctx.moveTo(firstX, firstY);
      
      console.log('第一个点:', firstX, firstY);
      
      // 连接其他点
      for (let i = 1; i < data.length; i++) {
        const point = data[i];
        const x = (point.x / 100) * width;
        const y = height - (point.y / 100) * height;
        ctx.lineTo(x, y);
        console.log(`点${i}:`, x, y);
      }
      
      // 绘制路径
      ctx.stroke();
      ctx.draw();
      
    }).exec();
  },

  // 生成Y轴标签
  generateYAxisLabels(maxCount) {
    const labels = [];
    const step = Math.ceil(maxCount / 4);
    // 从底部到顶部：0, step, 2*step, 3*step, 4*step
    for (let i = 0; i <= 4; i++) {
      labels.push(i * step);
    }
    return labels;
  },

  onExportCSV() {
    this.setData({ exporting: true });
    
    // 调用云函数导出CSV数据
    wx.cloud.callFunction({
      name: 'exportDashboardData',
      data: {}
    }).then(res => {
      this.setData({ exporting: false });
      
      if (res.result && res.result.success) {
        wx.showModal({
          title: '导出成功',
          content: '数据已导出为CSV格式，可通过邮件发送或云端下载',
          showCancel: false
        });
      } else {
        wx.showToast({
          title: '导出失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      this.setData({ exporting: false });
      console.error('CSV导出失败:', err);
      wx.showToast({
        title: '导出失败，请重试',
        icon: 'none'
      });
    });
  },

  onPullDownRefresh() {
    this.loadDashboardData();
    wx.stopPullDownRefresh();
  }
}); 