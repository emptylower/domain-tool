// lib/storageUtils.js

// 存储API兼容性处理
// 使用self而不是全局变量防止重复声明
if (!self.domainToolStorage) {
  self.domainToolStorage = chrome.storage || browser.storage;
}

// 默认集合ID
// 使用全局变量防止重复声明
if (typeof self.DEFAULT_COLLECTION_ID === 'undefined') {
  self.DEFAULT_COLLECTION_ID = 'default';
}

// 创建全局存储工具对象
// 使用self而不是window，兼容Service Worker环境
self.storageUtils = {};

/**
 * 域名记录的数据结构
 * @typedef {Object} DomainRecord
 * @property {string} domain - 域名
 * @property {string} [source] - 发现来源URL
 * @property {string} [addedDate] - 添加日期时间
 * @property {string[]} [tags] - 标签数组
 * @property {string} [notes] - 用户笔记
 * @property {Object} [metadata] - 其他元数据
 */

/**
 * 域名集合的数据结构
 * @typedef {Object} DomainCollection
 * @property {string} id - 集合ID
 * @property {string} name - 集合名称
 * @property {string} [description] - 集合描述
 * @property {string} createdDate - 创建日期
 * @property {DomainRecord[]} domains - 域名记录数组
 */

/**
 * 获取保存的域名集合
 * @param {string} [collectionId] - 集合ID，不指定则返回所有集合
 * @returns {Promise<DomainCollection|DomainCollection[]>}
 */
self.storageUtils.getDomainCollections = async function(collectionId) {
  try {
    const data = await self.domainToolStorage.local.get('domainCollections');
    let collections = data.domainCollections || [];
    
    // 确保默认集合存在
    if (collections.length === 0 || !collections.some(col => col.id === self.DEFAULT_COLLECTION_ID)) {
      collections.push({
        id: self.DEFAULT_COLLECTION_ID,
        name: '默认集合',
        description: '自动创建的默认集合',
        createdDate: new Date().toISOString(),
        domains: []
      });
      
      // 保存初始化的集合
      await self.domainToolStorage.local.set({ domainCollections: collections });
    }
    
    // 如果指定了集合ID，返回特定集合
    if (collectionId) {
      const collection = collections.find(col => col.id === collectionId);
      return collection || null;
    }
    
    // 否则返回所有集合
    return collections;
  } catch (error) {
    console.error('获取域名集合出错:', error);
    return collectionId ? null : [];
  }
}

/**
 * 创建新的域名集合
 * @param {string} name - 集合名称
 * @param {string} [description] - 集合描述
 * @returns {Promise<DomainCollection|null>} - 创建的集合或null（如果失败）
 */
self.storageUtils.createCollection = async function(name, description = '') {
  try {
    if (!name || typeof name !== 'string') {
      throw new Error('集合名称不能为空');
    }
    
    // 获取当前集合
    const collections = await self.storageUtils.getDomainCollections();
    
    // 生成唯一的集合ID
    const id = 'collection_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    
    // 创建新集合
    const newCollection = {
      id,
      name,
      description,
      createdDate: new Date().toISOString(),
      domains: []
    };
    
    // 添加到集合列表
    collections.push(newCollection);
    
    // 保存到存储
    await self.domainToolStorage.local.set({ domainCollections: collections });
    
    return newCollection;
  } catch (error) {
    console.error('创建域名集合出错:', error);
    return null;
  }
}

/**
 * 重命名域名集合
 * @param {string} collectionId - 集合ID
 * @param {string} newName - 新的集合名称
 * @param {string} [newDescription] - 新的集合描述
 * @returns {Promise<boolean>} - 重命名成功返回true
 */
self.storageUtils.renameCollection = async function(collectionId, newName, newDescription) {
  try {
    if (!collectionId || !newName) {
      throw new Error('集合ID和新名称不能为空');
    }
    
    // 不允许修改默认集合的ID
    if (collectionId === self.DEFAULT_COLLECTION_ID && newName === 'default') {
      throw new Error('不能修改默认集合的ID');
    }
    
    // 获取当前集合
    const collections = await self.storageUtils.getDomainCollections();
    
    // 查找目标集合
    const targetCollection = collections.find(col => col.id === collectionId);
    if (!targetCollection) {
      throw new Error(`集合 ${collectionId} 不存在`);
    }
    
    // 更新集合信息
    targetCollection.name = newName;
    if (newDescription !== undefined) {
      targetCollection.description = newDescription;
    }
    
    // 保存到存储
    await self.domainToolStorage.local.set({ domainCollections: collections });
    
    return true;
  } catch (error) {
    console.error('重命名域名集合出错:', error);
    return false;
  }
}

/**
 * 删除域名集合
 * @param {string} collectionId - 集合ID
 * @returns {Promise<boolean>} - 删除成功返回true
 */
self.storageUtils.deleteCollection = async function(collectionId) {
  try {
    if (!collectionId) {
      throw new Error('集合ID不能为空');
    }
    
    // 不允许删除默认集合
    if (collectionId === self.DEFAULT_COLLECTION_ID) {
      throw new Error('不能删除默认集合');
    }
    
    // 获取当前集合
    const collections = await self.storageUtils.getDomainCollections();
    
    // 过滤掉要删除的集合
    const newCollections = collections.filter(col => col.id !== collectionId);
    
    // 如果过滤后长度不变，说明集合不存在
    if (newCollections.length === collections.length) {
      throw new Error(`集合 ${collectionId} 不存在`);
    }
    
    // 保存到存储
    await self.domainToolStorage.local.set({ domainCollections: newCollections });
    
    return true;
  } catch (error) {
    console.error('删除域名集合出错:', error);
    return false;
  }
}

/**
 * 获取过滤域名列表
 * @returns {Promise<string[]>} - 过滤域名数组
 */
self.storageUtils.getFilteredDomains = async function() {
  try {
    const data = await self.domainToolStorage.local.get('filteredDomains');
    return data.filteredDomains || [];
  } catch (error) {
    console.error('获取过滤域名出错:', error);
    return [];
  }
}

/**
 * 添加域名到过滤列表
 * @param {string|string[]} domains - 要添加的域名或域名数组
 * @returns {Promise<boolean>} - 添加成功返回true
 */
self.storageUtils.addToFilteredDomains = async function(domains) {
  try {
    // 确保domains是数组
    const domainsArray = Array.isArray(domains) ? domains : [domains];
    
    // 获取现有过滤域名
    const filteredDomains = await self.storageUtils.getFilteredDomains();
    
    // 合并并去重
    const updatedFilteredDomains = [...new Set([...filteredDomains, ...domainsArray])];
    
    // 保存到存储
    await self.domainToolStorage.local.set({ filteredDomains: updatedFilteredDomains });
    return true;
  } catch (error) {
    console.error('添加过滤域名出错:', error);
    return false;
  }
}

/**
 * 从过滤列表中移除域名
 * @param {string} domain - 要移除的域名
 * @returns {Promise<boolean>} - 移除成功返回true
 */
self.storageUtils.removeFromFilteredDomains = async function(domain) {
  try {
    // 获取现有过滤域名
    const filteredDomains = await self.storageUtils.getFilteredDomains();
    
    // 移除指定域名
    const updatedFilteredDomains = filteredDomains.filter(d => d !== domain);
    
    // 保存到存储
    await self.domainToolStorage.local.set({ filteredDomains: updatedFilteredDomains });
    return true;
  } catch (error) {
    console.error('移除过滤域名出错:', error);
    return false;
  }
}

/**
 * 检查域名是否在过滤列表中
 * @param {string} domain - 要检查的域名
 * @returns {Promise<boolean>} - 域名在过滤列表中返回true
 */
self.storageUtils.isDomainFiltered = async function(domain) {
  try {
    const filteredDomains = await self.storageUtils.getFilteredDomains();
    return filteredDomains.includes(domain);
  } catch (error) {
    console.error('检查过滤域名出错:', error);
    return false;
  }
}

/**
 * 保存域名到存储
 * @param {string|string[]} domains - 单个域名或域名数组
 * @param {string} [source] - 来源URL
 * @param {string[]} [tags] - 标签数组
 * @param {string} [collectionId] - 集合ID，不指定则使用默认集合
 * @returns {Promise<{success: boolean, filtered: string[]}>} - 返回保存结果和被过滤的域名
 */
self.storageUtils.saveDomains = async function(domains, source = '', tags = [], collectionId = self.DEFAULT_COLLECTION_ID) {
  try {
    // 确保domains是数组
    const domainsArray = Array.isArray(domains) ? domains : [domains];
    
    // 获取过滤域名列表
    const filteredDomains = await self.storageUtils.getFilteredDomains();
    
    // 过滤掉黑名单中的域名
    const filteredOut = [];
    const domainsToSave = [];
    
    for (const domain of domainsArray) {
      if (filteredDomains.includes(domain)) {
        filteredOut.push(domain);
      } else {
        domainsToSave.push(domain);
      }
    }
    
    // 如果没有可保存的域名，直接返回
    if (domainsToSave.length === 0) {
      return { success: true, filtered: filteredOut };
    }
    
    // 获取当前集合
    const collections = await self.storageUtils.getDomainCollections();
    
    // 查找目标集合
    let targetCollection = collections.find(col => col.id === collectionId);
    
    // 如果集合不存在，创建新集合
    if (!targetCollection) {
      targetCollection = {
        id: collectionId,
        name: collectionId === self.DEFAULT_COLLECTION_ID ? '默认集合' : collectionId,
        description: '',
        createdDate: new Date().toISOString(),
        domains: []
      };
      collections.push(targetCollection);
    }
    
    // 添加新域名
    const now = new Date().toISOString();
    for (const domain of domainsToSave) {
      // 检查域名是否已存在
      const existingIndex = targetCollection.domains.findIndex(item => item.domain === domain);
      
      if (existingIndex >= 0) {
        // 更新已存在的域名
        const existing = targetCollection.domains[existingIndex];
        targetCollection.domains[existingIndex] = {
          ...existing,
          domain,
          source: source || existing.source,
          tags: [...new Set([...(existing.tags || []), ...tags])], // 合并标签并去重
          lastUpdated: now
        };
      } else {
        // 添加新域名
        targetCollection.domains.push({
          domain,
          source,
          addedDate: now,
          tags,
          notes: '',
          metadata: {}
        });
      }
    }
    
    // 保存到存储
    await self.domainToolStorage.local.set({ domainCollections: collections });
    return { success: true, filtered: filteredOut };
  } catch (error) {
    console.error('保存域名出错:', error);
    return { success: false, filtered: [] };
  }
}

/**
 * 删除域名
 * @param {string} domain - 要删除的域名
 * @param {string} [collectionId] - 集合ID
 * @returns {Promise<boolean>} - 删除成功返回true
 */
self.storageUtils.deleteDomain = async function(domain, collectionId = self.DEFAULT_COLLECTION_ID) {
  try {
    const collections = await self.storageUtils.getDomainCollections();
    const collection = collections.find(col => col.id === collectionId);
    
    if (!collection) return false;
    
    // 过滤掉要删除的域名
    collection.domains = collection.domains.filter(item => item.domain !== domain);
    
    // 保存更新后的集合
    await self.domainToolStorage.local.set({ domainCollections: collections });
    return true;
  } catch (error) {
    console.error('删除域名出错:', error);
    return false;
  }
}

/**
 * 更新域名记录
 * @param {string} domain - 域名
 * @param {Object} updates - 更新内容
 * @param {string} [collectionId] - 集合ID
 * @returns {Promise<boolean>} - 更新成功返回true
 */
self.storageUtils.updateDomainRecord = async function(domain, updates, collectionId = self.DEFAULT_COLLECTION_ID) {
  try {
    const collections = await self.storageUtils.getDomainCollections();
    const collection = collections.find(col => col.id === collectionId);
    
    if (!collection) return false;
    
    // 查找要更新的域名记录
    const domainIndex = collection.domains.findIndex(item => item.domain === domain);
    if (domainIndex === -1) return false;
    
    // 更新记录
    collection.domains[domainIndex] = {
      ...collection.domains[domainIndex],
      ...updates,
      lastUpdated: new Date().toISOString()
    };
    
    // 保存更新后的集合
    await self.domainToolStorage.local.set({ domainCollections: collections });
    return true;
  } catch (error) {
    console.error('更新域名记录出错:', error);
    return false;
  }
}

/**
 * 导出域名集合
 * @param {string} [collectionId] - 集合ID，不指定则导出所有集合
 * @param {string} format - 格式："json"或"csv"
 * @returns {Promise<string>} - 导出的数据字符串
 */
self.storageUtils.exportDomains = async function(collectionId, format = 'json') {
  try {
    let data;
    
    if (collectionId) {
      // 导出特定集合
      data = await self.storageUtils.getDomainCollections(collectionId);
      if (!data) throw new Error(`集合 ${collectionId} 不存在`);
    } else {
      // 导出所有集合
      data = await self.storageUtils.getDomainCollections();
    }
    
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else if (format === 'csv') {
      // 创建CSV格式
      const headers = ['domain', 'source', 'addedDate', 'tags', 'notes'];
      let csv = headers.join(',') + '\n';
      
      // 处理单个集合或多个集合
      const collections = Array.isArray(data) ? data : [data];
      
      for (const collection of collections) {
        for (const domain of collection.domains) {
          const row = [
            domain.domain,
            domain.source || '',
            domain.addedDate || '',
            (domain.tags || []).join(';'),
            (domain.notes || '').replace(/,/g, ' ').replace(/\n/g, ' ')
          ];
          csv += row.join(',') + '\n';
        }
      }
      
      return csv;
    } else {
      throw new Error(`不支持的格式: ${format}`);
    }
  } catch (error) {
    console.error('导出域名出错:', error);
    throw error;
  }
}

/**
 * 导入域名集合
 * @param {string} data - 导入的数据字符串
 * @param {string} format - 格式："json"或"csv"
 * @param {boolean} [merge=false] - 是否合并到现有集合
 * @returns {Promise<boolean>} - 导入成功返回true
 */
self.storageUtils.importDomains = async function(data, format = 'json', merge = false) {
  try {
    let collections = merge ? await self.storageUtils.getDomainCollections() : [];
    
    if (format === 'json') {
      // 解析JSON数据
      const importedData = JSON.parse(data);
      
      // 处理导入的是单个集合还是多个集合的情况
      if (Array.isArray(importedData)) {
        if (merge) {
          // 合并每个集合
          for (const importedCollection of importedData) {
            const existingIndex = collections.findIndex(c => c.id === importedCollection.id);
            if (existingIndex >= 0) {
              // 合并已存在的集合
              const existingDomains = collections[existingIndex].domains;
              const importedDomains = importedCollection.domains;
              
              // 合并域名，避免重复
              for (const domain of importedDomains) {
                if (!existingDomains.some(d => d.domain === domain.domain)) {
                  existingDomains.push(domain);
                }
              }
            } else {
              // 添加新集合
              collections.push(importedCollection);
            }
          }
        } else {
          // 直接替换所有集合
          collections = importedData;
        }
      } else if (importedData.id && importedData.domains) {
        // 单个集合情况
        if (merge) {
          // 合并到已存在的集合
          const existingIndex = collections.findIndex(c => c.id === importedData.id);
          if (existingIndex >= 0) {
            // 合并域名
            const existingDomains = collections[existingIndex].domains;
            const importedDomains = importedData.domains;
            
            for (const domain of importedDomains) {
              if (!existingDomains.some(d => d.domain === domain.domain)) {
                existingDomains.push(domain);
              }
            }
          } else {
            // 添加新集合
            collections.push(importedData);
          }
        } else {
          // 只导入这一个集合
          collections = [importedData];
        }
      } else {
        throw new Error('无效的JSON数据格式');
      }
    } else if (format === 'csv') {
      // 解析CSV数据
      const lines = data.split('\n');
      const headers = lines[0].split(',');
      
      // 创建或获取默认集合
      let defaultCollection;
      if (merge) {
        defaultCollection = collections.find(c => c.id === self.DEFAULT_COLLECTION_ID);
        if (!defaultCollection) {
          defaultCollection = {
            id: self.DEFAULT_COLLECTION_ID,
            name: '默认集合',
            description: '从CSV导入的域名',
            createdDate: new Date().toISOString(),
            domains: []
          };
          collections.push(defaultCollection);
        }
      } else {
        defaultCollection = {
          id: self.DEFAULT_COLLECTION_ID,
          name: '导入的域名',
          description: '从CSV导入的域名',
          createdDate: new Date().toISOString(),
          domains: []
        };
        collections = [defaultCollection];
      }
      
      // 处理每一行
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(',');
        if (values.length < headers.length) continue;
        
        const domain = values[0].trim();
        if (!domain) continue;
        
        // 检查是否已存在
        if (!defaultCollection.domains.some(d => d.domain === domain)) {
          defaultCollection.domains.push({
            domain,
            source: values[1] || '',
            addedDate: values[2] || new Date().toISOString(),
            tags: values[3] ? values[3].split(';').map(t => t.trim()) : [],
            notes: values[4] || ''
          });
        }
      }
    } else {
      throw new Error(`不支持的格式: ${format}`);
    }
    
    // 保存导入的数据
    await self.domainToolStorage.local.set({ domainCollections: collections });
    return true;
  } catch (error) {
    console.error('导入域名出错:', error);
    return false;
  }
} 