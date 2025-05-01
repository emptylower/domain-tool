/**
 * 域名识别与管理工具 - 选项页面脚本
 */

// 不再使用ES6模块导入
// import { 
//   getDomainCollections, 
//   deleteDomain, 
//   updateDomainRecord,
//   exportDomains,
//   importDomains 
// } from '../lib/storageUtils.js';

// storageUtils.js已经在HTML中加载，这里不再需要动态加载
// (function loadDependencies() {
//   const script = document.createElement('script');
//   script.src = '../lib/storageUtils.js';
//   document.head.appendChild(script);
// })();

document.addEventListener('DOMContentLoaded', function() {
  console.log('选项页面加载完成，开始初始化');
  
  // 确保所有需要的脚本已加载
  ensureScriptsLoaded().then(() => {
    // 初始化页面
    initTabs();
    initSettings();
    
    // 加载数据
    loadCollectionSelector();
    loadCollections();
    loadFilteredDomains();
    
    // 初始化API设置
    initApiSettings();
    initTrafficQuery();
  }).catch(error => {
    console.error('初始化错误:', error);
    alert('页面初始化失败，请刷新页面重试');
  });
  
  // 确保所有需要的脚本已加载
  async function ensureScriptsLoaded() {
    // 检查Serpstat工具库是否加载
    if (!window.serpstatUtils) {
      console.error('Serpstat工具库未加载，功能可能不正常');
      
      try {
        // 尝试加载Serpstat工具库
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = '../lib/serpstatUtils.js';
          script.onload = () => {
            console.log('Serpstat工具库已成功加载');
            resolve();
          };
          script.onerror = () => {
            console.error('加载Serpstat工具库失败');
            reject(new Error('无法加载Serpstat工具库'));
          };
          document.head.appendChild(script);
        });
      } catch (error) {
        console.error('尝试加载Serpstat工具库时出错:', error);
        throw error;
      }
    } else {
      console.log('Serpstat工具库已加载');
    }
    
    return true;
  }
  
  /**
   * 初始化选项卡切换功能
   */
  function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // 移除所有tab的active类
        tabs.forEach(t => t.classList.remove('active'));
        // 给当前点击的tab添加active类
        tab.classList.add('active');
        
        // 隐藏所有tab内容
        tabContents.forEach(content => content.classList.remove('active'));
        // 显示当前选中的tab内容
        const tabId = tab.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
      });
    });
  }
  
  // 获取DOM元素
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const saveSettingsBtn = document.getElementById('saveSettings');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const filterInput = document.getElementById('filterDomains');
  const domainsList = document.getElementById('domainsList');
  const addCollectionBtn = document.getElementById('addCollectionBtn');
  const domainCollectionSelect = document.getElementById('domainCollectionSelect');
  const domainManagementArea = document.querySelector('.domain-management-area');
  const noDomainMessage = document.getElementById('noDomainMessage');
  const addFilteredDomainBtn = document.getElementById('addFilteredDomainBtn');
  const filterFilteredDomainsInput = document.getElementById('filterFilteredDomains');
  const filteredDomainsList = document.getElementById('filteredDomainsList');
  const selectAllDomainsCheckbox = document.getElementById('selectAllDomains');
  const invertSelectionBtn = document.getElementById('invertSelectionBtn');
  const batchActionButtons = document.getElementById('batchActionButtons');
  const batchDeleteBtn = document.getElementById('batchDeleteBtn');
  const batchAddToFilterBtn = document.getElementById('batchAddToFilterBtn');
  const selectedCountSpan = document.getElementById('selectedCount');
  
  // 添加查询WHOIS信息按钮和排序按钮
  const batchQueryWhoisBtn = document.createElement('button');
  batchQueryWhoisBtn.id = 'batchQueryWhoisBtn';
  batchQueryWhoisBtn.textContent = '查询注册时间';
  batchQueryWhoisBtn.style.backgroundColor = '#4caf50';
  batchQueryWhoisBtn.style.marginRight = '5px';
  batchActionButtons.appendChild(batchQueryWhoisBtn);
  
  const sortByRegistrationDateBtn = document.createElement('button');
  sortByRegistrationDateBtn.id = 'sortByRegistrationDateBtn';
  sortByRegistrationDateBtn.textContent = '按注册时间排序';
  sortByRegistrationDateBtn.style.backgroundColor = '#2196f3';
  sortByRegistrationDateBtn.style.marginRight = '5px';
  // 初始时禁用排序按钮，直到有注册时间数据
  sortByRegistrationDateBtn.disabled = true;
  batchActionButtons.appendChild(sortByRegistrationDateBtn);
  
  // 初始化设置
  initSettings();
  
  // 加载集合选择器
  loadCollectionSelector();
  
  // 加载分类
  loadCollections();
  
  // 加载过滤域名列表
  loadFilteredDomains();
  
  // 加载导出集合选择器
  loadExportCollectionSelector();
  
  // 添加批量操作事件监听器
  if (selectAllDomainsCheckbox) {
    selectAllDomainsCheckbox.addEventListener('change', toggleSelectAllDomains);
  }
  
  if (invertSelectionBtn) {
    invertSelectionBtn.addEventListener('click', invertDomainSelection);
  }
  
  if (batchDeleteBtn) {
    batchDeleteBtn.addEventListener('click', handleBatchDelete);
  }
  
  if (batchAddToFilterBtn) {
    batchAddToFilterBtn.addEventListener('click', handleBatchAddToFilter);
  }
  
  // 添加查询WHOIS和排序按钮的事件监听器
  if (batchQueryWhoisBtn) {
    batchQueryWhoisBtn.addEventListener('click', handleBatchQueryWhois);
  }
  
  if (sortByRegistrationDateBtn) {
    sortByRegistrationDateBtn.addEventListener('click', handleSortByRegistrationDate);
  }
  
  // Tab切换事件
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const tabId = this.getAttribute('data-tab');
      
      // 更新激活的tab
      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      // 更新显示的内容
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === tabId) {
          content.classList.add('active');
        }
      });
      
      // 如果切换到域名管理，刷新集合选择器
      if (tabId === 'domains') {
        loadCollectionSelector();
      }
      
      // 如果切换到分类管理，刷新分类列表
      if (tabId === 'collections') {
        loadCollections();
      }
      
      // 如果切换到过滤清单，刷新过滤域名列表
      if (tabId === 'filter') {
        loadFilteredDomains();
      }
      
      // 如果切换到导入/导出，刷新集合选择器
      if (tabId === 'import-export') {
        loadExportCollectionSelector();
      }
    });
  });
  
  // 保存设置按钮点击事件
  saveSettingsBtn.addEventListener('click', saveSettings);
  
  // 导出按钮点击事件
  exportBtn.addEventListener('click', handleExportDomains);
  
  // 导入按钮点击事件
  importBtn.addEventListener('click', handleImportDomains);
  
  // 域名过滤事件
  filterInput.addEventListener('input', filterDomains);
  
  // 添加分类按钮点击事件
  if (addCollectionBtn) {
    addCollectionBtn.addEventListener('click', addCollection);
  }
  
  // 域名集合选择事件
  if (domainCollectionSelect) {
    domainCollectionSelect.addEventListener('change', function() {
      const selectedCollectionId = this.value;
      if (selectedCollectionId) {
        // 重置排序状态（除非是适用同一个分类的排序）
        chrome.storage.local.get('sortState', function(data) {
          if (data.sortState && data.sortState.collectionId !== selectedCollectionId) {
            // 如果之前的排序状态适用于不同的分类，重置它
            chrome.storage.local.remove('sortState');
          }
          // 加载域名列表
          loadSavedDomains(selectedCollectionId);
        });
        
        domainManagementArea.style.display = 'block';
        noDomainMessage.style.display = 'none';
      } else {
        domainManagementArea.style.display = 'none';
        noDomainMessage.style.display = 'block';
      }
    });
  }
  
  // 添加过滤域名按钮事件
  if (addFilteredDomainBtn) {
    addFilteredDomainBtn.addEventListener('click', addFilteredDomain);
  }
  
  // 过滤域名搜索事件
  if (filterFilteredDomainsInput) {
    filterFilteredDomainsInput.addEventListener('input', filterFilteredDomains);
  }
  
  // 从URL hash自动切换到特定tab
  if (window.location.hash) {
    const hashTab = window.location.hash.substring(1);
    const tabElement = document.querySelector(`.tab[data-tab="${hashTab}"]`);
    if (tabElement) {
      tabElement.click();
    }
  }
  
  /**
   * 初始化设置
   */
  function initSettings() {
    chrome.storage.local.get({
      scanAutoStart: true,
      panelPosition: 'right',
      itemsPerPage: 20
    }, function(items) {
      document.getElementById('scanAutoStart').checked = items.scanAutoStart;
      document.getElementById('panelPosition').value = items.panelPosition;
      document.getElementById('itemsPerPage').value = items.itemsPerPage;
    });
  }
  
  /**
   * 保存设置
   */
  function saveSettings() {
    const settings = {
      scanAutoStart: document.getElementById('scanAutoStart').checked,
      panelPosition: document.getElementById('panelPosition').value,
      itemsPerPage: document.getElementById('itemsPerPage').value
    };
    
    chrome.storage.local.set(settings, function() {
      // 显示保存成功消息
      const message = document.createElement('div');
      message.className = 'success-message';
      message.textContent = '设置已保存';
      message.style.marginTop = '10px';
      
      const saveBtn = document.getElementById('saveSettings');
      saveBtn.parentNode.insertBefore(message, saveBtn.nextSibling);
      
      // 3秒后移除消息
      setTimeout(() => {
        message.remove();
      }, 3000);
    });
  }
  
  /**
   * 加载集合选择器
   */
  async function loadCollectionSelector() {
    try {
      // 重置选择器
      domainCollectionSelect.innerHTML = '<option value="">加载中...</option>';
      domainManagementArea.style.display = 'none';
      noDomainMessage.style.display = 'block';
      
      // 确保storageUtils已加载
      if (!window.storageUtils) {
        console.error('storageUtils未加载，无法加载集合');
        domainCollectionSelect.innerHTML = '<option value="">无法加载 - 存储模块未加载</option>';
        return;
      }
      
      // 获取所有域名集合
      const collections = await window.storageUtils.getDomainCollections();
      
      // 更新选择器选项
      domainCollectionSelect.innerHTML = '<option value="">-- 请选择分类 --</option>';
      
      if (!collections || collections.length === 0) {
        domainCollectionSelect.innerHTML = '<option value="">暂无可用分类</option>';
        return;
      }
      
      // 添加集合选项
      collections.forEach(collection => {
        if (collection && collection.id) {
          const option = document.createElement('option');
          option.value = collection.id;
          option.textContent = `${collection.name} (${collection.domains ? collection.domains.length : 0}个域名)`;
          domainCollectionSelect.appendChild(option);
        }
      });
    } catch (error) {
      console.error('加载集合选择器出错:', error);
      domainCollectionSelect.innerHTML = `<option value="">加载出错: ${error.message || '未知错误'}</option>`;
    }
  }
  
  /**
   * 加载保存的域名
   */
  async function loadSavedDomains(collectionId) {
    try {
      // 清空现有列表
      domainsList.innerHTML = '<li style="padding: 10px;">加载中...</li>';
      
      // 确保storageUtils已加载
      if (!window.storageUtils) {
        console.error('storageUtils未加载，无法加载域名');
        domainsList.innerHTML = '<li style="padding: 10px; color: red;">加载失败: 存储模块未加载</li>';
        return;
      }
      
      // 使用storageUtils中的getDomainCollections获取特定集合
      const collection = await window.storageUtils.getDomainCollections(collectionId);
      
      // 清空现有列表（再次清空，以防加载过程中已经有内容）
      domainsList.innerHTML = '';
      
      if (!collection || !collection.domains || collection.domains.length === 0) {
        // 没有保存的域名
        const emptyMessage = document.createElement('li');
        emptyMessage.textContent = '此分类中暂无保存的域名';
        emptyMessage.style.padding = '10px';
        domainsList.appendChild(emptyMessage);
        
        // 更新统计信息
        document.getElementById('domainCount').textContent = '0';
        return;
      }
      
      // 获取所有域名
      let domains = [];
      collection.domains.forEach(domain => {
        // 仅添加包含有效域名的项
        if (domain && domain.domain) {
          domains.push({
            ...domain,
            collectionId  // 添加集合ID，便于后续操作
          });
        }
      });
      
      if (domains.length === 0) {
        const emptyMessage = document.createElement('li');
        emptyMessage.textContent = '此分类中暂无有效的域名数据';
        emptyMessage.style.padding = '10px';
        domainsList.appendChild(emptyMessage);
        
        // 更新统计信息
        document.getElementById('domainCount').textContent = '0';
        return;
      }
      
      // 检查是否有排序状态
      chrome.storage.local.get(['sortState', 'trafficCache'], function(data) {
        const sortState = data.sortState;
        const trafficCache = data.trafficCache || {};
        
        // 根据排序状态应用排序
        if (sortState && sortState.collectionId === collectionId) {
          if (sortState.type === 'registrationDate') {
            // 按注册时间排序
            domains.sort((a, b) => {
              const dateA = a.metadata && a.metadata.registrationDate 
                ? new Date(a.metadata.registrationDate).getTime() 
                : 0;
              const dateB = b.metadata && b.metadata.registrationDate 
                ? new Date(b.metadata.registrationDate).getTime() 
                : 0;
              
              // 如果没有注册时间，将其排在最后
              if (dateA === 0 && dateB === 0) {
                return a.domain.localeCompare(b.domain);
              }
              if (dateA === 0) return 1;
              if (dateB === 0) return -1;
              
              // 默认按时间降序（新的排在前面）
              return dateB - dateA;
            });
            
            // 更新排序选择器状态
            const sortByTrafficSelect = document.getElementById('sortByTraffic');
            if (sortByTrafficSelect) {
              sortByTrafficSelect.value = 'none';
            }
          } else if (sortState.type === 'traffic') {
            // 加载流量数据
            for (const domain of domains) {
              if (trafficCache[domain.domain]) {
                domain.traffic = trafficCache[domain.domain].totalVisits || 0;
              } else {
                domain.traffic = 0;
              }
            }
            
            // 按流量排序
            const descending = sortState.descending !== false; // 默认为降序
            domains.sort((a, b) => {
              const trafficA = a.traffic || 0;
              const trafficB = b.traffic || 0;
              return descending ? trafficB - trafficA : trafficA - trafficB;
            });
            
            // 更新排序选择器状态
            const sortByTrafficSelect = document.getElementById('sortByTraffic');
            if (sortByTrafficSelect) {
              sortByTrafficSelect.value = descending ? 'desc' : 'asc';
            }
          } else {
            // 默认排序
            domains.sort((a, b) => {
              const domainA = a.domain || '';
              const domainB = b.domain || '';
              return domainA.localeCompare(domainB);
            });
            
            // 重置排序选择器
            const sortByTrafficSelect = document.getElementById('sortByTraffic');
            if (sortByTrafficSelect) {
              sortByTrafficSelect.value = 'none';
            }
          }
        } else {
          // 默认按域名排序
          domains.sort((a, b) => {
            const domainA = a.domain || '';
            const domainB = b.domain || '';
            return domainA.localeCompare(domainB);
          });
          
          // 重置排序选择器
          const sortByTrafficSelect = document.getElementById('sortByTraffic');
          if (sortByTrafficSelect) {
            sortByTrafficSelect.value = 'none';
          }
        }
        
        // 更新统计信息
        document.getElementById('domainCount').textContent = domains.length.toString();
        
        // 创建域名列表
        domains.forEach(domain => {
          const item = createDomainItem({
            ...domain,
            collectionId: collectionId
          });
          domainsList.appendChild(item);
        });
        
        // 检查是否有域名包含注册时间数据，如果有则启用注册时间排序按钮
        const hasRegistrationDate = domains.some(domain => 
          domain.metadata && domain.metadata.registrationDate
        );
        
        const sortByRegistrationDateBtn = document.getElementById('sortByRegistrationDateBtn');
        if (sortByRegistrationDateBtn) {
          sortByRegistrationDateBtn.disabled = !hasRegistrationDate;
        }
      });
    } catch (error) {
      console.error('加载域名出错:', error);
      domainsList.innerHTML = '';
      const errorMessage = document.createElement('li');
      errorMessage.textContent = `加载失败: ${error.message || '未知错误'}`;
      errorMessage.style.padding = '10px';
      errorMessage.style.color = 'red';
      domainsList.appendChild(errorMessage);
      
      // 重置统计信息
      document.getElementById('domainCount').textContent = '0';
    }
  }
  
  /**
   * 创建域名列表项
   */
  function createDomainItem(domainData) {
    const item = document.createElement('li');
    item.className = 'domain-item';
    item.dataset.domain = domainData.domain;
    item.dataset.collectionId = domainData.collectionId;
    item.dataset.traffic = '0'; // 初始化流量数据
    
    // 添加复选框
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'domain-checkbox';
    checkbox.addEventListener('change', updateSelectedCount);
    
    const domainText = document.createElement('div');
    domainText.textContent = domainData.domain;
    domainText.style.marginLeft = '10px';
    domainText.style.flexGrow = '1';
    
    const domainInfoContainer = document.createElement('div');
    domainInfoContainer.style.display = 'flex';
    domainInfoContainer.style.flexDirection = 'column';
    domainInfoContainer.style.marginLeft = '10px';
    domainInfoContainer.style.flexGrow = '1';
    
    domainInfoContainer.appendChild(domainText);
    
    const dateInfo = document.createElement('div');
    dateInfo.style.display = 'flex';
    dateInfo.style.marginTop = '5px';
    dateInfo.style.fontSize = '12px';
    dateInfo.style.color = '#666';
    
    // 添加日期信息
    const addedDate = document.createElement('div');
    addedDate.style.marginRight = '15px';
    if (domainData.addedDate) {
      const date = new Date(domainData.addedDate);
      addedDate.textContent = `添加于 ${date.toLocaleDateString()}`;
    }
    dateInfo.appendChild(addedDate);
    
    // 添加注册时间信息 (如果有)
    if (domainData.metadata && domainData.metadata.registrationDate) {
      const registrationDate = document.createElement('div');
      registrationDate.style.fontWeight = 'bold';
      registrationDate.style.color = '#388e3c';
      
      const date = new Date(domainData.metadata.registrationDate);
      registrationDate.textContent = `注册于 ${date.toLocaleDateString()}`;
      
      dateInfo.appendChild(registrationDate);
    }
    
    domainInfoContainer.appendChild(dateInfo);
    
    const domainInfo = document.createElement('div');
    domainInfo.style.display = 'flex';
    domainInfo.style.alignItems = 'flex-start';
    domainInfo.style.flexGrow = '1';
    domainInfo.appendChild(checkbox);
    domainInfo.appendChild(domainInfoContainer);
    
    const actions = document.createElement('div');
    actions.className = 'domain-item-actions';
    
    const editBtn = document.createElement('button');
    editBtn.textContent = '编辑';
    editBtn.addEventListener('click', () => editDomain(domainData));
    
    const addToFilterBtn = document.createElement('button');
    addToFilterBtn.textContent = '加入过滤';
    addToFilterBtn.style.backgroundColor = '#ff9800';
    addToFilterBtn.addEventListener('click', () => addDomainToFilter(domainData.domain, domainData.collectionId));
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '删除';
    deleteBtn.style.backgroundColor = '#dc3545';
    deleteBtn.addEventListener('click', () => handleDeleteDomain(domainData.domain, domainData.collectionId));
    
    // 查询流量数据显示
    chrome.storage.local.get('trafficCache', function(data) {
      const cache = data.trafficCache || {};
      if (cache[domainData.domain]) {
        const trafficBadge = document.createElement('span');
        trafficBadge.className = 'traffic-badge';
        trafficBadge.textContent = window.serpstatUtils.formatTrafficCount(cache[domainData.domain].totalVisits) + '/月';
        actions.prepend(trafficBadge);
        
        // 设置流量数据属性
        item.dataset.traffic = cache[domainData.domain].totalVisits || '0';
      }
    });
    
    actions.appendChild(editBtn);
    actions.appendChild(addToFilterBtn);
    actions.appendChild(deleteBtn);
    
    item.appendChild(domainInfo);
    item.appendChild(actions);
    
    return item;
  }
  
  /**
   * 编辑域名
   */
  function editDomain(domainData) {
    // 这里会实现编辑功能
    alert('编辑功能将在后续版本实现');
  }
  
  /**
   * 添加域名到过滤清单
   * @param {string} domain - 域名
   * @param {string} collectionId - 集合ID
   */
  async function addDomainToFilter(domain, collectionId) {
    if (!confirm(`确定要将域名 "${domain}" 加入过滤清单吗？\n加入后该域名将从集合中删除，且不会再被保存。`)) {
      return;
    }
    
    try {
      // 确保storageUtils已加载
      if (!window.storageUtils) {
        alert('系统正在加载中，请稍后再试');
        return;
      }
      
      // 添加到过滤列表
      const addSuccess = await window.storageUtils.addToFilteredDomains(domain);
      
      if (addSuccess) {
        // 从集合中删除该域名
        const deleteSuccess = await window.storageUtils.deleteDomain(domain, collectionId);
        
        if (deleteSuccess) {
          // 成功添加到过滤列表并从集合中删除
          
          // 更新当前视图
          const currentCollectionId = domainCollectionSelect.value;
          if (currentCollectionId === collectionId) {
            // 重新加载当前集合的域名
            loadSavedDomains(currentCollectionId);
          }
          
          // 更新集合选择器
          loadCollectionSelector().then(() => {
            // 保持选择当前集合
            if (currentCollectionId === collectionId) {
              domainCollectionSelect.value = currentCollectionId;
            }
          });
          
          // 如果过滤清单标签页已加载，更新过滤域名列表
          const filterTab = document.querySelector('.tab[data-tab="filter"]');
          if (filterTab.classList.contains('active')) {
            loadFilteredDomains();
          }
          
          alert(`域名 "${domain}" 已成功加入过滤清单，并从集合中删除`);
        } else {
          // 添加到过滤列表成功，但从集合中删除失败
          alert(`域名已添加到过滤清单，但从集合中删除失败`);
        }
      } else {
        alert('添加到过滤清单失败，请稍后重试');
      }
    } catch (error) {
      console.error('添加域名到过滤清单出错:', error);
      alert(`添加到过滤清单出错: ${error.message}`);
    }
  }
  
  /**
   * 处理删除域名
   */
  async function handleDeleteDomain(domain, collectionId) {
    if (!confirm(`确定要删除域名 "${domain}" 吗？`)) {
      return;
    }
    
    try {
      // 确保storageUtils已加载
      if (!window.storageUtils) {
        alert('系统正在加载中，请稍后再试');
        return;
      }
      
      // 使用storageUtils中的deleteDomain函数
      const success = await window.storageUtils.deleteDomain(domain, collectionId);
      
      if (success) {
        // 更新选定集合的域名显示
        const currentCollectionId = domainCollectionSelect.value;
        if (currentCollectionId === collectionId) {
          // 重新加载当前集合的域名
          loadSavedDomains(currentCollectionId);
          
          // 更新集合选择器，以更新显示的域名数量
          loadCollectionSelector().then(() => {
            // 保持选择当前集合
            domainCollectionSelect.value = currentCollectionId;
          });
        } else {
          // 更新集合选择器
          loadCollectionSelector();
        }
      } else {
        alert('删除域名失败，请稍后重试');
      }
    } catch (error) {
      console.error('删除域名出错:', error);
      alert(`删除域名出错: ${error.message}`);
    }
  }
  
  /**
   * 过滤域名
   */
  function filterDomains() {
    const filterText = filterInput.value.toLowerCase();
    const items = domainsList.querySelectorAll('.domain-item');
    
    items.forEach(item => {
      const domain = item.dataset.domain;
      if (domain && domain.toLowerCase().includes(filterText)) {
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    });
  }
  
  /**
   * 处理导出域名
   */
  async function handleExportDomains() {
    const format = document.getElementById('exportFormat').value;
    const collectionId = document.getElementById('exportCollection').value;
    
    try {
      // 确保storageUtils已加载
      if (!window.storageUtils) {
        alert('系统正在加载中，请稍后再试');
        return;
      }
      
      // 使用storageUtils中的exportDomains函数
      // 当collectionId为空字符串时，传入null导出所有集合
      const exportData = await window.storageUtils.exportDomains(
        collectionId ? collectionId : null, 
        format
      );
      
      // 设置文件名和MIME类型
      let fileName, mimeType;
      if (format === 'json') {
        fileName = 'domains.json';
        mimeType = 'application/json';
      } else {
        fileName = 'domains.csv';
        mimeType = 'text/csv';
      }
      
      // 创建下载链接
      const blob = new Blob([exportData], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      
      // 清理
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error('导出域名出错:', error);
      alert(`导出失败: ${error.message}`);
    }
  }
  
  /**
   * 处理导入域名
   */
  async function handleImportDomains() {
    const format = document.getElementById('importFormat').value;
    const fileInput = document.getElementById('importFile');
    
    if (!fileInput.files.length) {
      alert('请选择文件');
      return;
    }
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = async function(e) {
      try {
        // 确保storageUtils已加载
        if (!window.storageUtils) {
          alert('系统正在加载中，请稍后再试');
          return;
        }
        
        const data = e.target.result;
        
        // 使用storageUtils中的importDomains函数
        const success = await window.storageUtils.importDomains(data, format, true);
        
        if (success) {
          alert('域名导入成功');
          loadSavedDomains(); // 刷新列表
        } else {
          alert('导入失败，请检查文件格式');
        }
      } catch (error) {
        alert('导入失败: ' + error.message);
      }
    };
    
    reader.readAsText(file);
  }

  /**
   * 加载分类列表
   */
  async function loadCollections() {
    const collectionsList = document.getElementById('collectionsList');
    
    try {
      // 显示加载消息
      collectionsList.innerHTML = '<li style="padding: 10px;">加载中...</li>';
      
      // 确保storageUtils已加载
      if (!window.storageUtils) {
        console.error('storageUtils未加载，无法加载分类');
        collectionsList.innerHTML = '<li style="padding: 10px; color: red;">加载失败: 存储模块未加载</li>';
        return;
      }
      
      // 使用storageUtils中的getDomainCollections获取分类集合
      const collections = await window.storageUtils.getDomainCollections();
      
      // 清空现有列表
      collectionsList.innerHTML = '';
      
      if (!collections || collections.length === 0) {
        // 没有保存的分类
        const emptyMessage = document.createElement('li');
        emptyMessage.textContent = '暂无保存的分类';
        emptyMessage.style.padding = '10px';
        collectionsList.appendChild(emptyMessage);
        return;
      }
      
      // 创建分类列表
      collections.forEach(collection => {
        // 确保集合对象有效
        if (collection && collection.id) {
          const item = createCollectionItem(collection);
          collectionsList.appendChild(item);
        }
      });
      
      // 如果没有有效的集合，显示空消息
      if (collectionsList.children.length === 0) {
        const emptyMessage = document.createElement('li');
        emptyMessage.textContent = '暂无有效的分类数据';
        emptyMessage.style.padding = '10px';
        collectionsList.appendChild(emptyMessage);
      }
    } catch (error) {
      console.error('加载分类出错:', error);
      collectionsList.innerHTML = '';
      const errorMessage = document.createElement('li');
      errorMessage.textContent = `加载失败: ${error.message || '未知错误'}`;
      errorMessage.style.padding = '10px';
      errorMessage.style.color = 'red';
      collectionsList.appendChild(errorMessage);
    }
  }

  /**
   * 创建分类列表项
   * @param {Object} collection - 分类对象
   * @returns {HTMLElement} - 列表项元素
   */
  function createCollectionItem(collection) {
    const item = document.createElement('li');
    item.className = 'collection-item';
    item.dataset.id = collection.id;
    
    const collectionInfo = document.createElement('div');
    collectionInfo.className = 'collection-info';
    
    const collectionName = document.createElement('div');
    collectionName.className = 'collection-name';
    collectionName.textContent = collection.name;
    
    const collectionDescription = document.createElement('div');
    collectionDescription.className = 'collection-description';
    collectionDescription.textContent = collection.description || '无描述';
    
    collectionInfo.appendChild(collectionName);
    collectionInfo.appendChild(collectionDescription);
    
    const collectionCount = document.createElement('span');
    collectionCount.className = 'collection-count';
    collectionCount.textContent = collection.domains ? collection.domains.length : 0;
    
    const collectionActions = document.createElement('div');
    collectionActions.className = 'collection-actions';
    
    // 默认集合不允许删除，只能重命名
    if (collection.id === 'default') {
      const editBtn = document.createElement('button');
      editBtn.textContent = '重命名';
      editBtn.addEventListener('click', () => editCollection(collection));
      collectionActions.appendChild(editBtn);
    } else {
      const editBtn = document.createElement('button');
      editBtn.textContent = '编辑';
      editBtn.addEventListener('click', () => editCollection(collection));
      
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '删除';
      deleteBtn.style.backgroundColor = '#dc3545';
      deleteBtn.addEventListener('click', () => deleteCollection(collection.id));
      
      collectionActions.appendChild(editBtn);
      collectionActions.appendChild(deleteBtn);
    }
    
    item.appendChild(collectionInfo);
    item.appendChild(collectionCount);
    item.appendChild(collectionActions);
    
    return item;
  }

  /**
   * 显示编辑分类表单
   * @param {Object} collection - 分类对象
   */
  function editCollection(collection) {
    // 移除已存在的编辑表单
    const existingForm = document.querySelector('.edit-collection-form');
    if (existingForm) {
      existingForm.remove();
    }
    
    // 创建编辑表单
    const form = document.createElement('div');
    form.className = 'edit-collection-form';
    
    const nameLabel = document.createElement('label');
    nameLabel.textContent = '分类名称';
    nameLabel.htmlFor = 'editCollectionName';
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = 'editCollectionName';
    nameInput.value = collection.name;
    nameInput.style.marginBottom = '10px';
    
    const descLabel = document.createElement('label');
    descLabel.textContent = '分类描述';
    descLabel.htmlFor = 'editCollectionDescription';
    
    const descInput = document.createElement('input');
    descInput.type = 'text';
    descInput.id = 'editCollectionDescription';
    descInput.value = collection.description || '';
    descInput.style.marginBottom = '10px';
    
    const buttonRow = document.createElement('div');
    buttonRow.style.display = 'flex';
    buttonRow.style.justifyContent = 'space-between';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.style.backgroundColor = '#6c757d';
    
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '保存';
    
    buttonRow.appendChild(cancelBtn);
    buttonRow.appendChild(saveBtn);
    
    form.appendChild(nameLabel);
    form.appendChild(nameInput);
    form.appendChild(descLabel);
    form.appendChild(descInput);
    form.appendChild(buttonRow);
    
    // 查找对应的分类项并添加表单
    const collectionItem = document.querySelector(`.collection-item[data-id="${collection.id}"]`);
    if (collectionItem) {
      collectionItem.after(form);
    }
    
    // 添加事件处理
    cancelBtn.addEventListener('click', () => {
      form.remove();
    });
    
    saveBtn.addEventListener('click', async () => {
      const newName = nameInput.value.trim();
      const newDescription = descInput.value.trim();
      
      if (!newName) {
        alert('分类名称不能为空');
        return;
      }
      
      try {
        // 使用storageUtils中的renameCollection函数
        const success = await window.storageUtils.renameCollection(
          collection.id, 
          newName, 
          newDescription
        );
        
        if (success) {
          // 重新加载分类列表
          loadCollections();
          form.remove();
          showMessage('分类已更新', 'success');
        } else {
          alert('更新分类失败，请稍后重试');
        }
      } catch (error) {
        console.error('更新分类出错:', error);
        alert(`更新分类出错: ${error.message}`);
      }
    });
  }

  /**
   * 删除分类
   * @param {string} collectionId - 分类ID
   */
  async function deleteCollection(collectionId) {
    if (!confirm('确定要删除此分类吗？分类内的域名将会一同删除')) {
      return;
    }
    
    try {
      // 使用storageUtils中的deleteCollection函数
      const success = await window.storageUtils.deleteCollection(collectionId);
      
      if (success) {
        // 从UI中移除
        const item = document.querySelector(`.collection-item[data-id="${collectionId}"]`);
        if (item) item.remove();
        
        showMessage('分类已删除', 'success');
        
        // 检查域名管理选项卡中是否选择了此集合
        const currentCollectionId = domainCollectionSelect ? domainCollectionSelect.value : '';
        if (currentCollectionId === collectionId) {
          // 如果当前正在查看被删除的集合，更新域名视图
          domainManagementArea.style.display = 'none';
          noDomainMessage.style.display = 'block';
        }
        
        // 更新集合选择器
        loadCollectionSelector();
        
        // 重新加载分类列表
        loadCollections();
      } else {
        alert('删除分类失败，请稍后重试');
      }
    } catch (error) {
      console.error('删除分类出错:', error);
      alert(`删除分类出错: ${error.message}`);
    }
  }

  /**
   * 添加新分类
   */
  async function addCollection() {
    const nameInput = document.getElementById('newCollectionName');
    const descInput = document.getElementById('newCollectionDescription');
    
    const name = nameInput.value.trim();
    const description = descInput.value.trim();
    
    if (!name) {
      alert('分类名称不能为空');
      return;
    }
    
    try {
      // 使用storageUtils中的createCollection函数
      const newCollection = await window.storageUtils.createCollection(name, description);
      
      if (newCollection) {
        // 清空输入框
        nameInput.value = '';
        descInput.value = '';
        
        // 更新集合选择器
        loadCollectionSelector();
        
        // 重新加载分类列表
        loadCollections();
        
        showMessage('分类创建成功', 'success');
      } else {
        alert('创建分类失败，请稍后重试');
      }
    } catch (error) {
      console.error('创建分类出错:', error);
      alert(`创建分类出错: ${error.message}`);
    }
  }

  /**
   * 显示消息
   * @param {string} message - 消息内容
   * @param {string} type - 消息类型：'success' 或 'error'
   */
  function showMessage(message, type = 'success') {
    // 移除已有消息
    const existingMessages = document.querySelectorAll('.success-message, .error-message');
    existingMessages.forEach(msg => msg.remove());
    
    // 创建新消息
    const messageElement = document.createElement('div');
    messageElement.className = type === 'success' ? 'success-message' : 'error-message';
    messageElement.textContent = message;
    
    // 添加到collections标签页
    const collectionsTab = document.getElementById('collections');
    collectionsTab.insertBefore(messageElement, collectionsTab.firstChild.nextSibling);
    
    // 自动消失
    setTimeout(() => {
      messageElement.remove();
    }, 3000);
  }

  /**
   * 加载过滤域名列表
   */
  async function loadFilteredDomains() {
    try {
      // 显示加载中
      filteredDomainsList.innerHTML = '<li style="padding: 10px; text-align: center; color: #999;">加载中...</li>';
      
      // 确保storageUtils已加载
      if (!window.storageUtils) {
        console.error('storageUtils未加载，无法加载过滤域名');
        filteredDomainsList.innerHTML = '<li style="padding: 10px; color: red;">加载失败: 存储模块未加载</li>';
        document.getElementById('filteredCount').textContent = '0';
        return;
      }
      
      // 获取过滤域名
      const filteredDomains = await window.storageUtils.getFilteredDomains();
      
      // 清空列表
      filteredDomainsList.innerHTML = '';
      
      // 更新计数
      document.getElementById('filteredCount').textContent = filteredDomains.length.toString();
      
      if (filteredDomains.length === 0) {
        filteredDomainsList.innerHTML = '<li style="padding: 10px; text-align: center; color: #666;">暂无过滤域名</li>';
        return;
      }
      
      // 按字母顺序排序
      filteredDomains.sort((a, b) => {
        const domainA = a || '';
        const domainB = b || '';
        return domainA.localeCompare(domainB);
      });
      
      // 创建域名列表
      filteredDomains.forEach(domain => {
        const item = createFilteredDomainItem(domain);
        filteredDomainsList.appendChild(item);
      });
    } catch (error) {
      console.error('加载过滤域名出错:', error);
      filteredDomainsList.innerHTML = `<li style="padding: 10px; color: red;">加载失败: ${error.message || '未知错误'}</li>`;
      document.getElementById('filteredCount').textContent = '0';
    }
  }

  /**
   * 创建过滤域名列表项
   * @param {string} domain - 域名
   * @returns {HTMLElement} - 列表项元素
   */
  function createFilteredDomainItem(domain) {
    const item = document.createElement('li');
    item.className = 'domain-item filtered-domain-item';
    item.dataset.domain = domain;
    
    const domainText = document.createElement('div');
    domainText.textContent = domain;
    domainText.style.flexGrow = '1';
    
    const actions = document.createElement('div');
    actions.className = 'domain-item-actions';
    
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '移除';
    removeBtn.style.backgroundColor = '#dc3545';
    removeBtn.addEventListener('click', () => removeFilteredDomain(domain));
    
    actions.appendChild(removeBtn);
    
    item.appendChild(domainText);
    item.appendChild(actions);
    
    return item;
  }

  /**
   * 添加过滤域名
   */
  async function addFilteredDomain() {
    const input = document.getElementById('newFilteredDomain');
    const domain = input.value.trim();
    
    if (!domain) {
      alert('请输入有效的域名');
      return;
    }
    
    try {
      // 确保storageUtils已加载
      if (!window.storageUtils) {
        alert('系统正在加载中，请稍后再试');
        return;
      }
      
      // 添加到过滤列表
      const success = await window.storageUtils.addToFilteredDomains(domain);
      
      if (success) {
        // 清空输入框
        input.value = '';
        
        // 显示成功消息
        showFilterMessage('域名已添加到过滤清单', 'success');
        
        // 重新加载过滤域名列表
        loadFilteredDomains();
      } else {
        alert('添加过滤域名失败，请稍后重试');
      }
    } catch (error) {
      console.error('添加过滤域名出错:', error);
      alert(`添加过滤域名出错: ${error.message}`);
    }
  }

  /**
   * 从过滤清单中移除域名
   * @param {string} domain - 要移除的域名
   */
  async function removeFilteredDomain(domain) {
    if (!confirm(`确定要从过滤清单中移除域名 "${domain}" 吗？`)) {
      return;
    }
    
    try {
      // 确保storageUtils已加载
      if (!window.storageUtils) {
        alert('系统正在加载中，请稍后再试');
        return;
      }
      
      // 从过滤列表中移除
      const success = await window.storageUtils.removeFromFilteredDomains(domain);
      
      if (success) {
        // 显示成功消息
        showFilterMessage('域名已从过滤清单中移除', 'success');
        
        // 重新加载过滤域名列表
        loadFilteredDomains();
      } else {
        alert('移除过滤域名失败，请稍后重试');
      }
    } catch (error) {
      console.error('移除过滤域名出错:', error);
      alert(`移除过滤域名出错: ${error.message}`);
    }
  }

  /**
   * 过滤过滤域名列表
   */
  function filterFilteredDomains() {
    const filterText = filterFilteredDomainsInput.value.toLowerCase();
    const items = filteredDomainsList.querySelectorAll('.filtered-domain-item');
    
    items.forEach(item => {
      const domain = item.dataset.domain;
      if (domain && domain.toLowerCase().includes(filterText)) {
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    });
  }

  /**
   * 显示过滤清单页面的消息
   * @param {string} message - 消息内容
   * @param {string} type - 消息类型：'success' 或 'error'
   */
  function showFilterMessage(message, type = 'success') {
    // 移除已有消息
    const existingMessages = document.querySelectorAll('.success-message, .error-message');
    existingMessages.forEach(msg => msg.remove());
    
    // 创建新消息
    const messageElement = document.createElement('div');
    messageElement.className = type === 'success' ? 'success-message' : 'error-message';
    messageElement.textContent = message;
    
    // 添加到过滤清单标签页
    const filterTab = document.getElementById('filter');
    filterTab.insertBefore(messageElement, filterTab.querySelector('p').nextSibling);
    
    // 自动消失
    setTimeout(() => {
      messageElement.remove();
    }, 3000);
  }

  // 添加批量操作事件监听器
  if (selectAllDomainsCheckbox) {
    selectAllDomainsCheckbox.addEventListener('change', toggleSelectAllDomains);
  }
  
  if (invertSelectionBtn) {
    invertSelectionBtn.addEventListener('click', invertDomainSelection);
  }
  
  if (batchDeleteBtn) {
    batchDeleteBtn.addEventListener('click', handleBatchDelete);
  }
  
  if (batchAddToFilterBtn) {
    batchAddToFilterBtn.addEventListener('click', handleBatchAddToFilter);
  }

  /**
   * 更新已选择的域名数量
   */
  function updateSelectedCount() {
    const checkedDomains = document.querySelectorAll('#domainsList .domain-checkbox:checked');
    const count = checkedDomains.length;
    
    // 更新显示的数量
    selectedCountSpan.textContent = `已选择 ${count} 项`;
    
    // 显示或隐藏批量操作按钮
    if (count > 0) {
      batchActionButtons.style.display = 'block';
    } else {
      batchActionButtons.style.display = 'none';
    }
  }
  
  /**
   * 全选/取消全选域名
   */
  function toggleSelectAllDomains() {
    const checkboxes = document.querySelectorAll('#domainsList .domain-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = selectAllDomainsCheckbox.checked;
    });
    
    updateSelectedCount();
  }
  
  /**
   * 反选域名
   */
  function invertDomainSelection() {
    const checkboxes = document.querySelectorAll('#domainsList .domain-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = !checkbox.checked;
    });
    
    // 更新全选框状态
    const allChecked = document.querySelectorAll('#domainsList .domain-checkbox:not(:checked)').length === 0;
    selectAllDomainsCheckbox.checked = allChecked;
    
    updateSelectedCount();
  }
  
  /**
   * 获取选中的域名信息
   * @returns {Array} 选中的域名信息数组，每项包含domain和collectionId
   */
  function getSelectedDomains() {
    const selectedItems = document.querySelectorAll('#domainsList .domain-checkbox:checked');
    return Array.from(selectedItems).map(checkbox => {
      const item = checkbox.closest('.domain-item');
      return {
        domain: item.dataset.domain,
        collectionId: item.dataset.collectionId
      };
    });
  }
  
  /**
   * 批量删除域名
   */
  async function handleBatchDelete() {
    const selectedDomains = getSelectedDomains();
    
    if (selectedDomains.length === 0) {
      alert('请先选择要删除的域名');
      return;
    }
    
    if (!confirm(`确定要删除选中的 ${selectedDomains.length} 个域名吗？`)) {
      return;
    }
    
    try {
      // 确保storageUtils已加载
      if (!window.storageUtils) {
        alert('系统正在加载中，请稍后再试');
        return;
      }
      
      let successCount = 0;
      let failCount = 0;
      
      // 按集合分组处理
      const groupedByCollection = {};
      selectedDomains.forEach(item => {
        if (!groupedByCollection[item.collectionId]) {
          groupedByCollection[item.collectionId] = [];
        }
        groupedByCollection[item.collectionId].push(item.domain);
      });
      
      // 逐个处理每个集合中的域名
      for (const collectionId in groupedByCollection) {
        const domains = groupedByCollection[collectionId];
        for (const domain of domains) {
          try {
            const success = await window.storageUtils.deleteDomain(domain, collectionId);
            if (success) {
              successCount++;
            } else {
              failCount++;
            }
          } catch (e) {
            console.error(`删除域名 ${domain} 出错:`, e);
            failCount++;
          }
        }
      }
      
      // 更新集合选择器
      const currentCollectionId = domainCollectionSelect.value;
      await loadCollectionSelector();
      
      // 保持当前选择的集合
      if (currentCollectionId) {
        domainCollectionSelect.value = currentCollectionId;
        loadSavedDomains(currentCollectionId);
      }
      
      // 显示结果
      if (failCount === 0) {
        alert(`成功删除 ${successCount} 个域名`);
      } else {
        alert(`操作完成: ${successCount} 个域名删除成功, ${failCount} 个域名删除失败`);
      }
    } catch (error) {
      console.error('批量删除域名出错:', error);
      alert(`批量删除出错: ${error.message}`);
    }
  }
  
  /**
   * 批量添加域名到过滤清单
   */
  async function handleBatchAddToFilter() {
    const selectedDomains = getSelectedDomains();
    
    if (selectedDomains.length === 0) {
      alert('请先选择要添加到过滤清单的域名');
      return;
    }
    
    if (!confirm(`确定要将选中的 ${selectedDomains.length} 个域名加入过滤清单吗？\n加入后这些域名将从集合中删除，且不会再被保存。`)) {
      return;
    }
    
    try {
      // 确保storageUtils已加载
      if (!window.storageUtils) {
        alert('系统正在加载中，请稍后再试');
        return;
      }
      
      // 提取所有域名
      const domains = selectedDomains.map(item => item.domain);
      
      // 添加到过滤列表
      const addSuccess = await window.storageUtils.addToFilteredDomains(domains);
      
      if (addSuccess) {
        let successCount = 0;
        let failCount = 0;
        
        // 从各自的集合中删除
        for (const item of selectedDomains) {
          try {
            const success = await window.storageUtils.deleteDomain(item.domain, item.collectionId);
            if (success) {
              successCount++;
            } else {
              failCount++;
            }
          } catch (e) {
            console.error(`从集合中删除域名 ${item.domain} 出错:`, e);
            failCount++;
          }
        }
        
        // 更新集合选择器
        const currentCollectionId = domainCollectionSelect.value;
        await loadCollectionSelector();
        
        // 保持当前选择的集合
        if (currentCollectionId) {
          domainCollectionSelect.value = currentCollectionId;
          loadSavedDomains(currentCollectionId);
        }
        
        // 更新过滤域名列表（如果正在查看）
        const filterTab = document.querySelector('.tab[data-tab="filter"]');
        if (filterTab.classList.contains('active')) {
          loadFilteredDomains();
        }
        
        // 显示结果
        if (failCount === 0) {
          alert(`${domains.length} 个域名已添加到过滤清单，并已从集合中删除`);
        } else {
          alert(`${domains.length} 个域名已添加到过滤清单，但有 ${failCount} 个域名从集合中删除失败`);
        }
      } else {
        alert('添加到过滤清单失败，请稍后重试');
      }
    } catch (error) {
      console.error('批量添加到过滤清单出错:', error);
      alert(`批量添加到过滤清单出错: ${error.message}`);
    }
  }

  /**
   * 处理批量查询WHOIS信息
   */
  async function handleBatchQueryWhois() {
    try {
      // 确保domainUtils已加载
      if (!window.domainToolUtils) {
        showMessage('域名工具模块未加载，无法进行查询', 'error');
        return;
      }
      
      // 获取选中的域名
      const selectedDomains = getSelectedDomains();
      if (selectedDomains.length === 0) {
        showMessage('请先选择要查询的域名', 'error');
        return;
      }
      
      // 如果选择的域名太多，提醒用户
      if (selectedDomains.length > 20) {
        if (!confirm(`您选择了${selectedDomains.length}个域名，查询过程可能较慢，是否继续？`)) {
          return;
        }
      }
      
      // 创建进度对话框
      const modal = document.createElement('div');
      modal.style.position = 'fixed';
      modal.style.left = '0';
      modal.style.top = '0';
      modal.style.width = '100%';
      modal.style.height = '100%';
      modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      modal.style.display = 'flex';
      modal.style.justifyContent = 'center';
      modal.style.alignItems = 'center';
      modal.style.zIndex = '1000';
      
      const dialog = document.createElement('div');
      dialog.style.backgroundColor = 'white';
      dialog.style.padding = '20px';
      dialog.style.borderRadius = '8px';
      dialog.style.width = '500px';
      dialog.style.maxWidth = '90%';
      dialog.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
      
      const title = document.createElement('h3');
      title.textContent = '正在查询WHOIS信息';
      title.style.marginTop = '0';
      
      const progressContainer = document.createElement('div');
      progressContainer.style.marginTop = '15px';
      progressContainer.style.marginBottom = '15px';
      
      const progressBar = document.createElement('div');
      progressBar.style.height = '20px';
      progressBar.style.backgroundColor = '#f0f0f0';
      progressBar.style.borderRadius = '4px';
      progressBar.style.overflow = 'hidden';
      
      const progressFill = document.createElement('div');
      progressFill.style.height = '100%';
      progressFill.style.width = '0%';
      progressFill.style.backgroundColor = '#4caf50';
      progressFill.style.transition = 'width 0.2s';
      
      progressBar.appendChild(progressFill);
      progressContainer.appendChild(progressBar);
      
      const statusText = document.createElement('div');
      statusText.textContent = '准备查询...';
      statusText.style.marginTop = '10px';
      
      const resultsList = document.createElement('div');
      resultsList.style.maxHeight = '200px';
      resultsList.style.overflowY = 'auto';
      resultsList.style.marginTop = '15px';
      resultsList.style.border = '1px solid #eee';
      resultsList.style.padding = '10px';
      resultsList.style.display = 'none';
      
      const closeButton = document.createElement('button');
      closeButton.textContent = '关闭';
      closeButton.style.marginTop = '15px';
      closeButton.style.padding = '8px 15px';
      closeButton.style.backgroundColor = '#2196f3';
      closeButton.style.color = 'white';
      closeButton.style.border = 'none';
      closeButton.style.borderRadius = '4px';
      closeButton.style.cursor = 'pointer';
      closeButton.addEventListener('click', () => {
        document.body.removeChild(modal);
      });
      
      dialog.appendChild(title);
      dialog.appendChild(progressContainer);
      dialog.appendChild(statusText);
      dialog.appendChild(resultsList);
      dialog.appendChild(closeButton);
      modal.appendChild(dialog);
      
      document.body.appendChild(modal);
      
      // 进度回调函数
      const progressCallback = (domain, progress, status, error) => {
        progressFill.style.width = `${progress}%`;
        
        let statusMessage = '';
        let className = '';
        
        switch (status) {
          case 'processing':
            statusMessage = `正在查询: ${domain}`;
            className = 'processing';
            break;
          case 'success':
            statusMessage = `✓ ${domain}`;
            className = 'success';
            break;
          case 'error':
            statusMessage = `✗ ${domain}: ${error || '查询失败'}`;
            className = 'error';
            break;
        }
        
        if (status !== 'processing') {
          const resultItem = document.createElement('div');
          resultItem.className = className;
          resultItem.textContent = statusMessage;
          resultItem.style.padding = '5px';
          resultItem.style.borderBottom = '1px solid #eee';
          resultItem.style.color = status === 'success' ? '#388e3c' : '#d32f2f';
          resultsList.appendChild(resultItem);
          resultsList.style.display = 'block';
        }
        
        statusText.textContent = statusMessage;
      };
      
      // 获取当前集合ID
      const currentCollectionId = document.getElementById('domainCollectionSelect').value;
      
      // 执行批量查询
      try {
        const whoisResults = await window.domainToolUtils.batchQueryWhoisInfo(
          selectedDomains.map(item => item.domain),
          progressCallback
        );
        
        // 更新域名记录，添加注册时间信息
        const collection = await window.storageUtils.getDomainCollections(currentCollectionId);
        
        if (collection && collection.domains) {
          let updatedCount = 0;
          
          for (const domain of collection.domains) {
            if (selectedDomains.some(item => item.domain === domain.domain) && 
                whoisResults[domain.domain]) {
              // 更新域名记录中的注册时间
              await window.storageUtils.updateDomainRecord(domain.domain, {
                metadata: {
                  ...domain.metadata,
                  registrationDate: whoisResults[domain.domain]
                }
              }, currentCollectionId);
              
              updatedCount++;
            }
          }
          
          // 完成后更新状态
          statusText.textContent = `查询完成，已更新 ${updatedCount} 个域名的注册时间`;
          progressFill.style.width = '100%';
          progressFill.style.backgroundColor = '#2196f3';
          
          // 更新域名显示
          loadSavedDomains(currentCollectionId);
          
          // 启用排序按钮
          document.getElementById('sortByRegistrationDateBtn').disabled = false;
        }
      } catch (error) {
        console.error('批量查询WHOIS出错:', error);
        statusText.textContent = `查询出错: ${error.message || '未知错误'}`;
        progressFill.style.backgroundColor = '#f44336';
      }
    } catch (error) {
      console.error('处理批量查询WHOIS出错:', error);
      showMessage(`处理出错: ${error.message || '未知错误'}`, 'error');
    }
  }

  /**
   * 处理按注册时间排序
   */
  async function handleSortByRegistrationDate() {
    try {
      // 获取当前集合ID
      const currentCollectionId = document.getElementById('domainCollectionSelect').value;
      
      // 获取当前集合
      const collection = await window.storageUtils.getDomainCollections(currentCollectionId);
      
      if (!collection || !collection.domains || collection.domains.length === 0) {
        showMessage('当前集合中没有域名', 'error');
        return;
      }
      
      // 清空当前列表
      domainsList.innerHTML = '<li style="padding: 10px;">排序中...</li>';
      
      // 复制域名数组，避免直接修改原数组
      const domains = [...collection.domains];
      
      // 按注册时间排序
      domains.sort((a, b) => {
        const dateA = a.metadata && a.metadata.registrationDate 
          ? new Date(a.metadata.registrationDate).getTime() 
          : 0;
        const dateB = b.metadata && b.metadata.registrationDate 
          ? new Date(b.metadata.registrationDate).getTime() 
          : 0;
        
        // 如果没有注册时间，将其排在最后
        if (dateA === 0 && dateB === 0) {
          return a.domain.localeCompare(b.domain);
        }
        if (dateA === 0) return 1;
        if (dateB === 0) return -1;
        
        // 默认按时间降序（新的排在前面）
        return dateB - dateA;
      });
      
      // 清空列表，准备重新渲染
      domainsList.innerHTML = '';
      
      // 更新统计信息
      document.getElementById('domainCount').textContent = domains.length.toString();
      
      // 创建域名列表
      domains.forEach(domain => {
        const item = createDomainItem({
          ...domain,
          collectionId: currentCollectionId
        });
        domainsList.appendChild(item);
      });
      
      // 保存排序状态到本地存储
      chrome.storage.local.set({
        sortState: {
          collectionId: currentCollectionId, 
          type: 'registrationDate'
        }
      });
      
      // 清除其他排序选择器的选中状态
      const sortByTrafficSelect = document.getElementById('sortByTraffic');
      if (sortByTrafficSelect) {
        sortByTrafficSelect.value = 'none';
      }
      
      showMessage('已按注册时间排序', 'success');
    } catch (error) {
      console.error('按注册时间排序出错:', error);
      showMessage(`排序出错: ${error.message || '未知错误'}`, 'error');
    }
  }

  /**
   * 初始化Serpstat API设置
   */
  function initApiSettings() {
    // 获取DOM元素
    const serpstatApiTokenInput = document.getElementById('serpstatApiToken');
    const saveSerpstatApiTokenBtn = document.getElementById('saveSerpstatApiToken');
    const trafficCacheDurationSelect = document.getElementById('trafficCacheDuration');
    const clearTrafficCacheBtn = document.getElementById('clearTrafficCache');
    
    // 加载保存的API标记
    chrome.storage.local.get(['serpstatApiToken', 'trafficCacheDuration'], function(data) {
      if (data.serpstatApiToken) {
        // 显示部分隐藏的API标记
        const token = data.serpstatApiToken;
        if (token.length > 8) {
          const maskedToken = token.substring(0, 4) + '****' + token.substring(token.length - 4);
          serpstatApiTokenInput.value = maskedToken;
          serpstatApiTokenInput.dataset.originalValue = token;
        } else {
          serpstatApiTokenInput.value = token;
        }
      }
      
      // 设置缓存时间
      if (data.trafficCacheDuration) {
        trafficCacheDurationSelect.value = data.trafficCacheDuration;
      }
    });
    
    // 当点击输入框时，如果有原始值，则显示原始值
    serpstatApiTokenInput.addEventListener('focus', function() {
      if (this.dataset.originalValue) {
        this.value = this.dataset.originalValue;
      }
    });
    
    // 保存API标记
    saveSerpstatApiTokenBtn.addEventListener('click', function() {
      const apiToken = serpstatApiTokenInput.value.trim();
      if (!apiToken) {
        showMessage('请输入有效的API标记', 'error');
        return;
      }
      
      // 保存到存储
      chrome.storage.local.set({ serpstatApiToken: apiToken }, function() {
        // 在工具模块中设置API标记
        if (window.serpstatUtils) {
          window.serpstatUtils.setApiToken(apiToken);
        }
        
        // 更新显示
        const maskedToken = apiToken.substring(0, 4) + '****' + apiToken.substring(apiToken.length - 4);
        serpstatApiTokenInput.value = maskedToken;
        serpstatApiTokenInput.dataset.originalValue = apiToken;
        
        showMessage('API标记已保存', 'success');
      });
    });
    
    // 保存缓存时间
    trafficCacheDurationSelect.addEventListener('change', function() {
      chrome.storage.local.set({ trafficCacheDuration: this.value });
    });
    
    // 清除流量数据缓存
    clearTrafficCacheBtn.addEventListener('click', function() {
      chrome.storage.local.remove('trafficCache', function() {
        showMessage('流量数据缓存已清除', 'success');
      });
    });
  }

  /**
   * 初始化流量查询功能
   */
  function initTrafficQuery() {
    // 获取DOM元素
    const queryTrafficBtn = document.getElementById('queryTrafficBtn');
    const queryAllTrafficBtn = document.getElementById('queryAllTrafficBtn');
    const sortByTrafficSelect = document.getElementById('sortByTraffic');
    const trafficQueryStatus = document.getElementById('trafficQueryStatus');
    const trafficQueryProgress = document.getElementById('trafficQueryProgress');
    const trafficProgressBar = document.getElementById('trafficProgressBar');
    const useAllRegionsTrafficCheckbox = document.getElementById('useAllRegionsTraffic');
    
    // 加载用户对查询模式的选择
    chrome.storage.local.get('useAllRegionsTraffic', function(data) {
      if (data.useAllRegionsTraffic !== undefined) {
        useAllRegionsTrafficCheckbox.checked = data.useAllRegionsTraffic;
      }
    });
    
    // 保存用户的查询模式选择
    useAllRegionsTrafficCheckbox.addEventListener('change', function() {
      chrome.storage.local.set({ useAllRegionsTraffic: this.checked });
    });
    
    // 当前选中的域名和全部域名
    let selectedDomains = [];
    let allDomains = [];
    
    // 流量数据缓存
    let trafficDataCache = {};
    
    // 查询选中域名的流量
    queryTrafficBtn.addEventListener('click', function() {
      try {
        console.log('查询选中域名流量按钮被点击');
        // 获取选中的域名
        const checkboxes = document.querySelectorAll('.domain-checkbox:checked');
        selectedDomains = Array.from(checkboxes).map(checkbox => {
          const item = checkbox.closest('.domain-item');
          return item ? item.dataset.domain : null;
        }).filter(domain => domain); // 过滤掉null值
        
        console.log('选中的域名:', selectedDomains);
        
        if (selectedDomains.length === 0) {
          alert('请先选择域名');
          return;
        }
        
        // 查询API标记
        chrome.storage.local.get('serpstatApiToken', function(data) {
          try {
            console.log('获取API标记结果:', data);
            
            if (!data.serpstatApiToken) {
              alert('请先在API设置中配置Serpstat API标记');
              return;
            }
            
            // 检查serpstatUtils是否已加载
            if (!window.serpstatUtils) {
              console.error('Serpstat工具库未加载');
              alert('Serpstat工具库未加载，无法查询流量');
              return;
            }
            
            // 查询流量
            console.log('开始查询选中域名流量');
            queryTrafficForDomains(selectedDomains);
          } catch (error) {
            console.error('获取API标记或查询流量出错:', error);
            alert('查询出错: ' + error.message);
          }
        });
      } catch (error) {
        console.error('查询选中域名流量出错:', error);
        alert('查询出错: ' + error.message);
      }
    });
    
    // 查询所有域名的流量
    queryAllTrafficBtn.addEventListener('click', function() {
      try {
        console.log('查询全部域名流量按钮被点击');
        // 获取当前视图中的所有域名
        allDomains = getCurrentDomainsInView();
        console.log('当前视图中的所有域名:', allDomains);
        
        if (allDomains.length === 0) {
          alert('当前没有域名可以查询');
          return;
        }
        
        // 查询API标记
        chrome.storage.local.get('serpstatApiToken', function(data) {
          try {
            console.log('获取API标记结果:', data);
            
            if (!data.serpstatApiToken) {
              alert('请先在API设置中配置Serpstat API标记');
              return;
            }
            
            // 检查serpstatUtils是否已加载
            if (!window.serpstatUtils) {
              console.error('Serpstat工具库未加载');
              alert('Serpstat工具库未加载，无法查询流量');
              return;
            }
            
            // 查询流量
            console.log('开始查询全部域名流量');
            queryTrafficForDomains(allDomains);
          } catch (error) {
            console.error('获取API标记或查询流量出错:', error);
            alert('查询出错: ' + error.message);
          }
        });
      } catch (error) {
        console.error('查询全部域名流量出错:', error);
        alert('查询出错: ' + error.message);
      }
    });
    
    // 根据流量排序
    sortByTrafficSelect.addEventListener('change', function() {
      const sortOrder = this.value;
      if (sortOrder === 'none') {
        // 恢复默认排序，重新加载域名列表
        clearSortState(); // 清除排序状态
        refreshDomainsList();
      } else {
        // 按流量排序
        sortDomainsByTraffic(sortOrder === 'desc');
      }
    });
    
    /**
     * 刷新域名列表，恢复默认排序
     */
    function refreshDomainsList() {
      // 获取当前选中的集合ID
      const currentCollectionId = domainCollectionSelect.value;
      if (currentCollectionId) {
        // 重新加载当前选中的集合
        loadSavedDomains(currentCollectionId);
      }
    }
    
    /**
     * 查询域名的流量数据
     * @param {string[]} domains - 要查询的域名数组
     */
    function queryTrafficForDomains(domains) {
      try {
        if (!window.serpstatUtils) {
          console.error('Serpstat工具库未加载');
          alert('Serpstat工具库未加载，无法查询流量');
          return;
        }
        
        console.log('准备查询域名流量:', domains);
        
        // 显示查询进度
        trafficQueryStatus.style.display = 'block';
        trafficQueryProgress.textContent = '准备查询...';
        trafficProgressBar.value = 0;
        
        // 显示更详细的状态信息
        let resultsDiv = document.querySelector('#trafficQueryResults');
        if (!resultsDiv) {
          resultsDiv = document.createElement('div');
          resultsDiv.id = 'trafficQueryResults';
          resultsDiv.style.marginTop = '10px';
          resultsDiv.style.maxHeight = '150px';
          resultsDiv.style.overflowY = 'auto';
          resultsDiv.style.border = '1px solid #ccc';
          resultsDiv.style.padding = '5px';
          resultsDiv.style.fontSize = '12px';
          trafficQueryStatus.appendChild(resultsDiv);
        } else {
          // 清空现有内容
          resultsDiv.innerHTML = '';
        }
        
        // 创建状态更新函数
        const updateStatus = (message, isError = false) => {
          const p = document.createElement('p');
          p.style.margin = '2px 0';
          p.style.color = isError ? '#e53935' : '#333';
          p.textContent = message;
          resultsDiv.appendChild(p);
          resultsDiv.scrollTop = resultsDiv.scrollHeight;
        };
        
        updateStatus('开始查询流量数据...');
        
        // 获取缓存时间
        chrome.storage.local.get(['trafficCacheDuration', 'useAllRegionsTraffic'], function(data) {
          try {
            const cacheDuration = parseInt(data.trafficCacheDuration || '86400000');
            console.log('流量数据缓存时间:', cacheDuration);
            
            // 获取是否查询所有地区的设置
            const useAllRegions = data.useAllRegionsTraffic !== undefined ? 
                                data.useAllRegionsTraffic : 
                                useAllRegionsTrafficCheckbox.checked;
            console.log('是否查询所有地区总流量:', useAllRegions);
            updateStatus(`查询模式: ${useAllRegions ? '所有地区总流量' : '单一地区流量'}`);
            
            // 显示API标记提示
            chrome.storage.local.get('serpstatApiToken', function(keyData) {
              if (keyData.serpstatApiToken) {
                const maskedToken = keyData.serpstatApiToken.substring(0, 4) + '****' + 
                  (keyData.serpstatApiToken.length > 8 ? keyData.serpstatApiToken.substring(keyData.serpstatApiToken.length - 4) : '');
                updateStatus(`使用API标记: ${maskedToken}`);
              }
            });
            
            // 执行批量查询
            console.log('开始批量查询流量数据');
            window.serpstatUtils.batchQueryTraffic(domains, (domain, progress, status, error) => {
              try {
                console.log(`域名 ${domain} 查询进度: ${progress}%, 状态: ${status}`);
                
                // 更新进度
                trafficProgressBar.value = progress;
                
                if (status === 'processing') {
                  trafficQueryProgress.textContent = `正在查询: ${domain} (${progress}%)`;
                  updateStatus(`正在查询: ${domain}`);
                } else if (status === 'success') {
                  // 查询成功
                  console.log(`域名 ${domain} 查询成功`);
                  updateStatus(`✓ ${domain} 查询成功`);
                  updateDomainTrafficDisplay(domain);
                } else if (status === 'error') {
                  // 查询失败
                  console.error(`域名 ${domain} 查询失败:`, error);
                  updateStatus(`✗ ${domain}: ${error || '未知错误'}`, true);
                  trafficQueryProgress.textContent = `查询失败: ${domain} - ${error || '未知错误'}`;
                } else if (status === 'complete') {
                  // 查询完成
                  console.log('流量查询完成');
                  trafficQueryProgress.textContent = '查询完成';
                  updateStatus('所有域名查询已完成');
                }
              } catch (error) {
                console.error('流量查询进度回调出错:', error);
              }
            }, useAllRegions).then(results => {
              // 保存结果到缓存
              console.log('流量查询完成，结果:', results);
              trafficDataCache = { ...trafficDataCache, ...results };
              
              // 统计成功和失败的数量
              let successCount = 0, errorCount = 0;
              for (const domain in results) {
                if (results[domain].error) {
                  errorCount++;
                } else {
                  successCount++;
                }
              }
              
              updateStatus(`查询完成: ${successCount}个成功, ${errorCount}个失败`, errorCount > 0);
              
              // 更新排序选择器
              sortByTrafficSelect.value = 'desc';
              // 按流量排序域名
              sortDomainsByTraffic(true);
              
              // 三秒后自动隐藏查询状态
              setTimeout(() => {
                // 保留结果显示，只修改状态文本
                trafficQueryProgress.textContent = '查询已完成';
              }, 3000);
            }).catch(error => {
              console.error('流量查询失败:', error);
              updateStatus(`查询出错: ${error.message || '未知错误'}`, true);
              alert(`查询出错: ${error.message || '未知错误'}`);
              
              // 不隐藏查询状态，让用户可以看到详细错误信息
              trafficQueryProgress.textContent = '查询失败';
            });
          } catch (error) {
            console.error('获取缓存时间出错:', error);
            updateStatus(`获取缓存设置出错: ${error.message}`, true);
            alert(`查询出错: ${error.message}`);
            trafficQueryStatus.style.display = 'none';
          }
        });
      } catch (error) {
        console.error('查询域名流量出错:', error);
        alert(`查询出错: ${error.message}`);
        trafficQueryStatus.style.display = 'none';
      }
    }
    
    /**
     * 更新域名的流量显示
     * @param {string} domain - 域名
     */
    function updateDomainTrafficDisplay(domain) {
      try {
        console.log(`准备更新域名 ${domain} 的流量显示`);
        
        const domainItems = document.querySelectorAll(`.domain-item[data-domain="${domain}"]`);
        console.log(`找到 ${domainItems.length} 个匹配的域名项`);
        
        domainItems.forEach(item => {
          try {
            // 查找或创建流量标签
            let trafficBadge = item.querySelector('.traffic-badge');
            if (!trafficBadge) {
              console.log(`为域名 ${domain} 创建新的流量标签`);
              trafficBadge = document.createElement('span');
              trafficBadge.className = 'traffic-badge';
              
              // 查找actions容器
              const actionsContainer = item.querySelector('.domain-item-actions');
              if (actionsContainer) {
                actionsContainer.prepend(trafficBadge);
              } else {
                console.warn(`域名 ${domain} 没有找到actions容器`);
                // 如果没有找到actions容器，添加到域名项的末尾
                item.appendChild(trafficBadge);
              }
            }
            
            // 获取流量数据
            if (!window.serpstatUtils) {
              console.error('Serpstat工具库未加载，无法获取缓存的流量数据');
              trafficBadge.textContent = '加载错误';
              return;
            }
            
            window.serpstatUtils.getCachedTrafficData(domain).then(data => {
              if (data && data.totalVisits) {
                console.log(`域名 ${domain} 的流量数据:`, data.totalVisits);
                trafficBadge.textContent = window.serpstatUtils.formatTrafficCount(data.totalVisits) + '/月';
                item.dataset.traffic = data.totalVisits;
              } else {
                console.log(`域名 ${domain} 没有流量数据`);
                trafficBadge.textContent = '无流量数据';
                item.dataset.traffic = '0';
              }
            }).catch(error => {
              console.error(`获取域名 ${domain} 的缓存流量数据出错:`, error);
              trafficBadge.textContent = '加载错误';
            });
          } catch (error) {
            console.error(`更新域名 ${domain} 的流量显示出错:`, error);
          }
        });
      } catch (error) {
        console.error(`更新域名流量显示出错:`, error);
      }
    }
    
    /**
     * 获取当前视图中的所有域名
     * @returns {string[]} - 域名数组
     */
    function getCurrentDomainsInView() {
      const domainItems = document.querySelectorAll('.domain-item');
      return Array.from(domainItems).map(item => item.dataset.domain);
    }
    
    /**
     * 清除排序状态
     * @param {string} [exceptType] - 要保留的排序类型
     */
    function clearSortState(exceptType) {
      // 获取当前分类ID
      const currentCollectionId = document.getElementById('domainCollectionSelect').value;
      
      chrome.storage.local.get('sortState', function(data) {
        if (data.sortState) {
          if (!exceptType || (data.sortState.type !== exceptType || data.sortState.collectionId !== currentCollectionId)) {
            // 如果没有指定要保留的类型，或者当前的排序类型不是指定的保留类型，则清除排序状态
            chrome.storage.local.remove('sortState');
          }
        }
      });
    }

    /**
     * 根据流量排序域名
     * @param {boolean} descending - 是否降序排序（从高到低）
     */
    function sortDomainsByTraffic(descending = true) {
      const domainList = document.getElementById('domainsList');
      const domainItems = Array.from(domainList.querySelectorAll('.domain-item'));
      
      // 按流量排序
      domainItems.sort((a, b) => {
        const trafficA = parseInt(a.dataset.traffic || '0');
        const trafficB = parseInt(b.dataset.traffic || '0');
        return descending ? trafficB - trafficA : trafficA - trafficB;
      });
      
      // 清空列表
      domainList.innerHTML = '';
      
      // 重新添加排序后的元素
      domainItems.forEach(item => {
        domainList.appendChild(item);
      });
      
      // 保存排序状态到本地存储
      const currentCollectionId = document.getElementById('domainCollectionSelect').value;
      chrome.storage.local.set({
        sortState: {
          collectionId: currentCollectionId,
          type: 'traffic',
          descending: descending
        }
      });
    }
  }

  /**
   * 加载导出集合选择器
   */
  async function loadExportCollectionSelector() {
    const exportCollectionSelect = document.getElementById('exportCollection');
    
    // 如果元素不存在则返回
    if (!exportCollectionSelect) return;
    
    try {
      // 重置选择器
      exportCollectionSelect.innerHTML = '<option value="">-- 全部域名 --</option>';
      
      // 确保storageUtils已加载
      if (!window.storageUtils) {
        console.error('storageUtils未加载，无法加载集合');
        return;
      }
      
      // 获取所有域名集合
      const collections = await window.storageUtils.getDomainCollections();
      
      if (!collections || collections.length === 0) {
        return;
      }
      
      // 添加集合选项
      collections.forEach(collection => {
        if (collection && collection.id) {
          const option = document.createElement('option');
          option.value = collection.id;
          option.textContent = `${collection.name} (${collection.domains ? collection.domains.length : 0}个域名)`;
          exportCollectionSelect.appendChild(option);
        }
      });
    } catch (error) {
      console.error('加载导出集合选择器出错:', error);
    }
  }
}); 