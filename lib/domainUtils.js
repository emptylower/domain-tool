/**
 * 域名识别与管理工具 - 域名处理工具库
 */

// 创建工具对象
self.domainToolUtils = {};

/**
 * 从URL中提取域名
 * @param {string} url - 输入URL
 * @returns {string|null} - 提取的域名或null（如果无效）
 */
self.domainToolUtils.extractDomain = function(url) {
  try {
    // 确保URL有合法的格式
    if (!url || typeof url !== 'string') {
      return null;
    }

    // 处理没有协议前缀的URL
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('//')) {
      url = 'http://' + url;
    } else if (url.startsWith('//')) {
      url = 'http:' + url;
    }

    // 使用URL构造函数解析URL
    const parsed = new URL(url);
    let domain = parsed.hostname;

    // 移除子域名前的www
    if (domain.startsWith('www.')) {
      domain = domain.substring(4);
    }

    // 验证域名
    if (!self.domainToolUtils.isValidDomain(domain)) {
      return null;
    }

    return domain;
  } catch (error) {
    console.error("提取域名出错:", error);
    return null;
  }
}

/**
 * 验证域名是否有效
 * @param {string} domain - 要验证的域名
 * @returns {boolean} - 是否有效
 */
self.domainToolUtils.isValidDomain = function(domain) {
  // 检查是否为IP地址
  if (self.domainToolUtils.isIpAddress(domain)) {
    return true;
  }

  // 检查域名格式
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return domainRegex.test(domain);
}

/**
 * 检查字符串是否为IP地址
 * @param {string} str - 要检查的字符串
 * @returns {boolean} - 是否为IP地址
 */
self.domainToolUtils.isIpAddress = function(str) {
  // IPv4地址正则表达式
  const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  // IPv6地址正则表达式（简化版）
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,7}:|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})$|^:((:[0-9a-fA-F]{1,4}){1,7}|:)$/;

  return ipv4Regex.test(str) || ipv6Regex.test(str);
}

/**
 * 归一化域名（统一格式）
 * @param {string} domain - 输入域名
 * @returns {string} - 归一化后的域名
 */
self.domainToolUtils.normalizeDomain = function(domain) {
  if (!domain) return '';
  
  // 转为小写
  domain = domain.toLowerCase();
  
  // 移除尾部的点
  if (domain.endsWith('.')) {
    domain = domain.slice(0, -1);
  }
  
  return domain;
}

/**
 * 获取域名的顶级域（TLD）
 * @param {string} domain - 输入域名
 * @returns {string|null} - 顶级域或null
 */
self.domainToolUtils.getTLD = function(domain) {
  if (!domain) return null;
  
  const parts = domain.split('.');
  if (parts.length < 2) return null;
  
  return parts[parts.length - 1];
}

/**
 * 获取域名的主域名部分（不含子域名）
 * @param {string} domain - 输入域名
 * @returns {string|null} - 主域名或null
 */
self.domainToolUtils.getMainDomain = function(domain) {
  if (!domain) return null;
  
  // 处理IP地址
  if (self.domainToolUtils.isIpAddress(domain)) {
    return domain;
  }
  
  const parts = domain.split('.');
  if (parts.length < 2) return null;
  
  // 对于常见的二级域名如.co.uk, .com.au等特殊处理
  const specialTLDs = ['co.uk', 'co.jp', 'co.nz', 'co.za', 'com.au', 'com.br', 'com.sg'];
  
  for (const specialTLD of specialTLDs) {
    if (domain.endsWith('.' + specialTLD)) {
      const remainingParts = parts.slice(0, -3);
      if (remainingParts.length === 0) {
        return parts.slice(-3).join('.');
      }
      return parts.slice(-3)[0] + '.' + parts.slice(-2).join('.');
    }
  }
  
  // 一般情况，取最后两部分
  return parts.slice(-2).join('.');
}

/**
 * 检查两个域名是否相关（一个是另一个的子域名）
 * @param {string} domain1 - 第一个域名
 * @param {string} domain2 - 第二个域名
 * @returns {boolean} - 是否相关
 */
self.domainToolUtils.areDomainsRelated = function(domain1, domain2) {
  if (!domain1 || !domain2) return false;
  
  domain1 = self.domainToolUtils.normalizeDomain(domain1);
  domain2 = self.domainToolUtils.normalizeDomain(domain2);
  
  return domain1.endsWith('.' + domain2) || domain2.endsWith('.' + domain1);
}

/**
 * 生成域名的简短显示形式（适用于UI显示）
 * @param {string} domain - 输入域名
 * @param {number} maxLength - 最大长度
 * @returns {string} - 简短显示形式
 */
self.domainToolUtils.getDomainDisplayText = function(domain, maxLength = 25) {
  if (!domain) return '';
  
  if (domain.length <= maxLength) {
    return domain;
  }
  
  // 简单截断并添加省略号
  return domain.substring(0, maxLength - 3) + '...';
}

/**
 * 比较两个域名（用于排序）
 * @param {string} a - 第一个域名
 * @param {string} b - 第二个域名
 * @returns {number} - 比较结果
 */
self.domainToolUtils.compareDomains = function(a, b) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  
  // 按TLD分组
  const tldA = self.domainToolUtils.getTLD(a);
  const tldB = self.domainToolUtils.getTLD(b);
  
  if (tldA !== tldB) {
    return tldA.localeCompare(tldB);
  }
  
  // 同TLD按名称排序
  return a.localeCompare(b);
}

/**
 * 通过WHOIS API查询域名注册信息
 * @param {string} domain - 要查询的域名
 * @returns {Promise<{registrationDate: string|null, error: string|null}>} - 返回注册时间或错误信息
 */
self.domainToolUtils.queryWhoisInfo = async function(domain) {
  try {
    if (!domain) {
      return { registrationDate: null, error: '域名不能为空' };
    }

    // 使用公共WHOIS API（示例使用RDAP协议，更现代的WHOIS替代品）
    const response = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`);
    
    if (!response.ok) {
      return { 
        registrationDate: null, 
        error: `API请求失败: ${response.status} ${response.statusText}` 
      };
    }
    
    const data = await response.json();
    
    // 从RDAP响应中提取注册日期
    // 不同的记录可能在不同的位置有注册日期，所以我们需要检查多个位置
    let registrationDate = null;
    
    // 常见的注册日期字段
    if (data.events) {
      // 查找注册事件
      const registrationEvent = data.events.find(event => 
        event.eventAction === 'registration' || 
        event.eventAction === 'created' || 
        event.eventAction === 'creation');
        
      if (registrationEvent && registrationEvent.eventDate) {
        registrationDate = registrationEvent.eventDate;
      }
    }
    
    // 如果在events中没找到，尝试其他可能的位置
    if (!registrationDate && data.creationDate) {
      registrationDate = data.creationDate;
    }
    
    if (!registrationDate && data.created) {
      registrationDate = data.created;
    }
    
    // 格式化日期
    if (registrationDate) {
      try {
        const date = new Date(registrationDate);
        registrationDate = date.toISOString().split('T')[0]; // 返回YYYY-MM-DD格式
      } catch (e) {
        console.error('日期格式化错误:', e);
        // 保持原始格式
      }
    }
    
    return {
      registrationDate,
      error: registrationDate ? null : '未找到注册日期信息'
    };
  } catch (error) {
    console.error('WHOIS查询错误:', error);
    return {
      registrationDate: null,
      error: `查询出错: ${error.message || '未知错误'}`
    };
  }
};

/**
 * 批量查询多个域名的WHOIS信息
 * @param {string[]} domains - 要查询的域名数组
 * @param {Function} [progressCallback] - 进度回调函数，接收参数：当前域名、进度百分比、状态
 * @returns {Promise<Object>} - 返回域名到注册时间的映射
 */
self.domainToolUtils.batchQueryWhoisInfo = async function(domains, progressCallback) {
  const results = {};
  const total = domains.length;
  
  for (let i = 0; i < domains.length; i++) {
    const domain = domains[i];
    const progress = Math.round((i / total) * 100);
    
    if (progressCallback) {
      progressCallback(domain, progress, 'processing');
    }
    
    try {
      // 为了避免API限流，每次查询添加延迟
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const result = await self.domainToolUtils.queryWhoisInfo(domain);
      results[domain] = result.registrationDate;
      
      if (progressCallback) {
        progressCallback(domain, progress, result.error ? 'error' : 'success', result.error);
      }
    } catch (error) {
      console.error(`查询域名 ${domain} 出错:`, error);
      results[domain] = null;
      
      if (progressCallback) {
        progressCallback(domain, progress, 'error', error.message || '未知错误');
      }
    }
  }
  
  return results;
}

/**
 * 格式化日期为本地字符串
 * @param {string} dateString - ISO日期字符串
 * @returns {string} - 格式化后的日期字符串
 */
self.domainToolUtils.formatDate = function(dateString) {
  if (!dateString) return '未知';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  } catch (error) {
    console.error('格式化日期出错:', error);
    return dateString || '未知';
  }
} 