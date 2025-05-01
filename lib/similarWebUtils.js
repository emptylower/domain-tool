/**
 * 域名识别与管理工具 - SimilarWeb API工具库
 */

// 创建工具对象
self.similarWebUtils = {};

/**
 * SimilarWeb API密钥
 * 注意：实际使用中应从安全的配置中获取
 * @type {string}
 */
self.similarWebUtils.apiKey = ''; // 需要从设置中获取

/**
 * 设置API密钥
 * @param {string} key - SimilarWeb API密钥
 */
self.similarWebUtils.setApiKey = function(key) {
  self.similarWebUtils.apiKey = key;
  // 保存到存储中便于持久化
  if (self.domainToolStorage) {
    self.domainToolStorage.local.set({ similarWebApiKey: key });
  }
};

/**
 * 获取API密钥
 * @returns {Promise<string>} - SimilarWeb API密钥
 */
self.similarWebUtils.getApiKey = async function() {
  if (self.similarWebUtils.apiKey) {
    return self.similarWebUtils.apiKey;
  }
  
  // 从存储中获取
  if (self.domainToolStorage) {
    const data = await self.domainToolStorage.local.get('similarWebApiKey');
    self.similarWebUtils.apiKey = data.similarWebApiKey || '';
    return self.similarWebUtils.apiKey;
  }
  
  return '';
};

/**
 * 检查域名是否可能不被SimilarWeb支持
 * @param {string} domain - 要检查的域名
 * @returns {boolean} - 如果域名可能不被支持，返回true
 */
self.similarWebUtils.isUnsupportedDomain = function(domain) {
  if (!domain) return true;
  
  // 检查特殊情况
  // 1. 域名太短（少于5个字符）
  // 2. 不包含点号的域名
  // 3. 特殊的短域名服务
  // 4. 三级或更高级别域名（包含多个点号）
  // 5. 开头或结尾有特殊字符的域名
  // 6. IP地址形式的域名
  
  const shortDomainServices = ['t.co', 'bit.ly', 'goo.gl', 'tinyurl.com', 'ow.ly'];
  
  // 基本验证
  if (domain.length < 5) {
    console.warn(`域名 ${domain} 太短，可能不被支持`);
    return true;
  }
  
  if (!domain.includes('.')) {
    console.warn(`域名 ${domain} 不包含点号，格式不正确`);
    return true;
  }
  
  // 检测域名是否为IP地址
  const ipPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
  if (ipPattern.test(domain)) {
    console.warn(`域名 ${domain} 是IP地址，SimilarWeb不支持`);
    return true;
  }
  
  // 检测域名是否包含无效字符
  const invalidCharsPattern = /[^a-zA-Z0-9\-\.]/;
  if (invalidCharsPattern.test(domain)) {
    console.warn(`域名 ${domain} 包含无效字符`);
    return true;
  }
  
  // 检查是否是已知的短域名服务
  for (const shortService of shortDomainServices) {
    if (domain.includes(shortService)) {
      console.warn(`域名 ${domain} 是短域名服务，可能不被支持`);
      return true;
    }
  }
  
  // 检查是否是三级或更高级别域名
  const parts = domain.split('.');
  if (parts.length > 2) {
    // 某些特殊的二级域名结构，如co.uk，应该视为一个部分
    const specialTlds = ['co.uk', 'com.cn', 'com.hk', 'org.cn', 'net.cn', 'edu.cn', 'co.jp', 'ac.cn'];
    const lastTwoParts = parts.slice(-2).join('.');
    
    if (specialTlds.includes(lastTwoParts)) {
      // 对于特殊的二级域名，如果总级别超过3，仍然视为不支持
      if (parts.length > 3) {
        console.warn(`域名 ${domain} 是具有特殊TLD的多级域名，级别超过3，可能不被支持`);
        return true;
      }
    } else {
      console.warn(`域名 ${domain} 是多级域名，SimilarWeb可能不支持`);
      return true;
    }
  }
  
  return false;
};

/**
 * 获取域名的主域名部分
 * @param {string} domain - 完整域名
 * @returns {string} - 主域名部分
 */
self.similarWebUtils.getMainDomain = function(domain) {
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
self.similarWebUtils.isValidDomainFormat = function(domain) {
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
self.similarWebUtils.preflightCheck = function(domain) {
  // 检查域名格式是否有效
  if (!self.similarWebUtils.isValidDomainFormat(domain)) {
    return {
      valid: false,
      reason: '域名格式不符合规范',
      details: '域名应该由字母、数字、连字符组成，以有效的顶级域名结尾'
    };
  }
  
  // 如果被isUnsupportedDomain函数标记为不支持
  if (self.similarWebUtils.isUnsupportedDomain(domain)) {
    return {
      valid: false,
      reason: '域名类型不被SimilarWeb支持',
      details: '可能是多级子域名、IP地址或特殊格式的域名'
    };
  }
  
  // 特殊的顶级域名检查
  const tldChecks = [
    { pattern: /\.(gov|mil|edu)$/, message: '政府、军事或教育机构域名可能无法查询' },
    { pattern: /\.(local|internal|test|example|invalid|localhost)$/, message: '非公开或测试用域名' },
    { pattern: /\.(arpa|onion)$/, message: '特殊用途域名，可能无法查询' }
  ];
  
  for (const check of tldChecks) {
    if (check.pattern.test(domain)) {
      return {
        valid: false,
        reason: `特殊的顶级域名: ${check.message}`,
        details: '这类域名通常在SimilarWeb中没有流量数据'
      };
    }
  }
  
  // 检查新顶级域名
  const newTlds = [
    'dev', 'app', 'xyz', 'club', 'shop', 'site', 'online', 'tech', 'store'
  ];
  
  const domainTld = domain.split('.').pop().toLowerCase();
  if (newTlds.includes(domainTld)) {
    return {
      valid: true,
      warning: '新顶级域名可能数据有限',
      details: '此类域名在SimilarWeb中的数据覆盖可能不如传统顶级域名完整'
    };
  }
  
  return { valid: true };
};

/**
 * API端点配置
 */
self.similarWebUtils.apiEndpoints = {
  // 按优先级排序的访问量端点
  traffic: [
    // 基本端点，大多数API密钥都能访问
    {
      path: '/v1/website/{domain}/traffic-and-engagement/visits',
      params: 'api_key={apiKey}&start_date={startDate}&end_date={endDate}&main_domain_only=true&country=world&format=json',
      dataExtractor: (data) => data.visits || 0
    },
    // 备选端点，可能需要更高权限
    {
      path: '/v1/website/{domain}/total-traffic-and-engagement/visits',
      params: 'api_key={apiKey}&start_date={startDate}&end_date={endDate}&granularity=monthly&main_domain_only=false&format=json',
      dataExtractor: (data) => {
        if (data.visits) return data.visits;
        if (data.records && data.records.length > 0) {
          return data.records.reduce((sum, record) => sum + (record.visits || 0), 0);
        }
        return 0;
      }
    },
    // 最后尝试API Lite端点，几乎所有密钥都能访问
    {
      path: '/v1/website/{domain}/general-data/all-traffic',
      params: 'api_key={apiKey}&format=json',
      dataExtractor: (data) => data.EstimatedMonthlyVisits || 0
    },
    // Similarweb Lite端点 - 最基础的访问量数据
    {
      path: '/v1/website/{domain}/traffic-and-engagement/visits',
      params: 'api_key={apiKey}&start_date={startDate}&end_date={endDate}&granularity=monthly&format=json',
      dataExtractor: (data) => data.visits || 0
    },
    // 网站基本信息端点 - 免费层级通常可访问
    {
      path: '/v1/website/{domain}/general-data/summary',
      params: 'api_key={apiKey}&format=json',
      dataExtractor: (data) => data.EstimatedMonthlyVisits || 0
    }
  ]
};

// 添加Batch API支持
self.similarWebUtils.batchApiSupport = {
  // Batch API端点
  endpoints: {
    requestReport: 'https://api.similarweb.com/batch/v4/request-report',
    requestStatus: 'https://api.similarweb.com/batch/v4/request-status/{report_id}',
    retryRequest: 'https://api.similarweb.com/batch/v4/retry-request/{report_id}'
  },
  
  // 创建批处理请求
  createBatchRequest: async function(domain, apiKey) {
    try {
      console.log(`创建批处理请求，查询域名: ${domain}`);
      
      // 构建请求体
      const currentDate = new Date();
      const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const formatDate = date => `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const lastMonthFormatted = formatDate(lastMonth);
      
      const requestBody = {
        report_query: {
          tables: [
            {
              vtable: "traffic_and_engagement",
              granularity: "monthly",
              metrics: ["visits"],
              filters: {
                domains: [domain]
              },
              start_date: lastMonthFormatted,
              end_date: lastMonthFormatted
            }
          ]
        },
        delivery_information: {
          delivery_method: "download_link",
          response_format: "json"
        }
      };
      
      // 设置请求选项
      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      };
      
      // 发送请求
      const response = await fetch(this.endpoints.requestReport, requestOptions);
      console.log(`批处理请求响应状态码: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`批处理请求失败: ${response.status}`, errorText);
        throw new Error(`批处理请求失败: ${response.status} - ${errorText.substring(0, 100)}`);
      }
      
      const data = await response.json();
      console.log(`批处理请求成功，reportId: ${data.report_id}`);
      
      return data.report_id;
    } catch (error) {
      console.error('创建批处理请求出错:', error);
      throw error;
    }
  },
  
  // 检查请求状态
  checkRequestStatus: async function(reportId, apiKey) {
    try {
      console.log(`检查请求状态，reportId: ${reportId}`);
      
      const statusUrl = this.endpoints.requestStatus.replace('{report_id}', reportId);
      
      // 设置请求选项
      const requestOptions = {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      };
      
      // 发送请求
      const response = await fetch(statusUrl, requestOptions);
      console.log(`状态检查响应状态码: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`状态检查失败: ${response.status}`, errorText);
        throw new Error(`状态检查失败: ${response.status} - ${errorText.substring(0, 100)}`);
      }
      
      const statusData = await response.json();
      console.log(`请求状态: ${statusData.status}`);
      
      return statusData;
    } catch (error) {
      console.error('检查请求状态出错:', error);
      throw error;
    }
  },
  
  // 等待请求完成并获取结果
  waitForCompletion: async function(reportId, apiKey, maxAttempts = 10, interval = 3000) {
    try {
      console.log(`等待请求完成，reportId: ${reportId}`);
      
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        console.log(`检查状态次数: ${attempt + 1}/${maxAttempts}`);
        
        const statusData = await this.checkRequestStatus(reportId, apiKey);
        
        // 根据状态处理
        switch (statusData.status) {
          case 'completed':
            console.log('请求已完成，下载URL:', statusData.download_url);
            return {
              success: true,
              downloadUrl: statusData.download_url,
              usedQuota: statusData.used_quota,
              dataPointsCount: statusData.data_points_count
            };
          
          case 'pending':
          case 'processing':
          case 'retry':
            console.log(`请求正在处理中，状态: ${statusData.status}，等待${interval/1000}秒后重试...`);
            await new Promise(resolve => setTimeout(resolve, interval));
            break;
          
          case 'bad_request':
          case 'internal_error':
            console.error(`请求失败，状态: ${statusData.status}`);
            return {
              success: false,
              error: `批处理请求失败: ${statusData.status}`
            };
          
          default:
            console.warn(`未知状态: ${statusData.status}，继续等待...`);
            await new Promise(resolve => setTimeout(resolve, interval));
        }
      }
      
      // 超过最大尝试次数
      return {
        success: false,
        error: `请求超时，超过${maxAttempts}次检查后仍未完成`
      };
    } catch (error) {
      console.error('等待请求完成出错:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  // 从下载URL获取数据
  fetchResultData: async function(downloadUrl) {
    try {
      console.log(`获取结果数据，URL: ${downloadUrl}`);
      
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`获取结果数据失败: ${response.status}`, errorText);
        throw new Error(`获取结果数据失败: ${response.status} - ${errorText.substring(0, 100)}`);
      }
      
      const resultData = await response.json();
      console.log('成功获取结果数据');
      
      return resultData;
    } catch (error) {
      console.error('获取结果数据出错:', error);
      throw error;
    }
  },
  
  // 处理结果数据，提取访问量
  processResultData: function(resultData, domain) {
    try {
      console.log('处理结果数据');
      
      // 检查结果格式
      if (!resultData || !Array.isArray(resultData) || resultData.length === 0) {
        console.warn('结果数据为空或格式无效');
        return 0;
      }
      
      // 查找对应域名的数据
      const domainData = resultData.find(item => 
        item.domains && item.domains.toLowerCase() === domain.toLowerCase()
      );
      
      if (!domainData) {
        console.warn(`未找到域名 ${domain} 的数据`);
        return 0;
      }
      
      // 提取访问量
      const visits = domainData.visits || 0;
      console.log(`域名 ${domain} 的访问量: ${visits}`);
      
      return visits;
    } catch (error) {
      console.error('处理结果数据出错:', error);
      return 0;
    }
  },
  
  // 完整的批处理查询流程
  queryTrafficBatch: async function(domain, apiKey) {
    try {
      // 1. 创建批处理请求
      const reportId = await this.createBatchRequest(domain, apiKey);
      
      // 2. 等待请求完成
      const completionResult = await this.waitForCompletion(reportId, apiKey);
      
      if (!completionResult.success) {
        throw new Error(completionResult.error);
      }
      
      // 3. 获取结果数据
      const resultData = await this.fetchResultData(completionResult.downloadUrl);
      
      // 4. 处理结果数据
      const totalVisits = this.processResultData(resultData, domain);
      
      return {
        domain: domain,
        totalVisits: totalVisits,
        timestamp: Date.now(),
        rawData: resultData
      };
    } catch (error) {
      console.error(`批处理查询域名 ${domain} 流量出错:`, error);
      return {
        domain: domain,
        totalVisits: 0,
        error: error.message
      };
    }
  }
};

/**
 * 测试API密钥是否有效 - 增强版
 * @returns {Promise<{isValid: boolean, tier: string, details: string}>} - API密钥验证结果
 */
self.similarWebUtils.testApiKey = async function() {
  try {
    const apiKey = await self.similarWebUtils.getApiKey();
    if (!apiKey) {
      console.error('未设置SimilarWeb API密钥');
      return {
        isValid: false,
        tier: 'unknown',
        details: '未设置SimilarWeb API密钥'
      };
    }
    
    // 记录API密钥(部分隐藏)用于诊断
    const maskedKey = apiKey.length > 8 ? 
      apiKey.substring(0, 4) + '****' + apiKey.substring(apiKey.length - 4) : 
      '****' + apiKey.substring(apiKey.length - 4);
    console.log(`正在测试API密钥: ${maskedKey} (长度: ${apiKey.length}字符)`);
    
    // 使用一个知名网站测试API
    const testDomain = 'google.com';
    const encodedTestDomain = encodeURIComponent(testDomain);
    
    // 存储测试结果
    const testResults = {};
    let anySuccess = false;
    
    // 1. 检查API密钥格式是否正确
    if (!/^[a-zA-Z0-9\-_]{10,100}$/.test(apiKey)) {
      console.warn(`API密钥格式可能不正确: ${maskedKey}`);
      testResults.format = {
        status: 'warning',
        message: 'API密钥格式可能不符合标准 (包含特殊字符或格式不正确)'
      };
    }
    
    // 2. 直接测试SimilarWeb API访问性
    try {
      console.log('测试基本API连接...');
      
      const pingResponse = await fetch('https://api.similarweb.com/health-check', {
        method: 'GET',
        mode: 'no-cors'
      });
      
      console.log('基本连接测试状态:', pingResponse.status, pingResponse.statusText);
      testResults.connection = {
        status: pingResponse.status,
        statusText: pingResponse.statusText
      };
    } catch (error) {
      console.error('连接API服务器失败:', error);
      testResults.connection = {
        status: 'error',
        message: `连接失败: ${error.message}`
      };
    }
    
    // 3. 尝试Batch API (Bearer 认证)
    try {
      console.log('测试Batch API...');
      
      const requestOptions = {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      };
      
      // 使用一个简单的端点测试Batch API权限
      const response = await fetch('https://api.similarweb.com/batch/v4/get-remaining-credits', requestOptions);
      
      // 记录所有响应头以便诊断
      const headers = {};
      response.headers.forEach((value, name) => {
        headers[name] = value;
      });
      
      testResults.batchApi = {
        status: response.status,
        success: response.ok,
        headers: headers
      };
      
      console.log('Batch API响应状态:', response.status, response.statusText);
      console.log('Batch API响应头:', headers);
      
      if (response.ok) {
        const data = await response.json();
        testResults.batchApi.data = data;
        anySuccess = true;
        console.log('Batch API测试成功:', data);
      } else {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = 'Unable to read response text';
        }
        testResults.batchApi.error = errorText.substring(0, 100);
        console.log('Batch API测试失败:', response.status, errorText);
      }
    } catch (error) {
      console.error('测试Batch API出错:', error);
      testResults.batchApi = {
        status: 'error',
        success: false,
        error: error.message
      };
    }
    
    // 4. 测试REST API (URL参数认证)
    try {
      console.log('测试REST API (参数认证)...');
      
      const apiUrl = `https://api.similarweb.com/v1/website/${encodedTestDomain}/general-data/all-traffic?api_key=${apiKey}&format=json`;
      
      const requestOptions = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };
      
      const response = await fetch(apiUrl, requestOptions);
      
      // 记录响应头
      const headers = {};
      response.headers.forEach((value, name) => {
        headers[name] = value;
      });
      
      testResults.restApiParam = {
        status: response.status,
        success: response.ok,
        headers: headers
      };
      
      console.log('REST API (参数)响应状态:', response.status, response.statusText);
      console.log('REST API (参数)响应头:', headers);
      
      if (response.ok) {
        const data = await response.json();
        testResults.restApiParam.data = data;
        anySuccess = true;
        console.log('REST API (参数认证) 测试成功:', data);
      } else {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = 'Unable to read response text';
        }
        testResults.restApiParam.error = errorText.substring(0, 100);
        console.log('REST API (参数认证) 测试失败:', response.status, errorText);
      }
    } catch (error) {
      console.error('测试REST API (参数认证) 出错:', error);
      testResults.restApiParam = {
        status: 'error',
        success: false,
        error: error.message
      };
    }
    
    // 5. 测试REST API (Header认证)
    try {
      console.log('测试REST API (Header认证)...');
      
      const apiUrl = `https://api.similarweb.com/v1/website/${encodedTestDomain}/general-data/all-traffic?format=json`;
      
      const requestOptions = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      };
      
      const response = await fetch(apiUrl, requestOptions);
      
      // 记录响应头
      const headers = {};
      response.headers.forEach((value, name) => {
        headers[name] = value;
      });
      
      testResults.restApiHeader = {
        status: response.status,
        success: response.ok,
        headers: headers
      };
      
      console.log('REST API (Header)响应状态:', response.status, response.statusText);
      console.log('REST API (Header)响应头:', headers);
      
      if (response.ok) {
        const data = await response.json();
        testResults.restApiHeader.data = data;
        anySuccess = true;
        console.log('REST API (Header认证) 测试成功:', data);
      } else {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = 'Unable to read response text';
        }
        testResults.restApiHeader.error = errorText.substring(0, 100);
        console.log('REST API (Header认证) 测试失败:', response.status, errorText);
      }
    } catch (error) {
      console.error('测试REST API (Header认证) 出错:', error);
      testResults.restApiHeader = {
        status: 'error',
        success: false,
        error: error.message
      };
    }
    
    console.log('API密钥测试结果汇总:', testResults);
    
    // 6. 测试一个完全不同的API端点尝试 - 网站描述API
    try {
      console.log('测试网站描述API端点...');
      
      const apiUrl = `https://api.similarweb.com/v1/website/${encodedTestDomain}/general-data/summary?api_key=${apiKey}&format=json`;
      
      const requestOptions = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };
      
      const response = await fetch(apiUrl, requestOptions);
      
      testResults.alternativeEndpoint = {
        status: response.status,
        success: response.ok
      };
      
      console.log('网站描述API响应状态:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        testResults.alternativeEndpoint.data = data;
        anySuccess = true;
        console.log('替代API端点测试成功:', data);
      } else {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = 'Unable to read response text';
        }
        testResults.alternativeEndpoint.error = errorText.substring(0, 100);
        console.log('替代API端点测试失败:', response.status, errorText);
      }
    } catch (error) {
      console.error('测试替代API端点出错:', error);
      testResults.alternativeEndpoint = {
        status: 'error',
        success: false,
        error: error.message
      };
    }
    
    // 确定API级别
    let apiType = 'none';
    let details = '';
    
    if (testResults.batchApi && testResults.batchApi.success) {
      apiType = 'batch';
      details = 'Batch API可用，支持批量查询';
    } else if (testResults.restApiHeader && testResults.restApiHeader.success) {
      apiType = 'rest-header';
      details = 'REST API可用 (Header认证)';
    } else if (testResults.restApiParam && testResults.restApiParam.success) {
      apiType = 'rest-param';
      details = 'REST API可用 (参数认证)';
    } else if (testResults.alternativeEndpoint && testResults.alternativeEndpoint.success) {
      apiType = 'limited';
      details = '只有部分API端点可用，功能可能受限';
    } else {
      // 分析具体错误
      const errors = [];
      if (testResults.batchApi) errors.push(`Batch API: ${testResults.batchApi.status}`);
      if (testResults.restApiParam) errors.push(`REST API参数: ${testResults.restApiParam.status}`);
      if (testResults.restApiHeader) errors.push(`REST API头部: ${testResults.restApiHeader.status}`);
      
      // 根据状态码给出针对性建议
      let suggestion = '';
      if (errors.some(e => e.includes('404'))) {
        suggestion = `
可能的解决方案:
1. 确认您的API密钥已在SimilarWeb网站激活
2. 检查API密钥是否有复制错误、多余空格或特殊字符
3. 您可能需要联系SimilarWeb客服激活API访问权限
4. 确认您已付费订阅包含API访问的SimilarWeb计划`;
      } else if (errors.some(e => e.includes('401') || e.includes('403'))) {
        suggestion = `
可能的解决方案:
1. 您的API密钥可能已过期或无效
2. 您的账户可能没有权限访问请求的API端点
3. 您可能需要升级SimilarWeb订阅计划`;
      } else if (errors.some(e => e.includes('429'))) {
        suggestion = `
可能的解决方案:
1. 您已超出API请求限制
2. 请等待一段时间后再尝试
3. 考虑升级您的SimilarWeb计划以获取更高的API限额`;
      } else {
        suggestion = `
可能的解决方案:
1. 检查您的网络连接是否可以正常访问SimilarWeb服务器
2. 确认您的API密钥格式正确且已激活
3. 联系SimilarWeb支持获取帮助`;
      }
      
      details = `所有API认证方式测试失败: ${errors.join(', ')}${suggestion}`;
    }
    
    return {
      isValid: anySuccess,
      tier: apiType,
      details: details,
      results: testResults
    };
  } catch (error) {
    console.error('测试API密钥时出错:', error);
    return {
      isValid: false,
      tier: 'error',
      details: `测试过程中出错: ${error.message}，请检查网络连接和API密钥配置`
    };
  }
};

/**
 * 查询域名流量信息
 * @param {string} domain - 要查询的域名
 * @param {number} [recursiveDepth=0] - 递归深度，用于防止无限递归
 * @returns {Promise<Object>} - 包含流量数据的对象
 */
self.similarWebUtils.queryTraffic = async function(domain, recursiveDepth = 0) {
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
    
    const apiKey = await self.similarWebUtils.getApiKey();
    if (!apiKey) {
      throw new Error('未设置SimilarWeb API密钥');
    }
    
    // 首先检查缓存
    const cachedData = await self.similarWebUtils.getCachedTrafficData(domain);
    if (cachedData) {
      return cachedData;
    }
    
    // 进行API预检查
    const preflightResult = self.similarWebUtils.preflightCheck(domain);
    if (!preflightResult.valid) {
      console.warn(`域名 ${domain} 预检失败: ${preflightResult.reason}`);
      return {
        domain: domain,
        totalVisits: 0,
        error: `${preflightResult.reason} - ${preflightResult.details}`
      };
    }
    
    // 即使预检通过，仍然检查是否是多级域名
    if (self.similarWebUtils.isUnsupportedDomain(domain)) {
      // 如果是多级域名，尝试使用主域名
      const parts = domain.split('.');
      if (parts.length > 2) {
        const mainDomain = self.similarWebUtils.getMainDomain(domain);
        console.warn(`域名 ${domain} 是多级域名，尝试使用主域名 ${mainDomain} 查询`);
        
        // 使用主域名查询，但返回结果时保留原始域名
        const mainDomainResult = await self.similarWebUtils.queryTraffic(mainDomain, recursiveDepth + 1);
        if (!mainDomainResult.error) {
          return {
            domain: domain,
            totalVisits: mainDomainResult.totalVisits,
            timestamp: mainDomainResult.timestamp,
            rawData: mainDomainResult.rawData,
            note: `使用主域名 ${mainDomain} 的数据`
          };
        }
      }
      
      console.warn(`域名 ${domain} 可能不被SimilarWeb支持（太短或特殊格式）`);
      return {
        domain: domain,
        totalVisits: 0,
        error: '该域名格式可能不被SimilarWeb支持（太短或特殊格式）'
      };
    }
    
    // 确保域名格式正确并进行URL编码
    let encodedDomain = encodeURIComponent(domain);
    
    // 添加调试日志
    console.log(`准备查询域名: ${domain}, 编码后: ${encodedDomain}`);
    
    // 测试API密钥以确定使用哪种API
    const keyTest = await self.similarWebUtils.testApiKey();
    
    if (!keyTest.isValid) {
      throw new Error(keyTest.details || '无效的SimilarWeb API密钥');
    }
    
    console.log(`API密钥有效，类型: ${keyTest.tier}`);
    
    // 根据API类型使用不同的查询方式
    let result;
    
    if (keyTest.tier === 'batch') {
      // 使用Batch API
      console.log('使用Batch API查询域名流量');
      result = await self.similarWebUtils.batchApiSupport.queryTrafficBatch(domain, apiKey);
    } else {
      // 使用REST API
      console.log(`使用REST API查询域名流量，认证方式: ${keyTest.tier}`);
      
      // 构建日期参数 - 严格按照官方文档格式YYYY-MM
      const currentDate = new Date();
      const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const formatDate = date => `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const lastMonthFormatted = formatDate(lastMonth);
      
      // 尝试每个端点，直到找到成功的
      result = null;
      let lastError = null;
      let triedEndpoints = [];
      
      for (const endpoint of self.similarWebUtils.apiEndpoints.traffic) {
        try {
          // 替换URL模板中的变量
          let path = endpoint.path.replace('{domain}', encodedDomain);
          let params = endpoint.params
            .replace('{apiKey}', apiKey)
            .replace(/{startDate}/g, lastMonthFormatted)
            .replace(/{endDate}/g, lastMonthFormatted);
          
          let apiUrl = `https://api.similarweb.com${path}?${params}`;
          
          triedEndpoints.push(path);
          console.log(`尝试API端点: ${apiUrl.replace(apiKey, 'API_KEY_HIDDEN')}`);
          
          // 设置请求选项
          const requestOptions = {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          };
          
          // 如果使用Header认证，添加Authorization头
          if (keyTest.tier === 'rest-header') {
            requestOptions.headers['Authorization'] = `Bearer ${apiKey}`;
            // 移除URL中的api_key参数
            apiUrl = apiUrl.replace(/api_key=[^&]+&/, '');
          }
          
          const response = await fetch(apiUrl, requestOptions);
          console.log(`API响应状态码: ${response.status}, 状态文本: ${response.statusText}`);
          
          if (!response.ok) {
            // 处理错误，但继续尝试下一个端点
            const errorText = await response.text();
            console.warn(`端点 ${path} 返回错误码: ${response.status}`);
            console.warn(`错误详情: ${errorText.substring(0, 200)}...`);
            
            throw new Error(`API请求失败: ${response.status} - ${response.statusText}${errorText ? ' - ' + errorText.substring(0, 100) : ''}`);
          }
          
          let data;
          try {
            data = await response.json();
          } catch (jsonError) {
            console.error(`解析API响应失败:`, jsonError);
            throw new Error(`API响应格式错误: ${jsonError.message}`);
          }
          
          // 使用提取器获取访问量
          const totalVisits = endpoint.dataExtractor(data);
          
          // 成功获取数据
          result = {
            domain: domain,
            totalVisits: totalVisits,
            timestamp: Date.now(),
            rawData: data,
            endpoint: path
          };
          
          console.log(`成功获取域名 ${domain} 的流量数据，使用端点: ${path}`);
          
          // 找到成功的端点后跳出循环
          break;
        } catch (error) {
          console.warn(`端点 ${endpoint.path} 查询失败: ${error.message}`);
          lastError = error;
          // 继续尝试下一个端点
        }
      }
      
      // 如果所有端点都失败了
      if (!result) {
        throw new Error(`所有API端点均请求失败 (尝试了: ${triedEndpoints.join(', ')}) - 最后错误: ${lastError ? lastError.message : '未知错误'}`);
      }
    }
    
    // 缓存数据
    await self.similarWebUtils.cacheTrafficData(domain, result);
    
    return result;
  } catch (error) {
    console.error(`查询域名 ${domain} 流量出错:`, error);
    return {
      domain: domain,
      totalVisits: 0,
      error: error.message
    };
  }
};

/**
 * 批量查询多个域名的流量
 * @param {string[]} domains - 要查询的域名数组
 * @param {Function} [progressCallback] - 进度回调函数，接收参数：当前域名、进度百分比、状态
 * @returns {Promise<Object>} - 返回域名到流量数据的映射
 */
self.similarWebUtils.batchQueryTraffic = async function(domains, progressCallback) {
  const results = {};
  const total = domains.length;
  const MAX_RETRIES = 1; // 最大重试次数
  
  // 首先验证API密钥
  if (progressCallback) {
    progressCallback('验证API密钥', 0, 'processing');
  }
  
  const keyTest = await self.similarWebUtils.testApiKey();
  console.log('API密钥测试结果:', keyTest);
  
  if (!keyTest.isValid) {
    const errorMessage = keyTest.details || '无效的SimilarWeb API密钥，请检查设置并确保密钥有效';
    if (progressCallback) {
      progressCallback('', 100, 'error', errorMessage);
    }
    
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
  
  if (progressCallback) {
    progressCallback(`API密钥有效 (${keyTest.tier})`, 5, 'processing', keyTest.details);
  }
  
  // 如果使用Batch API，使用批量处理方式
  if (keyTest.tier === 'batch') {
    if (progressCallback) {
      progressCallback('使用Batch API处理', 10, 'processing');
    }
    
    try {
      const apiKey = await self.similarWebUtils.getApiKey();
      
      // 创建批处理请求 - 一次查询多个域名
      const currentDate = new Date();
      const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const formatDate = date => `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const lastMonthFormatted = formatDate(lastMonth);
      
      const requestBody = {
        report_query: {
          tables: [
            {
              vtable: "traffic_and_engagement",
              granularity: "monthly",
              metrics: ["visits"],
              filters: {
                domains: domains.slice(0, 100) // SimilarWeb限制单次查询的域名数量
              },
              start_date: lastMonthFormatted,
              end_date: lastMonthFormatted
            }
          ]
        },
        delivery_information: {
          delivery_method: "download_link",
          response_format: "json"
        }
      };
      
      if (progressCallback) {
        progressCallback('发送批量请求', 15, 'processing');
      }
      
      // 设置请求选项
      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      };
      
      // 发送请求
      const response = await fetch(self.similarWebUtils.batchApiSupport.endpoints.requestReport, requestOptions);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`批处理请求失败: ${response.status}`, errorText);
        throw new Error(`批处理请求失败: ${response.status} - ${errorText.substring(0, 100)}`);
      }
      
      const data = await response.json();
      const reportId = data.report_id;
      
      if (progressCallback) {
        progressCallback(`等待批量处理完成 (${reportId})`, 20, 'processing');
      }
      
      // 等待处理完成
      const completionResult = await self.similarWebUtils.batchApiSupport.waitForCompletion(
        reportId, 
        apiKey, 
        10, // 最大尝试次数
        3000, // 检查间隔(毫秒)
        (status, attempt, maxAttempts) => {
          if (progressCallback) {
            const progress = Math.round(20 + (attempt / maxAttempts) * 60); // 20%-80%
            progressCallback(`批量处理中... (${status})`, progress, 'processing');
          }
        }
      );
      
      if (!completionResult.success) {
        throw new Error(completionResult.error);
      }
      
      if (progressCallback) {
        progressCallback('下载处理结果', 80, 'processing');
      }
      
      // 获取结果数据
      const resultData = await self.similarWebUtils.batchApiSupport.fetchResultData(completionResult.downloadUrl);
      
      if (progressCallback) {
        progressCallback('处理结果数据', 90, 'processing');
      }
      
      // 处理结果，构建返回值
      if (Array.isArray(resultData)) {
        // 创建域名到数据的映射
        for (const item of resultData) {
          const domainName = item.domains;
          if (domainName && domains.includes(domainName)) {
            results[domainName] = {
              domain: domainName,
              totalVisits: item.visits || 0,
              timestamp: Date.now(),
              rawData: item
            };
          }
        }
        
        // 处理未返回结果的域名
        domains.forEach(domain => {
          if (!results[domain]) {
            results[domain] = {
              domain: domain,
              totalVisits: 0,
              error: '无流量数据或域名不在结果中'
            };
          }
        });
      } else {
        throw new Error('无效的返回数据格式');
      }
      
      if (progressCallback) {
        progressCallback('批量查询完成', 100, 'complete');
      }
      
      return results;
    } catch (error) {
      console.error('批量处理出错:', error);
      
      const errorMessage = `批量处理出错: ${error.message}`;
      if (progressCallback) {
        progressCallback('', 100, 'error', errorMessage);
      }
      
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
  }
  
  // REST API 处理方式
  // 预先处理域名
  const processedDomains = domains.map(domain => {
    // 检查是否是多级域名，如果是并且不是特殊TLD，尝试提取主域名
    if (self.similarWebUtils.isUnsupportedDomain(domain)) {
      const parts = domain.split('.');
      if (parts.length > 2) {
        const mainDomain = self.similarWebUtils.getMainDomain(domain);
        if (mainDomain !== domain) {
          console.log(`预处理: 将多级域名 ${domain} 转换为主域名 ${mainDomain}`);
          return {
            originalDomain: domain,
            queryDomain: mainDomain,
            converted: true
          };
        }
      }
      return { originalDomain: domain, queryDomain: domain, unsupported: true };
    }
    return { originalDomain: domain, queryDomain: domain };
  });
  
  // 过滤出可查询的域名（包括转换后的主域名）
  const validDomains = processedDomains.filter(item => !item.unsupported);
  const unsupportedDomains = processedDomains.filter(item => item.unsupported);
  
  if (unsupportedDomains.length > 0) {
    console.warn(`发现 ${unsupportedDomains.length} 个可能不支持的域名:`, unsupportedDomains.map(item => item.originalDomain));
    
    // 为不支持的域名创建结果对象
    unsupportedDomains.forEach(item => {
      results[item.originalDomain] = {
        domain: item.originalDomain,
        totalVisits: 0,
        error: '该域名格式可能不被SimilarWeb支持（太短或特殊格式）'
      };
      
      if (progressCallback) {
        // 计算进度时考虑已处理的不支持域名
        const processedCount = Object.keys(results).length;
        const progress = Math.round(5 + (processedCount / total) * 95);
        progressCallback(item.originalDomain, progress, 'error', '该域名格式可能不被SimilarWeb支持（太短或特殊格式）');
      }
    });
  }
  
  // 如果没有有效的域名，则直接返回结果
  if (validDomains.length === 0) {
    if (progressCallback) {
      progressCallback('', 100, 'complete');
    }
    return results;
  }
  
  // 创建一个映射表，用于将查询域名映射回原始域名
  const domainMapping = {};
  validDomains.forEach(item => {
    if (!domainMapping[item.queryDomain]) {
      domainMapping[item.queryDomain] = [];
    }
    domainMapping[item.queryDomain].push(item.originalDomain);
  });
  
  // 获取去重后的查询域名列表
  const uniqueQueryDomains = [...new Set(validDomains.map(item => item.queryDomain))];
  
  // 获取API密钥
  const apiKey = await self.similarWebUtils.getApiKey();
  
  // 处理支持的域名
  for (let i = 0; i < uniqueQueryDomains.length; i++) {
    const queryDomain = uniqueQueryDomains[i];
    const originalDomains = domainMapping[queryDomain];
    
    // 计算总体进度，考虑已处理的域名
    const processedCount = Object.keys(results).length + i;
    const progress = Math.round(5 + (processedCount / total) * 95); // 从5%开始(验证API占5%)
    
    if (progressCallback) {
      // 如果是转换后的域名，在进度回调中显示更明确的信息
      const displayDomain = originalDomains.length === 1 ? originalDomains[0] : 
        `${queryDomain} (代表 ${originalDomains.length} 个子域名)`;
      progressCallback(displayDomain, progress, 'processing');
    }
    
    let retries = 0;
    let success = false;
    
    while (retries <= MAX_RETRIES && !success) {
      try {
        // 为了避免API限流，每次查询添加延迟
        if (i > 0 || retries > 0) {
          const delayTime = 500 + (retries * 500); // 重试时增加延迟
          console.log(`等待${delayTime}毫秒后查询域名 ${queryDomain} (重试次数: ${retries})`);
          await new Promise(resolve => setTimeout(resolve, delayTime));
        }
        
        console.log(`开始查询域名 ${queryDomain} (重试次数: ${retries})`);
        
        // 使用单域名查询
        const result = await self.similarWebUtils.queryTraffic(queryDomain);
        
        // 将结果应用到所有原始域名
        for (const originalDomain of originalDomains) {
          if (originalDomain !== queryDomain) {
            // 如果是转换的域名，添加注释说明
            results[originalDomain] = {
              ...result,
              domain: originalDomain,
              note: `使用主域名 ${queryDomain} 的数据`
            };
          } else {
            // 直接使用查询结果
            results[originalDomain] = result;
          }
        }
        
        if (result.error) {
          console.warn(`域名 ${queryDomain} 查询返回错误: ${result.error}`);
          
          // 对于"找不到数据"类型的错误不需要重试
          if (result.error.includes('找不到该域名的数据') || 
              result.error.includes('域名格式不正确') ||
              result.error.includes('不被SimilarWeb支持') ||
              retries >= MAX_RETRIES) {
            
            if (progressCallback) {
              // 计算新的进度
              const newProcessedCount = Object.keys(results).length;
              const newProgress = Math.round(5 + (newProcessedCount / total) * 95);
              progressCallback(queryDomain, newProgress, 'error', result.error);
            }
            
            success = true; // 不需要再重试
          } else {
            retries++;
            continue; // 重试
          }
        } else {
          if (progressCallback) {
            // 计算新的进度
            const newProcessedCount = Object.keys(results).length;
            const newProgress = Math.round(5 + (newProcessedCount / total) * 95);
            progressCallback(queryDomain, newProgress, 'success');
          }
          
          success = true;
        }
      } catch (error) {
        console.error(`查询域名 ${queryDomain} 出错 (重试次数: ${retries}):`, error);
        
        if (retries >= MAX_RETRIES) {
          // 将错误结果应用到所有原始域名
          for (const originalDomain of originalDomains) {
            results[originalDomain] = {
              domain: originalDomain,
              totalVisits: 0,
              error: error.message || '未知错误'
            };
          }
          
          if (progressCallback) {
            // 计算新的进度
            const newProcessedCount = Object.keys(results).length;
            const newProgress = Math.round(5 + (newProcessedCount / total) * 95);
            progressCallback(queryDomain, newProgress, 'error', error.message || '未知错误');
          }
          
          success = true; // 不再重试
        } else {
          retries++;
          continue; // 重试
        }
      }
    }
  }
  
  // 最终进度更新为100%
  if (progressCallback) {
    progressCallback('', 100, 'complete');
  }
  
  return results;
};

/**
 * 缓存流量数据
 * @param {string} domain - 域名
 * @param {Object} data - 流量数据
 * @returns {Promise<boolean>} - 缓存成功返回true
 */
self.similarWebUtils.cacheTrafficData = async function(domain, data) {
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
self.similarWebUtils.getCachedTrafficData = async function(domain, maxAge = 86400000) {
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
 * 格式化流量数为可读字符串
 * @param {number} count - 流量数
 * @returns {string} - 格式化后的字符串
 */
self.similarWebUtils.formatTrafficCount = function(count) {
  if (!count) return '0';
  
  if (count >= 1000000000) {
    return (count / 1000000000).toFixed(1) + 'B';
  }
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
}; 