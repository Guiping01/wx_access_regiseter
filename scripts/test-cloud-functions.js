#!/usr/bin/env node

/**
 * 云函数测试脚本
 * 用于在本地环境下测试云函数逻辑（模拟环境）
 */

const fs = require('fs');
const path = require('path');

// 模拟微信云开发SDK
const mockWxServerSdk = {
  init: () => console.log('🔧 模拟云开发初始化'),
  database: () => ({
    collection: (name) => ({
      where: (condition) => ({
        orderBy: (field, order) => ({
          limit: (count) => ({
            get: async () => {
              console.log(`📊 模拟查询 ${name} 集合，条件:`, JSON.stringify(condition, null, 2));
              return {
                data: [
                  // 模拟数据
                  name === 'users' ? {
                    name: '测试用户',
                    gender: 'male',
                    age: 25,
                    phone: '13800138000',
                    createTime: new Date(),
                    status: 'active'
                  } : {
                    userId: 'test_user_id',
                    deviceId: 'test_device',
                    result: 'success',
                    latency: 100,
                    location: '前门',
                    createTime: new Date()
                  }
                ]
              };
            }
          })
        })
      })
    }),
    command: {
      gte: (value) => ({ $gte: value }),
      lte: (value) => ({ $lte: value }),
      and: (...conditions) => ({ $and: conditions })
    }
  }),
  DYNAMIC_CURRENT_ENV: 'test-env'
};

// 替换 require 中的 wx-server-sdk
const originalRequire = require;
require = function(id) {
  if (id === 'wx-server-sdk') {
    return mockWxServerSdk;
  }
  return originalRequire.apply(this, arguments);
};

async function testCloudFunction(functionName, event = {}) {
  console.log(`\n🚀 测试云函数: ${functionName}`);
  console.log(`📥 输入参数:`, JSON.stringify(event, null, 2));
  
  try {
    const functionPath = path.join(__dirname, '..', 'cloudfunctions', functionName, 'index.js');
    
    if (!fs.existsSync(functionPath)) {
      throw new Error(`云函数 ${functionName} 不存在`);
    }
    
    // 清除模块缓存
    delete require.cache[require.resolve(functionPath)];
    
    const cloudFunction = require(functionPath);
    const result = await cloudFunction.main(event, { requestId: 'test-' + Date.now() });
    
    console.log(`✅ 测试结果:`, JSON.stringify(result, null, 2));
    return result;
    
  } catch (error) {
    console.error(`❌ 测试失败:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🔍 开始云函数测试...\n');
  
  // 测试 exportDashboardData 云函数
  await testCloudFunction('exportDashboardData', {
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    gender: 'all',
    ageRange: 'all'
  });
  
  await testCloudFunction('exportDashboardData', {
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    gender: 'male',
    ageRange: '20-30'
  });
  
  console.log('\n✨ 测试完成！');
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testCloudFunction }; 