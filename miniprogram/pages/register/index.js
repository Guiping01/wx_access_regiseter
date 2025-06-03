const app = getApp();

Page({
  data: {
    formData: {
      avatarUrl: 'https://tdesign.gtimg.com/site/avatar.jpg',
      name: '',
      gender: '',
      age: '',
      phone: '',
      smsCode: '',
      isWxPhone: false,  // 标记是否为微信获取的手机号
      visitorName: '',
      idCard: '',
      company: '',
      purpose: '',
      visitDate: '',
      // 访客类型选项
      visitorTypeOptions: [
        { label: '访客', value: 'visitor' },
        { label: '员工', value: 'employee' }
      ],
      visitorType: 'visitor',
      showAuthModal: false,
      isAuthorized: false,
      userInfo: null,
      devSmsCode: '', // 开发模式显示的验证码
      // 成功状态相关
      showSuccess: false,
      successTitle: '',
      successDesc: '',
      showDoorStatus: false,
      submitText: '提交中...',
      // 用户状态
      isExistingUser: false,
      existingUserInfo: null,
      nameError: '',
      genderError: '',
      ageError: '',
      phoneError: '',
      smsError: ''
    },
    smsSent: false,
    smsText: '发送验证码',
    smsCountdown: 0,
    submitting: false,
    canSubmit: false,
    canSendSMS: false,
    // 防止重复开门的标记
    hasTriggeredDoor: false,
    pageFirstLoad: true
  },

  onLoad() {
    console.log('人员登记页面加载');
    this.checkUserStatus();
  },

  onShow() {
    console.log('注册页面显示');
    
    // 只在首次加载时检查用户状态，避免重复开门
    if (this.data.pageFirstLoad) {
      this.setData({ pageFirstLoad: false });
    } else if (this.data.isExistingUser && !this.data.hasTriggeredDoor) {
      // 如果是已存在用户但还没有触发过开门，则触发
      console.log('已存在用户返回页面，检查是否需要开门');
      this.checkUserStatus();
    } else {
      console.log('页面显示，跳过用户状态检查');
    }
  },

  onHide() {
    console.log('注册页面隐藏');
    // 当页面隐藏时，可以考虑在一定时间后重置开门标记
    // 这样如果用户长时间离开后回来，可以重新触发开门
    // 但为了避免频繁开门，我们暂时保持标记不重置
  },

  onUnload() {
    console.log('注册页面卸载');
    // 页面卸载时重置所有状态
    this.setData({
      hasTriggeredDoor: false,
      pageFirstLoad: true,
      showSuccess: false
    });
  },

  // 检查用户状态
  async checkUserStatus() {
    console.log('检查用户状态...');
    
    try {
      // 获取用户的openid
      const { result } = await wx.cloud.callFunction({
        name: 'getUserInfo'
      });

      if (result && result.success && result.data) {
        // 用户已注册
        const userInfo = result.data;
        console.log('用户已注册:', userInfo);
        
        this.setData({
          isExistingUser: true,
          existingUserInfo: userInfo
        });

        // 只有在没有触发过开门时才触发开门流程
        if (!this.data.hasTriggeredDoor) {
          this.showSuccessAndOpenDoor({
            title: '欢迎回来',
            desc: `${userInfo.name}，验证成功`,
            isExisting: true
          });
        } else {
          console.log('已经触发过开门，跳过开门流程');
        }
        
      } else {
        // 新用户，需要注册
        console.log('新用户，需要注册');
        this.setData({
          isExistingUser: false,
          existingUserInfo: null
        });
        this.validateForm();
      }
    } catch (error) {
      console.error('检查用户状态失败:', error);
      // 检查失败时按新用户处理
      this.setData({
        isExistingUser: false,
        existingUserInfo: null
      });
      this.validateForm();
    }
  },

  // 检查授权状态
  checkAuthStatus() {
    console.log('检查授权状态...');
    
    const userInfo = wx.getStorageSync('userInfo');
    const isLoggedIn = wx.getStorageSync('isLoggedIn');
    
    if (userInfo && isLoggedIn) {
      console.log('已授权，用户信息:', userInfo);
      this.setData({
        isAuthorized: true,
        userInfo: userInfo,
        showAuthModal: false
      });
    } else {
      console.log('未授权，需要微信授权');
      this.setData({
        isAuthorized: false,
        showAuthModal: true,
        userInfo: null
      });
    }
  },

  // 执行微信授权
  doWechatAuth() {
    console.log('开始微信授权...');
    
    const app = getApp();
    app.doWechatAuth((success, userInfo) => {
      if (success) {
        console.log('授权成功:', userInfo);
        this.setData({
          isAuthorized: true,
          userInfo: userInfo,
          showAuthModal: false
        });
      } else {
        console.log('授权失败');
        // 保持显示授权提示
        this.setData({
          showAuthModal: true
        });
      }
    });
  },

  // 关闭授权弹窗
  closeAuthModal() {
    // 如果未授权，不允许关闭弹窗
    const isAuthorized = this.data.isAuthorized;
    if (!isAuthorized) {
      wx.showModal({
        title: '授权提示',
        content: '需要微信授权才能使用登记功能',
        showCancel: false,
        confirmText: '立即授权',
        success: () => {
          this.doWechatAuth();
        }
      });
      return;
    }
    
    this.setData({
      showAuthModal: false
    });
  },

  // 隐藏的管理员入口 - 长按标题
  onTitleLongPress() {
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

  onChooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        
        // 显示上传中状态
        wx.showLoading({ title: '上传头像中...' });
        
        // 使用微信小程序直接上传到云存储
        wx.cloud.uploadFile({
          cloudPath: `avatars/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`,
          filePath: tempFilePath,
          success: (uploadRes) => {
            wx.hideLoading();
            console.log('头像上传成功:', uploadRes.fileID);
            
            this.setData({
              'formData.avatarUrl': uploadRes.fileID
            });
            
            wx.showToast({
              title: '头像上传成功',
              icon: 'success',
              duration: 1500
            });
          },
          fail: (err) => {
            wx.hideLoading();
            console.error('头像上传失败:', err);
            
            wx.showToast({
              title: '头像上传失败，请重试',
              icon: 'none',
              duration: 2000
            });
            
            // 失败时使用默认头像
            this.setData({
              'formData.avatarUrl': 'https://tdesign.gtimg.com/site/avatar.jpg'
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

  // 姓名输入
  onInputName(e) {
    const name = e.detail.value;
    this.setData({
      'formData.name': name
    });
    
    // 清除之前的错误
    this.clearFieldError('name');
    
    // 实时校验
    setTimeout(() => {
      this.validateForm();
    }, 300);
  },

  // 性别选择
  onSelectGender(e) {
    const gender = e.currentTarget.dataset.gender;
    this.setData({
      'formData.gender': gender
    });
    
    // 清除性别错误
    this.clearFieldError('gender');
    
    this.validateForm();
  },

  // 年龄输入
  onInputAge(e) {
    const age = e.detail.value;
    this.setData({
      'formData.age': age
    });
    
    // 清除之前的错误
    this.clearFieldError('age');
    
    // 实时校验
    setTimeout(() => {
      this.validateForm();
    }, 300);
  },

  // 手机号输入
  onInputPhone(e) {
    const phone = e.detail.value;
    this.setData({
      'formData.phone': phone,
      'formData.isWxPhone': false  // 手动输入时重置微信标记
    });

    // 清除之前的错误
    this.clearFieldError('phone');
    
    // 手机号格式检查 - 限制只能输入数字
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone !== phone) {
      this.setData({
        'formData.phone': cleanPhone
      });
    }
    
    const phoneValid = this.isValidPhone(cleanPhone);
    this.setData({
      canSendSMS: phoneValid && !this.data.smsSent && this.data.smsCountdown === 0
    });
    
    // 实时校验
    setTimeout(() => {
      this.validateForm();
    }, 300);
  },

  onInputSmsCode(e) {
    const smsCode = e.detail.value;
    
    // 限制只能输入数字
    const cleanCode = smsCode.replace(/\D/g, '');
    
    this.setData({
      'formData.smsCode': cleanCode
    });
    
    // 清除之前的错误
    this.clearFieldError('sms');
    
    // 实时校验
    setTimeout(() => {
      this.validateForm();
    }, 300);
  },

  isValidPhone(phone) {
    // 放宽手机号验证规则，支持更多格式用于测试
    return /^1[3-9]\d{9}$/.test(phone) || /^\d{11}$/.test(phone);
  },

  onSendSMS() {
    if (!this.data.canSendSMS) return;

    wx.showLoading({ title: '发送中...' });
    
    // 调用云函数发送短信
    wx.cloud.callFunction({
      name: 'sendSMS',
      data: {
        phone: this.data.formData.phone
      }
    }).then(res => {
      wx.hideLoading();
      
      if (res.result.success) {
        wx.showToast({
          title: res.result.message,
          icon: 'success'
        });
        
        this.setData({
          smsSent: true,
          smsCountdown: 60
        });
        
        this.startCountdown();
        
        // 开发环境下显示验证码（生产环境请移除）
        if (res.result.data && res.result.data.code) {
          console.log('验证码:', res.result.data.code);
          wx.showModal({
            title: '开发提示',
            content: `验证码: ${res.result.data.code}`,
            showCancel: false
          });
        }
      } else {
        wx.showToast({
          title: res.result.message,
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('短信发送失败:', err);
      wx.showToast({
        title: '短信发送失败，请重试',
        icon: 'none'
      });
    });
  },

  startCountdown() {
    const timer = setInterval(() => {
      const countdown = this.data.smsCountdown - 1;
      
      if (countdown <= 0) {
        clearInterval(timer);
        this.setData({
          smsText: '重新发送',
          smsCountdown: 0
        });
      } else {
        this.setData({
          smsText: `${countdown}s后重发`,
          smsCountdown: countdown
        });
      }
    }, 1000);
  },

  // 获取微信手机号
  onGetPhoneNumber(e) {
    console.log('微信获取手机号事件:', e);
    
    if (e.detail.errMsg === 'getPhoneNumber:ok') {
      console.log('微信授权成功，code:', e.detail.code);
      
      // 使用新的API方式 - 通过code获取手机号
      if (e.detail.code) {
        wx.cloud.callFunction({
          name: 'getPhoneNumber',
          data: {
            code: e.detail.code
          },
          success: (res) => {
            console.log('解密手机号成功:', res);
            
            if (res.result && res.result.success) {
              const phoneNumber = res.result.purePhoneNumber || res.result.phoneNumber;
              
              this.setData({
                'formData.phone': phoneNumber,
                'formData.isWxPhone': true,
                'formData.smsCode': '',
                smsSent: false,
                canSendSMS: false
              });
              this.validateForm();
              
              wx.showToast({
                title: '获取成功',
                icon: 'success'
              });
            } else {
              console.error('获取手机号失败:', res.result);
              wx.showToast({
                title: res.result?.error || '获取失败，请重试',
                icon: 'none',
                duration: 2000
              });
            }
          },
          fail: (err) => {
            console.error('云函数调用失败:', err);
            wx.showToast({
              title: '获取失败，请重试',
              icon: 'none',
              duration: 2000
            });
          }
        });
      } else if (e.detail.cloudID) {
        // 降级方案：使用cloudID方式
        console.log('使用cloudID方式获取手机号');
        wx.cloud.callFunction({
          name: 'getPhoneNumber',
          data: {
            cloudID: e.detail.cloudID
          },
          success: (res) => {
            console.log('解密手机号成功:', res);
            
            if (res.result && res.result.success) {
              const phoneNumber = res.result.purePhoneNumber || res.result.phoneNumber;
              
              this.setData({
                'formData.phone': phoneNumber,
                'formData.isWxPhone': true,
                'formData.smsCode': '',
                smsSent: false,
                canSendSMS: false
              });
              this.validateForm();
              
              wx.showToast({
                title: '获取成功',
                icon: 'success'
              });
            } else {
              console.error('获取手机号失败:', res.result);
              wx.showToast({
                title: res.result?.error || '获取失败，请重试',
                icon: 'none',
                duration: 2000
              });
            }
          },
          fail: (err) => {
            console.error('云函数调用失败:', err);
            wx.showToast({
              title: '获取失败，请重试',
              icon: 'none',
              duration: 2000
            });
          }
        });
      } else {
        console.error('既没有code也没有cloudID');
        wx.showToast({
          title: '获取失败，缺少必要参数',
          icon: 'none',
          duration: 2000
        });
      }
    } else if (e.detail.errMsg === 'getPhoneNumber:fail user deny') {
      console.log('用户拒绝授权');
      wx.showToast({
        title: '可以手动输入手机号',
        icon: 'none',
        duration: 2000
      });
    } else if (e.detail.errMsg === 'getPhoneNumber:fail no permission') {
      console.log('小程序未认证或权限不足');
      wx.showModal({
        title: '权限不足',
        content: '获取手机号功能需要小程序完成微信认证，当前小程序暂不支持此功能，请手动输入手机号。',
        showCancel: false,
        confirmText: '知道了'
      });
    } else {
      console.log('获取手机号失败:', e.detail.errMsg);
      wx.showToast({
        title: '获取失败，请手动输入',
        icon: 'none',
        duration: 2000
      });
    }
  },

  onClearPhone() {
    this.setData({
      'formData.phone': '',
      'formData.isWxPhone': false,
      'formData.smsCode': '',
      smsSent: false,
      smsText: '发送验证码',
      smsCountdown: 0,
      canSendSMS: false,
      devSmsCode: ''
    });
    this.validateForm();
  },

  // 表单验证
  validateForm() {
    const { name, gender, age, phone, smsCode, isWxPhone } = this.data.formData;
    const { smsSent } = this.data;
    
    console.log('=== 表单验证开始 ===');
    console.log('表单数据:', {
      name: `"${name}"`,
      gender: `"${gender}"`,
      age: `"${age}"`,
      phone: `"${phone}"`,
      smsCode: `"${smsCode}"`,
      isWxPhone,
      smsSent
    });
    
    // 重置错误状态
    this.setData({
      nameError: '',
      genderError: '',
      ageError: '',
      phoneError: '',
      smsError: ''
    });
    
    let isValid = true;
    let errors = {};
    
    // 姓名验证
    if (!name || name.trim().length === 0) {
      errors.nameError = '请输入姓名';
      isValid = false;
    } else if (name.trim().length < 2) {
      errors.nameError = '姓名至少2个字符';
      isValid = false;
    } else if (name.trim().length > 20) {
      errors.nameError = '姓名不能超过20个字符';
      isValid = false;
    } else if (!/^[\u4e00-\u9fa5a-zA-Z]+$/.test(name.trim())) {
      errors.nameError = '姓名只能包含中文和英文';
      isValid = false;
    }
    
    // 性别验证
    if (!gender) {
      errors.genderError = '请选择性别';
      isValid = false;
    } else if (gender !== 'male' && gender !== 'female') {
      errors.genderError = '性别选择无效';
      isValid = false;
    }
    
    // 年龄验证
    if (!age || age.trim().length === 0) {
      errors.ageError = '请输入年龄';
      isValid = false;
    } else if (isNaN(age)) {
      errors.ageError = '年龄必须是数字';
      isValid = false;
    } else {
      const ageNum = parseInt(age);
      if (ageNum < 1) {
        errors.ageError = '年龄不能小于1岁';
        isValid = false;
      } else if (ageNum > 120) {
        errors.ageError = '年龄不能大于120岁';
        isValid = false;
      }
    }
    
    // 手机号验证
    if (!phone || phone.trim().length === 0) {
      errors.phoneError = '请输入手机号';
      isValid = false;
    } else if (!this.isValidPhone(phone)) {
      errors.phoneError = '请输入正确的手机号格式';
      isValid = false;
    }
    
    // 验证码验证（仅手动输入手机号时）
    if (!isWxPhone && isValid && smsSent) {
      if (!smsCode || smsCode.trim().length === 0) {
        errors.smsError = '请输入验证码';
        isValid = false;
      } else if (smsCode.length !== 6) {
        errors.smsError = '验证码必须是6位数字';
        isValid = false;
      } else if (!/^\d{6}$/.test(smsCode)) {
        errors.smsError = '验证码只能包含数字';
        isValid = false;
      }
    }
    
    // 更新错误状态
    this.setData({
      ...errors
    });
    
    console.log('验证结果:', { isValid, errors });
    console.log('=== 表单验证结束 ===');
    
    this.setData({ canSubmit: isValid });
    return isValid;
  },

  // 显示表单错误提示
  showFormError(field, message) {
    const errorMap = {
      name: 'nameError',
      gender: 'genderError', 
      age: 'ageError',
      phone: 'phoneError',
      sms: 'smsError'
    };
    
    this.setData({
      [errorMap[field]]: message
    });
  },

  // 清除单个字段的错误
  clearFieldError(field) {
    const errorMap = {
      name: 'nameError',
      gender: 'genderError',
      age: 'ageError', 
      phone: 'phoneError',
      sms: 'smsError'
    };
    
    this.setData({
      [errorMap[field]]: ''
    });
  },

  // 提交表单
  async onSubmit() {
    // 先进行完整的表单校验
    if (!this.validateForm()) {
      wx.showToast({
        title: '请检查表单信息',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    if (!this.data.canSubmit || this.data.submitting) {
      return;
    }

    console.log('开始提交表单');

    this.setData({ 
      submitting: true,
      submitText: '正在验证...'
    });

    try {
      const { name, gender, age, phone, smsCode, isWxPhone } = this.data.formData;

      // 调用注册云函数
      const registerResult = await wx.cloud.callFunction({
        name: 'userRegister',
        data: {
          name: name.trim(),
          gender,
          age: parseInt(age),
          phone,
          smsCode: isWxPhone ? '' : smsCode,
          isWxPhone
        }
      });

      if (registerResult.result && registerResult.result.success) {
        console.log('注册成功');
        
        // 显示成功状态并开门
        this.showSuccessAndOpenDoor({
          title: '登记成功',
          desc: '正在为您开门...',
          isExisting: false
        });
        
      } else {
        this.setData({ 
          submitting: false,
          submitText: '提交中...'
        });
        
        wx.showToast({
          title: registerResult.result?.message || '登记失败，请重试',
          icon: 'none',
          duration: 2000
        });
      }
    } catch (error) {
      console.error('注册失败:', error);
      this.setData({ 
        submitting: false,
        submitText: '提交中...'
      });
      
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 显示成功状态并开门
  async showSuccessAndOpenDoor({ title, desc, isExisting }) {
    if (this.data.hasTriggeredDoor) {
      console.log('重复开门，忽略');
      return;
    }

    this.setData({
      showSuccess: true,
      successTitle: title,
      successDesc: desc,
      showDoorStatus: true,
      submitting: false,
      hasTriggeredDoor: true
    });

    // 延迟调用开门接口
    setTimeout(() => {
      this.callDoorSystem();
    }, 1000);
  },

  // 调用门禁系统
  async callDoorSystem() {
    try {
      console.log('调用门禁系统...');
      
      // 调用真实的开门云函数
      const doorResult = await wx.cloud.callFunction({
        name: 'doorAccess',
        data: {
          deviceId: 'LOCK-01',
          location: '北京市朝阳区'
        }
      });
      
      console.log('开门云函数返回:', doorResult);
      
      if (doorResult.result && doorResult.result.success) {
        console.log('开门成功');
        this.setData({
          successDesc: `开门成功，请通行 (${doorResult.result.data.latency}ms)`,
          showDoorStatus: false
        });
        
        // 处理后续跳转逻辑
        await this.handlePostSuccess();
        
      } else {
        console.log('开门失败:', doorResult.result?.message);
        this.setData({
          successDesc: `开门失败：${doorResult.result?.message || '未知错误'}`,
          showDoorStatus: false
        });
        
        // 开门失败也要跳转，因为注册已经成功
        await this.handlePostSuccess(true);
      }
    } catch (error) {
      console.error('调用门禁系统失败:', error);
      this.setData({
        successDesc: '门禁系统故障，请联系管理员',
        showDoorStatus: false
      });
      
      // 即使出错也要处理跳转
      await this.handlePostSuccess(true);
    }
  },

  // 处理成功后的跳转逻辑
  async handlePostSuccess(hasError = false) {
    console.log('处理成功后逻辑，是否有错误:', hasError);
    
    // 等待3秒显示结果
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    this.setData({ showSuccess: false });
    
    if (this.data.isExistingUser) {
      // 已有用户直接跳转
      wx.switchTab({
        url: '/pages/me/index'
      });
      return;
    }

    // 新用户需要验证数据是否已写入数据库
    try {
      console.log('验证新用户数据是否已写入数据库...');
      
      // 等待额外2秒确保数据库写入完成
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 验证用户数据是否可用
      const { result } = await wx.cloud.callFunction({
        name: 'getUserInfo'
      });

      if (result && result.success && result.data) {
        console.log('用户数据验证成功，可以跳转');
        
        const message = hasError ? '注册成功，但开门失败' : '注册成功，欢迎使用';
        const icon = hasError ? 'none' : 'success';
        
        wx.showToast({
          title: message,
          icon: icon,
          duration: 2000,
          success: () => {
            setTimeout(() => {
              wx.switchTab({
                url: '/pages/me/index'
              });
            }, 1500);
          }
        });
      } else {
        console.log('用户数据未就绪，延迟跳转');
        
        // 数据还没准备好，再等待一段时间
        wx.showToast({
          title: '正在准备数据...',
          icon: 'loading',
          duration: 3000,
          success: () => {
            setTimeout(() => {
              wx.switchTab({
                url: '/pages/me/index'
              });
            }, 3000);
          }
        });
      }
    } catch (error) {
      console.error('验证用户数据失败:', error);
      
      // 即使验证失败也要跳转，避免用户卡住
      wx.showToast({
        title: '注册成功',
        icon: 'success',
        duration: 2000,
        success: () => {
          setTimeout(() => {
            wx.switchTab({
              url: '/pages/me/index'
            });
          }, 1500);
        }
      });
    }
  },

  // 重置表单
  resetForm() {
    const today = new Date();
    const dateStr = this.formatDate(today);
    
    this.setData({
      'formData.visitorName': '',
      'formData.idCard': '',
      'formData.phoneNumber': '',
      'formData.company': '',
      'formData.purpose': '',
      'formData.visitDate': dateStr,
      'formData.visitorType': 'visitor'
    });
  },

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}); 