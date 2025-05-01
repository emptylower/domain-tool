/**
 * 域名识别与管理工具 - Serpstat API工具库
 */

// 创建工具对象
self.serpstatUtils = {};

/**
 * Serpstat API标记
 * 注意：实际使用中应从安全的配置中获取
 * @type {string}
 */
self.serpstatUtils.apiToken = ''; // 需要从设置中获取

/**
 * 设置API标记
 * @param {string} token - Serpstat API标记
 */
self.serpstatUtils.setApiToken = function(token) {
  // 清除标记中可能的空格
  const cleanToken = token ? token.trim() : '';
  self.serpstatUtils.apiToken = cleanToken;
  
  console.log('设置API标记:', cleanToken ? `${cleanToken.substring(0, 4)}****${cleanToken.substring(cleanToken.length - 4)}` : '(空)');
  
  // 保存到存储中便于持久化
  if (self.domainToolStorage) {
    self.domainToolStorage.local.set({ serpstatApiToken: cleanToken })
      .then(() => console.log('API标记已保存到本地存储'))
      .catch(err => console.error('保存API标记出错:', err));
  }
};

/**
 * 获取API标记
 * @returns {Promise<string>} - Serpstat API标记
 */
self.serpstatUtils.getApiToken = async function() {
  if (self.serpstatUtils.apiToken) {
    return self.serpstatUtils.apiToken;
  }
  
  try {
    // 从存储中获取
    if (self.domainToolStorage) {
      const data = await self.domainToolStorage.local.get('serpstatApiToken');
      const token = data.serpstatApiToken || '';
      
      // 清除标记中可能的空格
      self.serpstatUtils.apiToken = token.trim();
      
      console.log('从存储中获取API标记:', self.serpstatUtils.apiToken ? 
        `${self.serpstatUtils.apiToken.substring(0, 4)}****${self.serpstatUtils.apiToken.substring(self.serpstatUtils.apiToken.length - 4)}` : 
        '(未设置)');
      
      return self.serpstatUtils.apiToken;
    }
  } catch (error) {
    console.error('获取API标记出错:', error);
  }
  
  return '';
};

/**
 * 检查域名是否可能不被Serpstat支持
 * @param {string} domain - 要检查的域名
 * @returns {boolean} - 如果域名可能不被支持，返回true
 */
self.serpstatUtils.isUnsupportedDomain = function(domain) {
  if (!domain) return true;
  
  // 检查特殊情况
  // 1. 不包含点号的域名
  // 2. IP地址形式的域名
  // 3. 包含无效字符的域名
  
  if (!domain.includes('.')) {
    console.warn(`域名 ${domain} 不包含点号，格式不正确`);
    return true;
  }
  
  // 检测域名是否为IP地址
  const ipPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
  if (ipPattern.test(domain)) {
    console.warn(`域名 ${domain} 是IP地址，Serpstat不支持`);
    return true;
  }
  
  // 检测域名是否包含无效字符
  const invalidCharsPattern = /[^a-zA-Z0-9\-\.]/;
  if (invalidCharsPattern.test(domain)) {
    console.warn(`域名 ${domain} 包含无效字符`);
    return true;
  }
  
  return false;
};

/**
 * 获取域名的主域名部分
 * @param {string} domain - 完整域名
 * @returns {string} - 主域名部分
 */
self.serpstatUtils.getMainDomain = function(domain) {
  if (!domain || !domain.includes('.')) return domain;
  
  const parts = domain.split('.');
  
  // 处理特殊的二级域名结构
  const specialTlds = ['co.uk', 'com.cn', 'com.hk', 'org.cn', 'net.cn', 'edu.cn', 'co.jp', 'ac.cn'];
  const lastTwoParts = parts.slice(-2).join('.');
  
  if (specialTlds.includes(lastTwoParts)) {
    // 对于特殊的二级域名，如example.co.uk，返回三级形式
    if (parts.length >= 3) {
      return parts.slice(-3).join('.');
    }
    return domain;
  } else {
    // 普通域名，返回最后两部分
    if (parts.length > 2) {
      return parts.slice(-2).join('.');
    }
    return domain;
  }
};

/**
 * 验证域名格式是否符合规范
 * @param {string} domain - 要验证的域名
 * @returns {boolean} - 如果域名格式有效返回true
 */
self.serpstatUtils.isValidDomainFormat = function(domain) {
  if (!domain) return false;
  
  // 域名格式验证的正则表达式 
  // 允许字母、数字、连字符、点，但不允许连续的点，开头和结尾不能是连字符或点
  const domainRegex = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63})*\.[A-Za-z]{2,}$/;
  
  return domainRegex.test(domain);
};

/**
 * 预检查API请求是否可能会成功
 * @param {string} domain - 要检查的域名
 * @returns {Object} - 包含检查结果和可能的错误信息
 */
self.serpstatUtils.preflightCheck = function(domain) {
  // 检查域名格式是否有效
  if (!self.serpstatUtils.isValidDomainFormat(domain)) {
    return {
      valid: false,
      reason: '域名格式不符合规范',
      details: '域名应该由字母、数字、连字符组成，以有效的顶级域名结尾'
    };
  }
  
  // 如果被isUnsupportedDomain函数标记为不支持
  if (self.serpstatUtils.isUnsupportedDomain(domain)) {
    return {
      valid: false,
      reason: '域名类型不被Serpstat支持',
      details: '可能是IP地址或包含特殊字符的域名'
    };
  }
  
  return { valid: true };
};

/**
 * Serpstat API数据库ID映射
 * 参考: https://serpstat.com/api/406-list-of-available-v4-databases-serpstatdatabaseproceduregetdatabaseinfo/
 */
self.serpstatUtils.databases = {
  google: {
    us: 'g_us',
    uk: 'g_uk',
    ca: 'g_ca',
    au: 'g_au',
    br: 'g_br',
    fr: 'g_fr',
    de: 'g_de',
    it: 'g_it',
    es: 'g_es',
    ua: 'g_ua',
    ru: 'g_ru',
    tr: 'g_tr',
    ch: 'g_ch',
    fi: 'g_fi',
    hu: 'g_hu',
    dk: 'g_dk',
    bg: 'g_bg',
    ro: 'g_ro',
    nl: 'g_nl',
    pt: 'g_pt',
    ie: 'g_ie',
    se: 'g_se',
    mx: 'g_mx',
    za: 'g_za',
    no: 'g_no',
    sg: 'g_sg',
    my: 'g_my',
    nz: 'g_nz',
    th: 'g_th',
    pl: 'g_pl',
    il: 'g_il',
    sk: 'g_sk',
    at: 'g_at',
    be: 'g_be',
    hk: 'g_hk',
    kr: 'g_kr',
    in: 'g_in',
    jp: 'g_jp',
    cz: 'g_cz',
    co: 'g_co',
    ar: 'g_ar',
    cl: 'g_cl',
    vn: 'g_vn',
    ph: 'g_ph',
    tw: 'g_tw',
    lt: 'g_lt',
    lv: 'g_lv',
    id: 'g_id',
    ee: 'g_ee',
    bd: 'g_bd'
  },
  yandex: {
    ru: 'y_ru'
  }
};

/**
 * 获取可用的数据库ID
 * @returns {string[]} - 可用的数据库ID数组
 */
self.serpstatUtils.getAvailableDatabases = function() {
  // 返回最常用的几个市场的字符串ID，优先考虑中国和亚洲地区数据库
  return [
    self.serpstatUtils.databases.google.us,  // 美国
    self.serpstatUtils.databases.google.hk,  // 香港
    self.serpstatUtils.databases.google.tw,  // 台湾
    self.serpstatUtils.databases.google.sg,  // 新加坡
    self.serpstatUtils.databases.google.jp,  // 日本
    self.serpstatUtils.databases.google.in,  // 印度
    self.serpstatUtils.databases.google.uk,  // 英国
    self.serpstatUtils.databases.yandex.ru,  // 俄罗斯
    self.serpstatUtils.databases.google.ca,  // 加拿大
    self.serpstatUtils.databases.google.au,  // 澳大利亚
    self.serpstatUtils.databases.google.ru  // 俄罗斯
  ];
};

/**
 * 添加对API令牌格式的验证
 * @param {string} token - Serpstat API标记
 * @returns {boolean} - 如果令牌格式有效返回true
 */
self.serpstatUtils.validateApiToken = function(token) {
  if (!token) return false;
  
  // 清除可能的空格
  const cleanToken = token.trim();
  
  // 基本格式验证：令牌应该是一个有效字符串
  if (cleanToken.length < 8) {
    console.warn('API令牌格式不正确：长度过短');
    return false;
  }
  
  // 检查是否包含无效字符
  const invalidChars = /[^a-zA-Z0-9\-_]/;
  if (invalidChars.test(cleanToken)) {
    console.warn('API令牌包含无效字符');
    return false;
  }
  
  return true;
};

/**
 * 修改testApiToken方法，增强错误处理
 * @returns {Promise<{isValid: boolean, details: string}>} - API标记验证结果
 */
self.serpstatUtils.testApiToken = async function() {
  try {
    const token = await self.serpstatUtils.getApiToken();
    if (!token) {
      console.error('未设置Serpstat API标记');
      return {
        isValid: false,
        details: 'Missing token!'
      };
    }
    
    // 验证令牌格式
    if (!self.serpstatUtils.validateApiToken(token)) {
      return {
        isValid: false,
        details: 'Invalid token format!'
      };
    }
    
    // 记录API标记(部分隐藏)用于诊断
    const maskedToken = token.length > 8 ? 
      token.substring(0, 4) + '****' + token.substring(token.length - 4) : 
      '****' + token.substring(token.length - 4);
    console.log(`正在测试API标记: ${maskedToken} (长度: ${token.length}字符)`);
    
    // 修改：根据Serpstat API文档要求调整请求格式
    // 根据文档：https://serpstat.com/api/664-request-parameters-v4/
    // API请求URL应为 api.serpstat.com/v4/?token={token}
    const requestBody = {
      id: 1,
      method: 'SerpstatLimitsProcedure.getStats'
    };
    
    console.log('发送测试API请求:', JSON.stringify(requestBody, null, 2));
    
    // 使用credits.getStats接口测试API标记
    const response = await fetch(`https://api.serpstat.com/v4/?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API测试HTTP请求失败: ${response.status} ${response.statusText}，响应内容: ${errorText}`);
      return {
        isValid: false,
        details: `API请求失败: ${response.status} ${response.statusText}，响应内容: ${errorText.substring(0, 100)}`
      };
    }
    
    const data = await response.json();
    console.log('收到API测试响应:', JSON.stringify(data, null, 2));
    
    // 检查响应是否为有效对象
    if (!data || typeof data !== 'object') {
      console.error('API返回无效响应:', data);
      return {
        isValid: false,
        details: `API返回无效响应: ${JSON.stringify(data)}`
      };
    }
    
    // 修改：增强错误处理
    if (data.error) {
      const errorCode = data.error.code || 'undefined';
      const errorMessage = data.error.message || '未知错误';
      console.error(`API测试返回错误: 代码=${errorCode}, 消息=${errorMessage}`);
      
      // 特殊处理一些常见错误
      if (errorMessage.includes('Missing token')) {
        return {
          isValid: false,
          details: `API错误: 缺少令牌 - 请确保令牌正确配置`
        };
      } else if (errorMessage.includes('Method not found')) {
        return {
          isValid: false,
          details: `API错误: 方法不存在 - Serpstat API可能已更改，请联系开发者`
        };
      } else if (errorMessage.includes('Bad token')) {
        return {
          isValid: false,
          details: `API错误: 无效的API令牌 - 请检查您的令牌是否正确`
        };
      }
      
      return {
        isValid: false,
        details: `API错误: ${errorMessage} (代码: ${errorCode})`
      };
    }
    
    // 标准成功响应检查
    if (data.status_code !== undefined && data.status_code !== 200) {
      const errorCode = data.status_code || 'undefined';
      const errorMessage = data.status_message || '未知错误';
      console.error(`API测试返回错误: 代码=${errorCode}, 消息=${errorMessage}`);
      
      return {
        isValid: false,
        details: `API错误: ${errorMessage} (代码: ${errorCode})`
      };
    }
    
    // 检查结果是否有效
    if (!data.result && !data.data) {
      console.error('API返回无效结果:', data);
      return {
        isValid: false,
        details: `API返回无效结果: ${JSON.stringify(data)}`
      };
    }
    
    // 提取剩余配额信息 (考虑不同的响应格式)
    const result = data.result || data.data || {};
    const remainingCredits = result.estimatedCredits || result.credits || result.remainingCredits || 0;
    console.log(`API标记有效，剩余配额: ${remainingCredits}`);
    
    return {
      isValid: true,
      details: `API标记有效，剩余配额: ${remainingCredits}`,
      remainingCredits: remainingCredits
    };
  } catch (error) {
    console.error('测试API标记时出错:', error);
    return {
      isValid: false,
      details: `测试过程中出错: ${error.message || '未知错误'}，请检查网络连接和API配置`
    };
  }
};

/**
 * 查询域名流量信息
 * @param {string} domain - 要查询的域名
 * @param {number} [recursiveDepth=0] - 递归深度，用于防止无限递归
 * @returns {Promise<Object>} - 包含流量数据的对象
 */
self.serpstatUtils.queryTraffic = async function(domain, recursiveDepth = 0) {
  const MAX_RECURSIVE_DEPTH = 1; // 最大递归深度
  
  try {
    // 防止无限递归
    if (recursiveDepth > MAX_RECURSIVE_DEPTH) {
      console.error(`达到最大递归深度 ${MAX_RECURSIVE_DEPTH}，停止处理域名: ${domain}`);
      return {
        domain: domain,
        totalVisits: 0,
        error: '域名解析达到最大递归深度'
      };
    }
    
    const token = await self.serpstatUtils.getApiToken();
    if (!token) {
      throw new Error('未设置Serpstat API标记');
    }
    
    // 首先检查缓存
    const cachedData = await self.serpstatUtils.getCachedTrafficData(domain);
    if (cachedData) {
      return cachedData;
    }
    
    // 进行API预检查
    const preflightResult = self.serpstatUtils.preflightCheck(domain);
    if (!preflightResult.valid) {
      console.warn(`域名 ${domain} 预检失败: ${preflightResult.reason}`);
      return {
        domain: domain,
        totalVisits: 0,
        error: `${preflightResult.reason} - ${preflightResult.details}`
      };
    }
    
    // 检查是否是多级域名
    let domainToQuery = domain;
    if (domain.split('.').length > 2) {
      // 如果是多级域名，尝试使用主域名
      const mainDomain = self.serpstatUtils.getMainDomain(domain);
      if (mainDomain !== domain) {
        console.warn(`域名 ${domain} 是多级域名，尝试使用主域名 ${mainDomain} 查询`);
        domainToQuery = mainDomain;
      }
    }
    
    // 准备查询域名
    console.log(`准备查询域名: ${domainToQuery}`);
    
    // 构建API请求
    const databases = self.serpstatUtils.getAvailableDatabases();
    
    // 修改：确保'se'参数是字符串类型，domains是数组
    const requestBody = {
      id: 1,
      method: 'SerpstatDomainProcedure.getDomainsInfo',
      params: {
        domains: [domainToQuery], // 使用数组形式
        se: String(databases[0])  // 确保将数据库ID转换为字符串
      }
    };
    
    console.log('发送API请求:', JSON.stringify(requestBody, null, 2));
    
    // 添加随机延迟，避免"Too many requests"错误
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    // 使用domain.info接口获取域名流量信息
    const response = await fetch(`https://api.serpstat.com/v4/?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API HTTP请求失败: ${response.status} ${response.statusText}，响应内容: ${errorText}`);
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }
    
    let data = await response.json();
    console.log('收到API响应:', JSON.stringify(data, null, 2));
    
    // 增强的错误处理：检查API响应是否包含错误
    if (!data || typeof data !== 'object') {
      console.error('API返回无效响应:', data);
      return {
        domain: domain,
        totalVisits: 0,
        error: '收到无效的API响应'
      };
    }
    
    // 处理特定的错误消息
    if (data.error) {
      const errorCode = data.error.code || 'undefined';
      const errorMessage = data.error.message || '未知错误';
      console.error(`API返回错误: 代码=${errorCode}, 消息=${errorMessage}`);
      
      // 特殊处理某些特定错误
      if (errorMessage.includes('Type of "se" must be a "string"')) {
        console.error('数据库ID格式错误，尝试使用字符串格式重新请求');
        
        // 创建一个新的请求体，确保se参数是字符串
        const correctedRequestBody = {
          id: 1,
          method: 'SerpstatDomainProcedure.getDomainsInfo',
          params: {
            domains: [domainToQuery],
            se: String(databases[0]) // 强制转换为字符串
          }
        };
        
        console.log('使用修正的请求体重新发送请求:', JSON.stringify(correctedRequestBody, null, 2));
        
        // 使用修正的请求重新发送
        const correctedResponse = await fetch(`https://api.serpstat.com/v4/?token=${encodeURIComponent(token)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(correctedRequestBody)
        });
        
        if (!correctedResponse.ok) {
          return {
            domain: domain,
            totalVisits: 0,
            error: `重试请求失败: ${correctedResponse.status} ${correctedResponse.statusText}`
          };
        }
        
        const correctedData = await correctedResponse.json();
        console.log('收到修正请求的响应:', JSON.stringify(correctedData, null, 2));
        
        // 继续处理修正后的响应
        if (correctedData.error) {
          return {
            domain: domain,
            totalVisits: 0,
            error: `修正请求后仍报错: ${correctedData.error.message || '未知错误'}`
          };
        }
        
        // 替换原始数据进行后续处理
        data = correctedData;
      } else {
        return {
          domain: domain,
          totalVisits: 0,
          error: `API错误: ${errorMessage} (代码: ${errorCode})`
        };
      }
    }
    
    // 标准成功响应检查
    if (data.status_code !== undefined && data.status_code !== 200) {
      const errorCode = data.status_code || 'undefined';
      const errorMessage = data.status_message || '未知错误';
      console.error(`API返回错误: 代码=${errorCode}, 消息=${errorMessage}`);
      
      return {
        domain: domain,
        totalVisits: 0,
        error: `API错误: ${errorMessage} (代码: ${errorCode})`
      };
    }
    
    // 尝试从不同格式的响应中提取结果数据
    const result = data.result || data.data || {};
    
    // 修正：根据实际API响应格式处理数据
    // 检查是否存在data数组或domains对象，兼容不同的API响应格式
    if (result.data && Array.isArray(result.data) && result.data.length > 0) {
      // 处理data数组格式
      console.log('使用data数组格式处理响应');
      
      // 尝试从data数组中找到匹配的域名
      const domainData = result.data.find(item => 
        item.domain && item.domain.toLowerCase() === domainToQuery.toLowerCase()
      );
      
      if (domainData) {
        // 提取流量数据 (traff字段是Serpstat API中的流量字段)
        const visits = domainData.traff || 0;
        
        const resultObj = {
          domain: domain,
          totalVisits: parseInt(visits, 10) || 0,
          timestamp: Date.now(),
          rawData: domainData
        };
        
        // 缓存数据
        await self.serpstatUtils.cacheTrafficData(domain, resultObj);
        
        return resultObj;
      }
    } else if (result.domains && Array.isArray(result.domains) && result.domains.length > 0) {
      // 处理原有的domains数组格式（兼容性保留）
      console.log('使用domains数组格式处理响应');
      
      // 尝试从所有返回的域名中找到匹配的
      const domainData = result.domains.find(item => 
        item.name && item.name.toLowerCase() === domainToQuery.toLowerCase()
      ) || result.domains[0];
      
      // 检查是否找到域名数据
      if (domainData) {
        // 提取流量估算值（兼容不同的字段名）
        const visits = domainData.trafficCount || domainData.trafficVolume || domainData.traffic || 0;
        
        const resultObj = {
          domain: domain,
          totalVisits: parseInt(visits, 10) || 0,
          timestamp: Date.now(),
          rawData: domainData
        };
        
        // 缓存数据
        await self.serpstatUtils.cacheTrafficData(domain, resultObj);
        
        return resultObj;
      }
    }
    
    // 如果没有找到匹配的域名数据
    console.log('API返回了响应，但未找到匹配的域名数据:', result);
    return {
      domain: domain,
      totalVisits: 0,
      error: '找不到该域名的数据'
    };
    
  } catch (error) {
    console.error(`查询域名 ${domain} 流量出错:`, error);
    return {
      domain: domain,
      totalVisits: 0,
      error: error.message || '未知错误'
    };
  }
};

/**
 * 批量查询多个域名的流量
 * @param {string[]} domains - 要查询的域名数组
 * @param {Function} [progressCallback] - 进度回调函数，接收参数：当前域名、进度百分比、状态
 * @param {boolean} [useAllRegions=false] - 是否查询所有地区的总流量
 * @returns {Promise<Object>} - 返回域名到流量数据的映射
 */
self.serpstatUtils.batchQueryTraffic = async function(domains, progressCallback, useAllRegions = false) {
  const results = {};
  const total = domains.length;
  const MAX_RETRIES = 2; // 最大重试次数
  
  // 首先验证API标记
  if (progressCallback) {
    progressCallback('验证API标记', 0, 'processing');
  }
  
  // 测试API标记是否有效
  console.log('开始测试API标记有效性...');
  const keyTest = await self.serpstatUtils.testApiToken();
  console.log('API标记测试结果:', keyTest);
  
  if (!keyTest.isValid) {
    const errorMessage = keyTest.details || '无效的Serpstat API标记，请检查设置并确保标记有效';
    if (progressCallback) {
      progressCallback('API标记验证失败', 100, 'error', errorMessage);
    }
    
    console.error('API标记验证失败:', errorMessage);
    
    // 为所有域名创建错误结果
    domains.forEach(domain => {
      results[domain] = {
        domain: domain,
        totalVisits: 0,
        error: errorMessage
      };
    });
    
    return results;
  }
  
  // 显示有关API密钥的更多信息
  console.log(`API标记有效，继续查询${domains.length}个域名的流量数据`);
  
  if (progressCallback) {
    const message = `API标记有效，剩余配额: ${keyTest.remainingCredits || '未知'}，准备查询${domains.length}个域名`;
    progressCallback(message, 5, 'processing');
  }
  
  // Serpstat API限制了并发请求，所以我们需要一个接一个地处理域名
  for (let i = 0; i < domains.length; i++) {
    const domain = domains[i];
    
    // 计算进度
    const progress = Math.round(5 + (i / total) * 95); // 从5%开始(验证API占5%)
    
    if (progressCallback) {
      progressCallback(domain, progress, 'processing');
    }
    
    // 尝试查询，带重试机制
    let retries = 0;
    let success = false;
    let lastError = null;
    
    while (retries <= MAX_RETRIES && !success) {
      try {
        // 为了避免API限流，每次查询都添加随机延迟
        const delayTime = 2000 + (retries * 2000) + Math.random() * 1000; // 增加更长的延迟时间
        console.log(`等待${delayTime}毫秒后查询域名 ${domain} (重试次数: ${retries})`);
        await new Promise(resolve => setTimeout(resolve, delayTime));
        
        console.log(`开始查询域名 ${domain} (重试次数: ${retries})`);
        
        // 查询流量数据 - 根据useAllRegions参数决定使用哪个方法
        let result;
        if (useAllRegions) {
          console.log(`使用getAllRegionsTraffic查询所有地区的总流量`);
          result = await self.serpstatUtils.getAllRegionsTraffic(domain);
        } else {
          console.log(`使用queryTraffic查询单个地区的流量`);
          result = await self.serpstatUtils.queryTraffic(domain);
        }
        
        results[domain] = result;
        
        if (result.error) {
          console.warn(`域名 ${domain} 查询返回错误: ${result.error}`);
          lastError = result.error;
          
          // 特殊处理"Too many requests!"错误
          if (result.error.includes('Too many requests!')) {
            // 当遇到频率限制错误时，增加更长的延迟
            if (retries < MAX_RETRIES) {
              retries++;
              const extraDelay = 5000 + (retries * 3000);
              console.log(`检测到频率限制错误，等待${extraDelay}毫秒后重试...`);
              
              if (progressCallback) {
                progressCallback(domain, progress, 'processing', `API频率限制，等待${Math.round(extraDelay/1000)}秒后重试 (${retries}/${MAX_RETRIES})`);
              }
              
              await new Promise(resolve => setTimeout(resolve, extraDelay));
              continue; // 重试
            }
          }
          
          // 判断是否需要重试的错误类型
          const isRetryableError = 
            !result.error.includes('找不到该域名的数据') && 
            !result.error.includes('域名格式不正确') && 
            !result.error.includes('不被Serpstat支持');
          
          // 如果是可重试的错误并且未达到最大重试次数
          if (isRetryableError && retries < MAX_RETRIES) {
            retries++;
            console.log(`准备第${retries}次重试查询域名 ${domain}`);
            
            if (progressCallback) {
              progressCallback(domain, progress, 'processing', `准备重试 (${retries}/${MAX_RETRIES}): ${result.error}`);
            }
            
            continue; // 重试
          } else {
            // 达到最大重试次数或不需要重试的错误
            if (progressCallback) {
              progressCallback(domain, progress, 'error', result.error);
            }
            
            console.log(`域名 ${domain} 查询失败，不再重试: ${result.error}`);
            success = true; // 标记为完成，不再重试
          }
        } else {
          // 查询成功
          if (progressCallback) {
            progressCallback(domain, progress, 'success');
          }
          
          console.log(`域名 ${domain} 查询成功，流量: ${result.totalVisits}`);
          success = true;
        }
      } catch (error) {
        console.error(`查询域名 ${domain} 出错 (重试次数: ${retries}):`, error);
        lastError = error.message || '未知错误';
        
        // 检查是否可以重试
        if (retries < MAX_RETRIES) {
          retries++;
          console.log(`准备第${retries}次重试查询域名 ${domain} (发生异常)`);
          
          if (progressCallback) {
            progressCallback(domain, progress, 'processing', `准备重试 (${retries}/${MAX_RETRIES}): ${lastError}`);
          }
          
          continue; // 重试
        } else {
          // 达到最大重试次数
          results[domain] = {
            domain: domain,
            totalVisits: 0,
            error: lastError
          };
          
          if (progressCallback) {
            progressCallback(domain, progress, 'error', lastError);
          }
          
          console.log(`域名 ${domain} 查询失败，达到最大重试次数`);
          success = true; // 标记为完成，不再重试
        }
      }
    }
    
    // 在每个域名查询完成后添加额外的延迟，避免API频率限制
    if (i < domains.length - 1) {
      const betweenDomainsDelay = 3000 + Math.random() * 2000;
      console.log(`域名间延迟: 等待${betweenDomainsDelay}毫秒后继续下一个域名查询`);
      await new Promise(resolve => setTimeout(resolve, betweenDomainsDelay));
    }
  }
  
  // 最终进度更新为100%
  if (progressCallback) {
    const successCount = Object.values(results).filter(r => !r.error).length;
    const errorCount = Object.values(results).filter(r => r.error).length;
    
    if (errorCount > 0) {
      progressCallback(`完成: ${successCount}个成功, ${errorCount}个失败`, 100, 'complete');
    } else {
      progressCallback(`全部${successCount}个域名查询成功`, 100, 'complete');
    }
  }
  
  return results;
};

/**
 * 缓存流量数据
 * @param {string} domain - 域名
 * @param {Object} data - 流量数据
 * @returns {Promise<boolean>} - 缓存成功返回true
 */
self.serpstatUtils.cacheTrafficData = async function(domain, data) {
  try {
    if (!self.domainToolStorage) return false;
    
    // 获取当前缓存
    const storedData = await self.domainToolStorage.local.get('trafficCache');
    const cache = storedData.trafficCache || {};
    
    // 更新缓存
    cache[domain] = {
      ...data,
      cacheTimestamp: Date.now()
    };
    
    // 存储更新后的缓存
    await self.domainToolStorage.local.set({ trafficCache: cache });
    return true;
  } catch (error) {
    console.error('缓存流量数据出错:', error);
    return false;
  }
};

/**
 * 获取缓存的流量数据
 * @param {string} domain - 域名
 * @param {number} [maxAge=86400000] - 缓存最大年龄（毫秒），默认1天
 * @returns {Promise<Object|null>} - 返回缓存的数据或null（如果无缓存或过期）
 */
self.serpstatUtils.getCachedTrafficData = async function(domain, maxAge = 86400000) {
  try {
    if (!self.domainToolStorage) return null;
    
    // 获取当前缓存
    const storedData = await self.domainToolStorage.local.get('trafficCache');
    const cache = storedData.trafficCache || {};
    
    // 检查域名是否有缓存
    if (!cache[domain]) return null;
    
    // 检查缓存是否过期
    const cacheAge = Date.now() - cache[domain].cacheTimestamp;
    if (cacheAge > maxAge) return null;
    
    return cache[domain];
  } catch (error) {
    console.error('获取缓存流量数据出错:', error);
    return null;
  }
};

/**
 * 格式化流量数字
 * @param {number} count - 流量数
 * @returns {string} - 格式化后的字符串
 */
self.serpstatUtils.formatTrafficCount = function(count) {
  if (!count && count !== 0) return '未知';
  
  // 转换为数字以确保格式一致
  const num = Number(count);
  if (isNaN(num)) return '未知';
  
  // 格式化大数字
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  } else if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  } else {
    return num.toString();
  }
};

/**
 * 查询域名在所有地区的流量信息
 * @param {string} domain - 要查询的域名
 * @returns {Promise<Object>} - 包含所有地区流量数据的对象
 */
self.serpstatUtils.getAllRegionsTraffic = async function(domain) {
  try {
    const token = await self.serpstatUtils.getApiToken();
    if (!token) {
      throw new Error('未设置Serpstat API标记');
    }
    
    // 首先检查缓存
    const cachedData = await self.serpstatUtils.getCachedTrafficData(domain);
    if (cachedData && cachedData.regionData) {
      console.log(`使用缓存的所有地区流量数据: ${domain}`);
      return cachedData;
    }
    
    // 检查是否是多级域名
    let domainToQuery = domain;
    if (domain.split('.').length > 2) {
      // 如果是多级域名，尝试使用主域名
      const mainDomain = self.serpstatUtils.getMainDomain(domain);
      if (mainDomain !== domain) {
        console.warn(`域名 ${domain} 是多级域名，尝试使用主域名 ${mainDomain} 查询所有地区流量`);
        domainToQuery = mainDomain;
      }
    }
    
    console.log(`准备查询域名 ${domainToQuery} 在所有地区的流量`);
    
    // 构建API请求 - 使用SerpstatDomainProcedure.getAllRegionsTraffic方法
    const requestBody = {
      id: 1,
      method: 'SerpstatDomainProcedure.getAllRegionsTraffic',
      params: {
        domain: domainToQuery,
        sort: "traff",
        order: "desc"
      }
    };
    
    console.log('发送所有地区流量查询请求:', JSON.stringify(requestBody, null, 2));
    
    // 添加随机延迟，避免"Too many requests"错误
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    // 发送API请求
    const response = await fetch(`https://api.serpstat.com/v4/?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API HTTP请求失败: ${response.status} ${response.statusText}，响应内容: ${errorText}`);
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('收到所有地区流量响应:', JSON.stringify(data, null, 2));
    
    // 增强的错误处理：检查API响应是否包含错误
    if (!data || typeof data !== 'object') {
      console.error('API返回无效响应:', data);
      return {
        domain: domain,
        totalVisits: 0,
        error: '收到无效的API响应'
      };
    }
    
    // 处理特定的错误情况
    if (data.error) {
      const errorCode = data.error.code || 'undefined';
      const errorMessage = data.error.message || '未知错误';
      console.error(`API返回错误: 代码=${errorCode}, 消息=${errorMessage}`);
      
      // 特殊处理Method not found错误
      if (errorMessage.includes('Method not found')) {
        console.error('方法未找到错误，尝试使用替代方法');
        
        // 尝试使用一个不同的方法名格式（首字母大写，其他小写）
        const retryRequestBody = {
          id: 1,
          method: 'SerpstatDomainProcedure.GetAllRegionsTraffic', // 使用大驼峰命名法
          params: {
            domain: domainToQuery,
            sort: "traff",
            order: "desc"
          }
        };
        
        console.log('使用替代方法名重新发送请求:', JSON.stringify(retryRequestBody, null, 2));
        
        // 重新发送请求
        const retryResponse = await fetch(`https://api.serpstat.com/v4/?token=${encodeURIComponent(token)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(retryRequestBody)
        });
        
        if (!retryResponse.ok) {
          return {
            domain: domain,
            totalVisits: 0,
            error: `重试请求失败: ${retryResponse.status} ${retryResponse.statusText}`
          };
        }
        
        const retryData = await retryResponse.json();
        console.log('收到重试请求的响应:', JSON.stringify(retryData, null, 2));
        
        // 如果重试仍然失败，尝试使用常规的queryTraffic方法获取单一地区数据
        if (retryData.error) {
          console.warn('替代方法也失败，回退到基本流量查询');
          return self.serpstatUtils.queryTraffic(domain);
        }
        
        // 替换原始数据
        data = retryData;
      } else {
        return {
          domain: domain,
          totalVisits: 0,
          error: `API错误: ${errorMessage} (代码: ${errorCode})`
        };
      }
    }
    
    // 尝试从不同格式的响应中提取结果数据
    const result = data.result || data.data || {};
    
    // 检查是否有summary_info和total_traff字段
    if (result.summary_info && result.summary_info.total_traff) {
      // 获取所有地区总流量
      const totalTraffic = result.summary_info.total_traff;
      
      const resultObj = {
        domain: domain,
        totalVisits: parseInt(totalTraffic, 10) || 0,
        timestamp: Date.now(),
        rawData: result,
        regionData: {} // 初始化空的地区数据对象
      };
      
      // 尝试提取各个地区的详细数据
      if (result.data) {
        for (const regionKey in result.data) {
          if (result.data[regionKey] && result.data[regionKey].traff) {
            resultObj.regionData[regionKey] = {
              region: result.data[regionKey].region || regionKey,
              countryName: result.data[regionKey].country_name_en || '未知',
              traffic: parseInt(result.data[regionKey].traff, 10) || 0
            };
          }
        }
      }
      
      // 缓存数据
      await self.serpstatUtils.cacheTrafficData(domain, resultObj);
      
      return resultObj;
    } else if (result.data) {
      // 如果没有summary_info.total_traff，尝试手动计算所有地区流量之和
      let totalTraffic = 0;
      const regionData = {};
      
      // 遍历所有地区数据
      for (const regionKey in result.data) {
        if (result.data[regionKey] && result.data[regionKey].traff) {
          const regionTraffic = parseInt(result.data[regionKey].traff, 10) || 0;
          totalTraffic += regionTraffic;
          
          // 保存地区数据
          regionData[regionKey] = {
            region: result.data[regionKey].region || regionKey,
            countryName: result.data[regionKey].country_name_en || '未知',
            traffic: regionTraffic
          };
        }
      }
      
      const resultObj = {
        domain: domain,
        totalVisits: totalTraffic,
        timestamp: Date.now(),
        rawData: result,
        regionData: regionData  // 保存各地区的详细数据
      };
      
      // 缓存数据
      await self.serpstatUtils.cacheTrafficData(domain, resultObj);
      
      return resultObj;
    }
    
    // 如果无法提取流量数据，尝试使用常规的queryTraffic方法
    console.warn('无法从响应中提取所有地区流量数据，尝试使用单一地区查询');
    return self.serpstatUtils.queryTraffic(domain);
    
  } catch (error) {
    console.error(`查询域名 ${domain} 所有地区流量出错:`, error);
    return {
      domain: domain,
      totalVisits: 0,
      error: error.message || '未知错误'
    };
  }
}; 