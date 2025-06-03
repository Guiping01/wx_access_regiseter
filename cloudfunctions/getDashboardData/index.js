// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  
  try {
    // 检查是否需要创建测试数据
    if (event.createTestData) {
      await createTestDoorLogs();
      return { success: true, message: '测试数据创建完成' };
    }
    
    // 检查是否需要初始化数据库
    if (event.initDatabase) {
      await initDatabase();
      return { success: true, message: '数据库初始化完成' };
    }
    
    const { 
      startDate, 
      endDate, 
      gender, 
      ageRange 
    } = event;

    // 构建查询条件
    const userFilter = {};
    const doorLogFilter = {};
    
    if (gender) userFilter.gender = gender;
    if (ageRange) {
      const [minAge, maxAge] = parseAgeRange(ageRange);
      userFilter.age = _.and(_.gte(minAge), _.lte(maxAge));
    }
    
    if (startDate && endDate) {
      doorLogFilter.createTime = _.and(
        _.gte(new Date(startDate)),
        _.lte(new Date(endDate + ' 23:59:59'))
      );
    }

    // 1. 获取用户基本统计
    const userStats = await getUserStats(userFilter);
    
    // 2. 获取开门记录统计  
    const doorStats = await getDoorStats(doorLogFilter, userFilter);
    
    // 3. 获取时间趋势数据
    const trendData = await getTrendData(startDate, endDate);
    
    // 4. 获取用户画像数据
    const userProfile = await getUserProfile(userFilter);

    console.log('Dashboard数据统计:', {
      totalUsers: userStats.totalUsers,
      doorStats: doorStats,
      trendData: trendData,
      userProfile: userProfile
    });

    return {
      success: true,
      data: {
        overview: {
          totalVisitors: userStats.totalUsers,
          todayVisitors: await getTodayVisitors(),
          successRate: doorStats.successRate,
          avgLatency: doorStats.avgLatency
        },
        weeklyData: trendData.weeklyData,
        monthlyStats: trendData.monthlyStats,
        genderStats: userProfile.genderStats,
        ageDistribution: userProfile.ageDistribution,
        peakHours: doorStats.peakHours
      }
    };

  } catch (error) {
    console.error('Dashboard数据获取错误:', error);
    return {
      success: false,
      message: '数据获取失败'
    };
  }
};

// 获取用户基本统计
async function getUserStats(filter) {
  const userCount = await db.collection('users')
    .where({
      status: 'active',
      ...filter
    })
    .count();
    
  return {
    totalUsers: userCount.total
  };
}

// 获取开门记录统计
async function getDoorStats(doorFilter, userFilter) {
  console.log('开门记录查询条件:', { doorFilter, userFilter });
  
  // 如果有用户筛选条件，需要先获取符合条件的用户ID
  let userIds = null;
  if (Object.keys(userFilter).length > 0) {
    const users = await db.collection('users')
      .where({
        status: 'active',
        ...userFilter
      })
      .field({ _id: true })
      .get();
    userIds = users.data.map(user => user._id);
    console.log('筛选的用户ID:', userIds);
  }

  // 构建开门记录查询条件 - 不使用时间筛选，获取所有记录统计
  const logFilter = {};
  if (userIds && userIds.length > 0) {
    logFilter.userId = _.in(userIds);
  }

  console.log('开门记录最终查询条件:', logFilter);

  // 获取所有开门记录用于统计
  const doorLogs = await db.collection('door_logs')
    .where(logFilter)
    .get();

  const logs = doorLogs.data;
  console.log('查询到的开门记录数量:', logs.length);
  
  if (logs.length === 0) {
    // 如果没有记录，返回默认值
    return {
      successRate: 0,
      avgLatency: 0,
      peakHours: ['暂无数据']
    };
  }
  
  const successLogs = logs.filter(log => log.result === 'success' || log.status === 'success');
  console.log('成功开门记录数量:', successLogs.length);
  
  // 计算成功率
  const successRate = Math.round((successLogs.length / logs.length) * 100 * 10) / 10;
  
  // 计算平均延迟 - 处理不同的延迟字段名
  const latencies = logs.map(log => log.latency || log.responseTime || 0).filter(l => l > 0);
  const avgLatency = latencies.length > 0 ? 
    Math.round(latencies.reduce((sum, l) => sum + l, 0) / latencies.length) : 0;
  
  // 分析高峰时段
  const hourCounts = {};
  logs.forEach(log => {
    const hour = new Date(log.createTime).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  
  const peakHours = Object.entries(hourCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => `${hour}:00-${hour}:59`);

  const result = {
    successRate,
    avgLatency,
    peakHours: peakHours.length > 0 ? peakHours : ['暂无数据']
  };
  
  console.log('开门统计结果:', result);
  return result;
}

// 获取时间趋势数据
async function getTrendData(startDate, endDate) {
  console.log('获取时间趋势数据，日期范围:', { startDate, endDate });
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  
  const weeklyData = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(sevenDaysAgo);
    date.setDate(sevenDaysAgo.getDate() + i);
    
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);
    nextDay.setHours(0, 0, 0, 0);
    
    console.log(`查询第${i+1}天数据:`, { 
      date: date.toISOString(), 
      nextDay: nextDay.toISOString() 
    });
    
    // 获取当天的所有开门记录
    const dayLogs = await db.collection('door_logs')
      .where({
        createTime: _.and(
          _.gte(date),
          _.lt(nextDay)
        )
      })
      .get();
    
    // 统计当天唯一访客数
    const uniqueUsers = new Set();
    dayLogs.data.forEach(log => {
      if (log.userId) {
        uniqueUsers.add(log.userId);
      } else if (log.openId) {
        uniqueUsers.add(log.openId);
      }
    });
    
    const count = uniqueUsers.size;
    console.log(`第${i+1}天(${date.getMonth() + 1}-${date.getDate()})访客数:`, count);
    
    weeklyData.push({
      date: `${date.getMonth() + 1}-${date.getDate()}`,
      count: count
    });
  }
  
  console.log('近7日访问数据:', weeklyData);
  
  // 月统计 - 统计本月的唯一访客
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  
  const monthLogs = await db.collection('door_logs')
    .where({
      createTime: _.gte(monthStart)
    })
    .get();
  
  // 统计月唯一访客
  const monthlyUniqueUsers = new Set();
  monthLogs.data.forEach(log => {
    if (log.userId) {
      monthlyUniqueUsers.add(log.userId);
    } else if (log.openId) {
      monthlyUniqueUsers.add(log.openId);
    }
  });
  
  const daysInMonth = new Date().getDate();
  const monthlyTotal = monthlyUniqueUsers.size;
  const dailyAvg = monthlyTotal > 0 ? Math.round((monthlyTotal / daysInMonth) * 10) / 10 : 0;

  const monthlyStats = {
    dailyAvg,
    monthlyTotal
  };
  
  console.log('月统计数据:', monthlyStats);

  return {
    weeklyData,
    monthlyStats
  };
}

// 获取用户画像数据
async function getUserProfile(filter) {
  // 性别分布
  const maleCount = await db.collection('users')
    .where({
      status: 'active',
      gender: 'male',
      ...filter
    })
    .count();
    
  const femaleCount = await db.collection('users')
    .where({
      status: 'active', 
      gender: 'female',
      ...filter
    })
    .count();
  
  const totalGender = maleCount.total + femaleCount.total;
  const genderStats = {
    male: totalGender > 0 ? Math.round((maleCount.total / totalGender) * 100) : 0,
    female: totalGender > 0 ? Math.round((femaleCount.total / totalGender) * 100) : 0
  };
  
  // 年龄分布
  const ageRanges = [
    { range: '18-29', min: 18, max: 29 },
    { range: '30-39', min: 30, max: 39 },
    { range: '40-49', min: 40, max: 49 },
    { range: '50+', min: 50, max: 120 }
  ];
  
  const ageDistribution = [];
  
  for (const ageRange of ageRanges) {
    const count = await db.collection('users')
      .where({
        status: 'active',
        age: _.and(_.gte(ageRange.min), _.lte(ageRange.max)),
        ...filter
      })
      .count();
      
    ageDistribution.push({
      range: ageRange.range,
      count: count.total
    });
  }

  return {
    genderStats,
    ageDistribution
  };
}

// 获取今日访客数
async function getTodayVisitors() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  console.log('今日访客查询时间范围:', {
    today: today.toISOString(),
    tomorrow: tomorrow.toISOString()
  });
  
  // 获取今日所有开门记录
  const todayLogs = await db.collection('door_logs')
    .where({
      createTime: _.and(_.gte(today), _.lt(tomorrow))
    })
    .get();
  
  console.log('今日开门记录总数:', todayLogs.data.length);
  
  // 统计唯一用户数
  const uniqueUsers = new Set();
  todayLogs.data.forEach(log => {
    if (log.userId) {
      uniqueUsers.add(log.userId);
    } else if (log.openId) {
      uniqueUsers.add(log.openId);
    }
  });
  
  const todayVisitorsCount = uniqueUsers.size;
  console.log('今日唯一访客数:', todayVisitorsCount);
  
  return todayVisitorsCount;
}

// 解析年龄范围
function parseAgeRange(range) {
  switch (range) {
    case '18-29': return [18, 29];
    case '30-49': return [30, 49]; 
    case '50+': return [50, 120];
    default: return [0, 120];
  }
}

// 创建测试开门记录数据
async function createTestDoorLogs() {
  console.log('开始创建测试开门记录数据...');
  
  // 检查是否已有开门记录
  const existingLogs = await db.collection('door_logs').limit(1).get();
  if (existingLogs.data.length > 0) {
    console.log('已存在开门记录，跳过创建');
    return;
  }
  
  // 获取已有用户
  const users = await db.collection('users')
    .where({ status: 'active' })
    .limit(10)
    .get();
  
  if (users.data.length === 0) {
    console.log('没有找到用户数据，无法创建测试记录');
    return;
  }
  
  const testLogs = [];
  const now = new Date();
  
  // 为每个用户创建开门记录
  for (const user of users.data) {
    // 创建过去7天的测试数据
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // 每天有60%的概率开门
      if (Math.random() > 0.4) {
        // 随机选择时间
        const logTime = new Date(date);
        logTime.setHours(
          Math.floor(Math.random() * 14) + 7, // 7-21点
          Math.floor(Math.random() * 60)
        );
        
        testLogs.push({
          userId: user._id,
          openId: user.openid,
          userName: user.name,
          deviceId: 'main_entrance_001',
          deviceName: '办公楼大门',
          action: 'door_access',
          result: Math.random() > 0.05 ? 'success' : 'failed', // 95%成功率
          status: Math.random() > 0.05 ? 'success' : 'failed',
          latency: Math.floor(Math.random() * 200) + 80, // 80-280ms延迟
          responseTime: Math.floor(Math.random() * 200) + 80,
          ipAddress: '192.168.1.' + Math.floor(Math.random() * 100 + 100),
          userAgent: 'MiniProgram/DoorAccess',
          description: '门禁系统访问',
          createTime: logTime,
          updateTime: logTime
        });
      }
    }
    
    // 今天也可能有记录
    if (Math.random() > 0.3) {
      const todayTime = new Date();
      todayTime.setHours(
        Math.floor(Math.random() * 10) + 8, // 8-18点
        Math.floor(Math.random() * 60)
      );
      
      testLogs.push({
        userId: user._id,
        openId: user.openid,
        userName: user.name,
        deviceId: 'main_entrance_001',
        deviceName: '办公楼大门',
        action: 'door_access',
        result: 'success',
        status: 'success',
        latency: Math.floor(Math.random() * 150) + 100,
        responseTime: Math.floor(Math.random() * 150) + 100,
        ipAddress: '192.168.1.' + Math.floor(Math.random() * 100 + 100),
        userAgent: 'MiniProgram/DoorAccess',
        description: '门禁系统访问',
        createTime: todayTime,
        updateTime: todayTime
      });
    }
  }
  
  // 批量插入数据
  if (testLogs.length > 0) {
    // 分批插入，每次最多20条
    const batchSize = 20;
    for (let i = 0; i < testLogs.length; i += batchSize) {
      const batch = testLogs.slice(i, i + batchSize);
      await db.collection('door_logs').add({
        data: batch
      });
    }
    console.log(`创建了${testLogs.length}条测试开门记录`);
  } else {
    console.log('没有创建任何测试记录');
  }
}

// 初始化数据库
async function initDatabase() {
  console.log('开始初始化数据库...');
  
  try {
    // 1. 检查并创建必要的集合
    const collections = ['users', 'door_logs', 'admins', 'sms_codes', 'admin_logs'];
    
    for (const collectionName of collections) {
      try {
        // 尝试获取集合信息
        await db.collection(collectionName).limit(1).get();
        console.log(`集合 ${collectionName} 已存在`);
      } catch (error) {
        console.log(`集合 ${collectionName} 不存在，正在创建...`);
        // 创建集合（通过插入一个临时文档再删除）
        const tempResult = await db.collection(collectionName).add({
          data: { _temp: true, createTime: new Date() }
        });
        await db.collection(collectionName).doc(tempResult._id).remove();
        console.log(`集合 ${collectionName} 创建成功`);
      }
    }
    
    // 2. 为现有用户创建开门记录（如果没有的话）
    await createInitialDoorLogsForExistingUsers();
    
    console.log('数据库初始化完成');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
}

// 为现有用户创建初始开门记录
async function createInitialDoorLogsForExistingUsers() {
  console.log('为现有用户创建开门记录...');
  
  // 获取所有活跃用户
  const users = await db.collection('users')
    .where({ status: 'active' })
    .get();
  
  if (users.data.length === 0) {
    console.log('没有找到活跃用户');
    return;
  }
  
  // 检查是否已有开门记录
  const existingLogs = await db.collection('door_logs').limit(1).get();
  if (existingLogs.data.length > 0) {
    console.log('已存在开门记录，跳过创建');
    return;
  }
  
  const doorLogs = [];
  const now = new Date();
  
  // 为每个用户创建一条今天的开门记录
  for (const user of users.data) {
    const logTime = new Date(now);
    // 设置为今天的随机时间
    logTime.setHours(
      Math.floor(Math.random() * 12) + 8, // 8-20点
      Math.floor(Math.random() * 60)
    );
    
    doorLogs.push({
      userId: user._id,
      openId: user.openid,
      userName: user.name,
      deviceId: 'main_entrance_001',
      deviceName: '办公楼大门',
      action: 'door_access',
      result: 'success',
      status: 'success',
      latency: Math.floor(Math.random() * 100) + 100, // 100-200ms
      responseTime: Math.floor(Math.random() * 100) + 100,
      ipAddress: '192.168.1.100',
      userAgent: 'MiniProgram/Init',
      description: '初始化开门记录',
      createTime: logTime,
      updateTime: logTime
    });
  }
  
  // 批量插入开门记录
  if (doorLogs.length > 0) {
    const batchSize = 20;
    for (let i = 0; i < doorLogs.length; i += batchSize) {
      const batch = doorLogs.slice(i, i + batchSize);
      await db.collection('door_logs').add({
        data: batch
      });
    }
    console.log(`为${users.data.length}个用户创建了初始开门记录`);
  }
} 