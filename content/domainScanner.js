/**
 * 域名识别与管理工具 - 域名扫描脚本
 */

// 添加初始化标志，防止重复初始化
// 使用全局变量防止重复声明
if (typeof self.domainScannerInitialized === 'undefined') {
  self.domainScannerInitialized = false;
}

// 确保脚本只初始化一次
function ensureInitialized() {
  if (self.domainScannerInitialized) return true;
  
  try {
    console.log('开始初始化domainScanner.js');
    
    // 从全局对象获取工具函数
    // 注意：domainUtils.js和storageUtils.js需要先将这些函数挂载到window对象
    if (!window.domainToolUtils) {
      console.warn('domainToolUtils未加载，无法正常初始化');
      
      // 通知后台脚本domainToolUtils未加载
      try {
        chrome.runtime.sendMessage({ 
          action: 'toolsNotLoaded',
          tool: 'domainToolUtils'
        }, function(response) {
          // 忽略错误，仅记录
          if (chrome.runtime.lastError) {
            console.warn('向后台发送工具未加载通知时出错:', chrome.runtime.lastError.message);
            return;
          }
        });
      } catch (error) {
        console.error('向后台发送工具未加载通知时出错:', error);
      }
      
      return false;
    }
    
    // 保存扫描到的域名
    window.scannedDomains = {};
    // 面板可见性状态
    window.isPanelVisible = false;
    // DOM变化监听器
    window.mutationObserver = null;
    // 扫描节流计时器
    window.scanThrottleTimer = null;
    
    // 导出函数供其他脚本使用
    window.domainToolExports = {
      scanPageForDomains,
      togglePanelVisibility
    };
    
    // 初始化扫描和监听
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      initialize();
    } else {
      document.addEventListener('DOMContentLoaded', initialize);
    }
    
    // 添加消息监听器，响应后台脚本
    setupMessageListeners();
    
    self.domainScannerInitialized = true;
    console.log('domainScanner.js初始化完成');
    
    // 通知后台脚本初始化完成
    try {
      chrome.runtime.sendMessage({ 
        action: 'contentScriptLoaded', 
        script: 'domainScanner.js' 
      }, function(response) {
        if (chrome.runtime.lastError) {
          // 只记录警告消息，不抛出错误
          console.warn('通知后台脚本初始化完成时出错:', chrome.runtime.lastError.message);
          return; // 确保函数正确返回
        }
        console.log('后台脚本已收到domainScanner.js初始化完成通知:', response);
      });
    } catch (error) {
      console.error('发送初始化完成通知时出错:', error);
    }
    
    return true;
  } catch (error) {
    console.error('domainScanner.js初始化时出错:', error);
    return false;
  }
}

// 设置消息监听器
function setupMessageListeners() {
  try {
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      console.log('domainScanner.js: 收到消息:', request.action);
      
      try {
        // 响应ping请求，确认脚本已加载
        if (request.action === 'ping') {
          console.log('domainScanner.js: 收到ping请求');
          // 立即响应，避免异步问题
          sendResponse({ status: 'ok', script: 'domainScanner.js' });
          return false; // 表示同步响应
        }
        
        // 响应扫描请求
        if (request.action === 'scan') {
          console.log('domainScanner.js: 收到扫描请求');
          // 同步执行扫描
          const domains = scanPageForDomains();
          // 立即响应
          sendResponse({ 
            success: true, 
            domains: domains,
            count: Object.keys(domains).length
          });
          return false; // 表示同步响应
        }
        
        // 响应显示面板请求
        if (request.action === 'showPanel') {
          console.log('domainScanner.js: 收到显示面板请求');
          // 同步执行显示面板
          togglePanelVisibility(true);
          // 立即响应
          sendResponse({ success: true });
          return false; // 表示同步响应
        }
        
        // 响应隐藏面板请求
        if (request.action === 'hidePanel') {
          console.log('domainScanner.js: 收到隐藏面板请求');
          // 同步执行隐藏面板
          togglePanelVisibility(false);
          // 立即响应
          sendResponse({ success: true });
          return false; // 表示同步响应
        }
        
        // 提供默认响应，避免消息端口悬空
        sendResponse({ success: false, error: '未知或不支持的操作' });
        return false;
      } catch (error) {
        console.error('处理消息时出错:', error);
        // 确保发送错误响应
        sendResponse({ 
          success: false, 
          error: error.message || '未知错误' 
        });
        return false; // 表示同步响应
      }
    });
    
    console.log('domainScanner.js: 消息监听器已设置');
  } catch (error) {
    console.error('设置消息监听器时出错:', error);
  }
}

// 保存扫描到的域名到全局对象
if (typeof self.domainToolState === 'undefined') {
  self.domainToolState = {
    scannedDomains: {},
    isPanelVisible: false,
    mutationObserver: null,
    scanThrottleTimer: null
  };
}

/**
 * 扫描页面中的所有链接并提取域名
 * @returns {Object} - 包含唯一域名的对象，键为域名，值为出现次数
 */
function scanPageForDomains() {
  try {
    // 确保domainToolUtils已加载
    if (!window.domainToolUtils || !window.domainToolUtils.extractDomain) {
      console.warn('domainToolUtils未加载或不完整，无法扫描页面');
      return {};
    }
    
    const { extractDomain, normalizeDomain } = window.domainToolUtils;
    
    // 获取页面上所有链接
    const links = document.querySelectorAll('a[href]');
    const domains = {};
    const currentPageDomain = extractDomain(window.location.href);
    
    // 遍历链接提取域名
    links.forEach(link => {
      try {
        const href = link.href;
        if (!href) return;
        
        // 排除javascript:和mailto:等特殊链接
        if (href.startsWith('javascript:') || 
            href.startsWith('mailto:') || 
            href.startsWith('tel:') || 
            href.startsWith('#')) {
          return;
        }
        
        const domain = extractDomain(href);
        if (domain && domain !== currentPageDomain) {
          // 归一化域名并计数
          const normalizedDomain = normalizeDomain(domain);
          domains[normalizedDomain] = (domains[normalizedDomain] || 0) + 1;
        }
      } catch (err) {
        console.debug('处理链接出错:', err);
      }
    });
    
    // 更新全局变量
    window.scannedDomains = domains;
    
    return domains;
  } catch (error) {
    console.error('扫描页面域名出错:', error);
    return {};
  }
}

/**
 * 获取排序后的域名数组
 * @returns {Array} - 按计数排序的域名数组，每个元素为{domain, count}
 */
function getSortedDomains() {
  try {
    if (!window.domainToolUtils || !window.domainToolUtils.compareDomains) {
      return Object.entries(window.scannedDomains)
        .map(([domain, count]) => ({ domain, count }))
        .sort((a, b) => b.count - a.count);
    }
    
    return Object.entries(window.scannedDomains)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => {
        // 首先按计数降序排序
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        // 计数相同时按域名排序
        return window.domainToolUtils.compareDomains(a.domain, b.domain);
      });
  } catch (error) {
    console.error('排序域名时出错:', error);
    // 提供一个基本的回退排序
    return Object.entries(window.scannedDomains)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count);
  }
}

/**
 * 切换面板可见性
 * @param {boolean} [forceShow] - 如果提供，强制设置面板可见性状态
 */
function togglePanelVisibility(forceShow) {
  try {
    // 如果提供了强制显示参数，则使用该参数
    if (typeof forceShow === 'boolean') {
      window.isPanelVisible = forceShow;
    } else {
      // 否则切换当前状态
      window.isPanelVisible = !window.isPanelVisible;
    }
    
    // 检查面板是否存在
    let panel = document.getElementById('domainToolPanel');
    
    if (window.isPanelVisible) {
      // 如果面板不存在则创建
      if (!panel) {
        panel = createDomainPanel();
      }
      
      // 确保面板可见
      panel.style.display = 'block';
      
      // 重新扫描页面并更新面板
      scanPageForDomains();
      updateDomainPanel();
      
      // 开始观察DOM变化
      observeDOMChanges();
    } else if (panel) {
      // 隐藏面板
      panel.style.display = 'none';
      
      // 停止观察DOM变化
      if (window.mutationObserver) {
        window.mutationObserver.disconnect();
      }
    }
  } catch (error) {
    console.error('切换面板可见性时出错:', error);
  }
}

/**
 * 初始化功能
 */
function initialize() {
  try {
    console.log('开始初始化域名扫描功能');
    
    // 确保工具函数可用
    if (!ensureToolsAvailable()) {
      console.error('工具函数未加载，无法初始化域名扫描功能');
      return;
    }
    
    // 初始扫描
    scanPageForDomains();
    
    // 检查是否自动扫描
    chrome.storage.local.get({scanAutoStart: false}, function(items) {
      if (items.scanAutoStart) {
        // 如果启用了自动扫描，则显示面板
        togglePanelVisibility(true);
      }
    });
    
    console.log('域名扫描功能初始化完成');
  } catch (error) {
    console.error('初始化域名扫描功能时出错:', error);
  }
}

/**
 * 确保必要的工具函数可用
 */
function ensureToolsAvailable() {
  if (!window.domainToolUtils || !window.storageUtils) {
    console.warn('工具函数未加载，尝试通知后台脚本...');
    
    // 如果工具函数未加载，通知后台脚本
    try {
      chrome.runtime.sendMessage({ action: 'toolsNotLoaded' }, response => {
        if (chrome.runtime.lastError) {
          console.error('发送消息失败:', chrome.runtime.lastError);
          return;
        }
        
        console.log('通知后台脚本工具未加载:', response);
      });
    } catch (error) {
      console.error('发送消息出错:', error);
    }
    
    return false;
  }
  return true;
}

// 立即尝试初始化
ensureInitialized();

// 监听DOM加载完成事件，确保页面完全加载后重新尝试初始化
if (document.readyState !== 'complete') {
  document.addEventListener('DOMContentLoaded', ensureInitialized);
  window.addEventListener('load', ensureInitialized);
}

/**
 * 节流函数用于控制扫描频率
 * @param {Function} callback - 回调函数
 * @param {number} delay - 延迟时间（毫秒）
 */
function throttle(callback, delay = 1000) {
  if (window.scanThrottleTimer) {
    return;
  }
  
  window.scanThrottleTimer = setTimeout(() => {
    callback();
    window.scanThrottleTimer = null;
  }, delay);
}

/**
 * 监听DOM变化
 */
function observeDOMChanges() {
  // 如果已有监听器，先断开
  if (window.mutationObserver) {
    window.mutationObserver.disconnect();
  }
  
  // 创建新的监听器
  window.mutationObserver = new MutationObserver((mutations) => {
    let hasRelevantChanges = false;
    
    // 只有当有新链接添加时才重新扫描
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeName === 'A' || (node.nodeType === 1 && node.querySelector('a'))) {
            hasRelevantChanges = true;
            break;
          }
        }
      }
      
      if (hasRelevantChanges) break;
    }
    
    if (hasRelevantChanges) {
      // 使用节流函数限制扫描频率
      throttle(() => {
        scanPageForDomains();
        
        // 如果面板可见，更新面板内容
        if (window.isPanelVisible) {
          updateDomainPanel();
        }
      });
    }
  });
  
  // 开始监听整个文档的变化
  window.mutationObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

/**
 * 创建域名面板
 * @returns {HTMLElement} - 创建的面板元素
 */
function createDomainPanel() {
  const panel = document.createElement('div');
  panel.className = 'domain-tool-panel';
  panel.id = 'domainToolPanel';
  
  // 如果面板已经存在，删除它
  const existingPanel = document.getElementById('domainToolPanel');
  if (existingPanel) {
    existingPanel.remove();
  }
  
  // 构建面板HTML
  panel.innerHTML = `
    <div class="domain-tool-header">
      <div class="domain-tool-title">发现的域名</div>
      <div class="domain-tool-controls">
        <button class="domain-tool-control-button" id="domainToolMinimize">-</button>
        <button class="domain-tool-control-button" id="domainToolClose">×</button>
      </div>
    </div>
    <div class="domain-tool-content">
      <ul class="domain-tool-list" id="domainToolList"></ul>
      <div class="domain-tool-pagination" id="domainToolPagination"></div>
    </div>
    <div class="domain-tool-footer" style="display:flex; justify-content:space-between; padding:10px; border-top:1px solid #eee;">
      <div class="domain-tool-select-all">
        <input type="checkbox" id="domainToolSelectAll" class="domain-tool-checkbox">
        <label for="domainToolSelectAll">全选</label>
      </div>
      <div class="domain-tool-buttons">
        <button class="domain-tool-save-button" id="domainToolSave" style="background-color:#4285f4; color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;">保存选中</button>
        <button class="domain-tool-save-button domain-tool-save-all-btn" id="domainToolSaveAll" style="background-color:#FF9800; color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer; margin-left:5px;">一键保存全部</button>
      </div>
    </div>
  `;
  
  // 添加到文档
  document.body.appendChild(panel);
  
  // 添加事件监听器
  const minimizeBtn = panel.querySelector('#domainToolMinimize');
  const closeBtn = panel.querySelector('#domainToolClose');
  const selectAllCheckbox = panel.querySelector('#domainToolSelectAll');
  const saveButton = panel.querySelector('#domainToolSave');
  const saveAllButton = panel.querySelector('#domainToolSaveAll');
  
  minimizeBtn.addEventListener('click', togglePanelMinimize);
  closeBtn.addEventListener('click', togglePanelVisibility);
  selectAllCheckbox.addEventListener('click', toggleSelectAll);
  saveButton.addEventListener('click', saveSelectedDomains);
  saveAllButton.addEventListener('click', saveAllDomains);
  
  // 使面板可拖动
  makePanelDraggable(panel);
  
  return panel;
}

/**
 * 使面板可拖动
 * @param {HTMLElement} panel - 面板元素
 */
function makePanelDraggable(panel) {
  const header = panel.querySelector('.domain-tool-header');
  let isDragging = false;
  let offsetX, offsetY;
  
  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - panel.getBoundingClientRect().left;
    offsetY = e.clientY - panel.getBoundingClientRect().top;
    
    panel.style.cursor = 'grabbing';
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    
    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
    panel.style.right = 'auto';
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
    panel.style.cursor = '';
  });
}

/**
 * 更新域名面板内容
 * @param {number} page - 当前页码，从1开始
 */
function updateDomainPanel(page = 1) {
  const panel = document.getElementById('domainToolPanel');
  if (!panel) return;
  
  // 获取设置
  chrome.storage.local.get({ itemsPerPage: 20 }, (items) => {
    const itemsPerPage = items.itemsPerPage;
    const domainList = panel.querySelector('#domainToolList');
    const pagination = panel.querySelector('#domainToolPagination');
    const sortedDomains = getSortedDomains();
    
    // 清空域名列表
    domainList.innerHTML = '';
    
    // 如果没有域名，显示提示信息
    if (sortedDomains.length === 0) {
      const emptyItem = document.createElement('li');
      emptyItem.textContent = '没有找到外部域名';
      emptyItem.style.padding = '10px 0';
      domainList.appendChild(emptyItem);
      return;
    }
    
    // 计算总页数
    const totalPages = Math.ceil(sortedDomains.length / itemsPerPage);
    // 确保页码在有效范围内
    page = Math.max(1, Math.min(page, totalPages));
    
    // 获取当前页的域名
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, sortedDomains.length);
    const currentPageDomains = sortedDomains.slice(startIndex, endIndex);
    
    // 创建域名列表项
    currentPageDomains.forEach(({ domain, count }) => {
      const item = document.createElement('li');
      item.className = 'domain-tool-item';
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.padding = '8px';
      item.style.borderBottom = '1px solid #eee';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'domain-tool-checkbox';
      checkbox.dataset.domain = domain;
      
      const domainText = document.createElement('div');
      domainText.className = 'domain-tool-domain';
      domainText.textContent = domain;
      domainText.style.flexGrow = '1';
      domainText.style.marginLeft = '8px';
      
      const countBadge = document.createElement('span');
      countBadge.className = 'domain-tool-count';
      countBadge.textContent = count;
      countBadge.style.backgroundColor = '#f0f0f0';
      countBadge.style.padding = '2px 6px';
      countBadge.style.borderRadius = '10px';
      countBadge.style.fontSize = '12px';
      
      // 添加单独保存按钮
      const saveButton = document.createElement('button');
      saveButton.className = 'domain-tool-save-single-btn';
      saveButton.textContent = '保存';
      saveButton.style.marginLeft = '8px';
      saveButton.style.backgroundColor = '#4CAF50';
      saveButton.style.color = 'white';
      saveButton.style.border = 'none';
      saveButton.style.borderRadius = '3px';
      saveButton.style.padding = '2px 8px';
      saveButton.style.cursor = 'pointer';
      saveButton.addEventListener('click', (e) => {
        e.stopPropagation(); // 阻止事件冒泡，避免触发选择行
        saveSingleDomain(domain);
      });
      
      item.appendChild(checkbox);
      item.appendChild(domainText);
      item.appendChild(countBadge);
      item.appendChild(saveButton);
      
      domainList.appendChild(item);
    });
    
    // 更新分页控件
    pagination.innerHTML = '';
    
    if (totalPages > 1) {
      // 首页按钮
      if (page > 1) {
        const firstPageBtn = document.createElement('button');
        firstPageBtn.className = 'domain-tool-page-button';
        firstPageBtn.textContent = '<<';
        firstPageBtn.addEventListener('click', () => updateDomainPanel(1));
        pagination.appendChild(firstPageBtn);
      }
      
      // 上一页按钮
      if (page > 1) {
        const prevPageBtn = document.createElement('button');
        prevPageBtn.className = 'domain-tool-page-button';
        prevPageBtn.textContent = '<';
        prevPageBtn.addEventListener('click', () => updateDomainPanel(page - 1));
        pagination.appendChild(prevPageBtn);
      }
      
      // 页码按钮
      for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = 'domain-tool-page-button';
        if (i === page) pageBtn.classList.add('active');
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => updateDomainPanel(i));
        pagination.appendChild(pageBtn);
      }
      
      // 下一页按钮
      if (page < totalPages) {
        const nextPageBtn = document.createElement('button');
        nextPageBtn.className = 'domain-tool-page-button';
        nextPageBtn.textContent = '>';
        nextPageBtn.addEventListener('click', () => updateDomainPanel(page + 1));
        pagination.appendChild(nextPageBtn);
      }
      
      // 末页按钮
      if (page < totalPages) {
        const lastPageBtn = document.createElement('button');
        lastPageBtn.className = 'domain-tool-page-button';
        lastPageBtn.textContent = '>>';
        lastPageBtn.addEventListener('click', () => updateDomainPanel(totalPages));
        pagination.appendChild(lastPageBtn);
      }
    }
  });
}

/**
 * 创建集合选择对话框
 * @param {Function} callback - 选择回调函数，传入选中的集合ID
 */
function createCollectionSelectDialog(callback, domains) {
  // 移除现有的对话框
  const existingDialog = document.getElementById('domainToolCollectionDialog');
  if (existingDialog) {
    existingDialog.remove();
  }
  
  // 创建对话框
  const dialog = document.createElement('div');
  dialog.id = 'domainToolCollectionDialog';
  dialog.className = 'domain-tool-dialog';
  dialog.style.position = 'fixed';
  dialog.style.left = '50%';
  dialog.style.top = '50%';
  dialog.style.transform = 'translate(-50%, -50%)';
  dialog.style.backgroundColor = 'white';
  dialog.style.padding = '20px';
  dialog.style.borderRadius = '8px';
  dialog.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
  dialog.style.zIndex = '10000';
  dialog.style.minWidth = '300px';
  dialog.style.maxWidth = '500px';
  
  // 创建遮罩层
  const overlay = document.createElement('div');
  overlay.className = 'domain-tool-overlay';
  overlay.style.position = 'fixed';
  overlay.style.left = '0';
  overlay.style.top = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  overlay.style.zIndex = '9999';
  
  // 对话框标题
  const title = document.createElement('h3');
  title.textContent = '选择保存分类';
  title.style.margin = '0 0 15px 0';
  
  // 创建集合列表
  const collectionList = document.createElement('div');
  collectionList.className = 'domain-tool-collection-list';
  collectionList.style.maxHeight = '300px';
  collectionList.style.overflowY = 'auto';
  collectionList.style.marginBottom = '15px';
  
  // 加载集合列表
  const loadingText = document.createElement('p');
  loadingText.textContent = '加载分类中...';
  collectionList.appendChild(loadingText);
  
  // 新建分类表单
  const newCollectionForm = document.createElement('div');
  newCollectionForm.className = 'domain-tool-new-collection-form';
  newCollectionForm.style.borderTop = '1px solid #eee';
  newCollectionForm.style.paddingTop = '15px';
  newCollectionForm.style.marginTop = '15px';
  
  const newCollectionLabel = document.createElement('div');
  newCollectionLabel.textContent = '新建分类:';
  newCollectionLabel.style.marginBottom = '5px';
  
  const newCollectionInput = document.createElement('input');
  newCollectionInput.type = 'text';
  newCollectionInput.placeholder = '输入新分类名称';
  newCollectionInput.style.width = '100%';
  newCollectionInput.style.padding = '8px';
  newCollectionInput.style.boxSizing = 'border-box';
  newCollectionInput.style.marginBottom = '10px';
  
  const createCollectionBtn = document.createElement('button');
  createCollectionBtn.textContent = '创建并选择';
  createCollectionBtn.style.backgroundColor = '#4285f4';
  createCollectionBtn.style.color = 'white';
  createCollectionBtn.style.border = 'none';
  createCollectionBtn.style.padding = '8px 12px';
  createCollectionBtn.style.borderRadius = '4px';
  createCollectionBtn.style.cursor = 'pointer';
  
  newCollectionForm.appendChild(newCollectionLabel);
  newCollectionForm.appendChild(newCollectionInput);
  newCollectionForm.appendChild(createCollectionBtn);
  
  // 对话框按钮
  const buttonRow = document.createElement('div');
  buttonRow.style.display = 'flex';
  buttonRow.style.justifyContent = 'flex-end';
  buttonRow.style.marginTop = '15px';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '取消';
  cancelBtn.style.padding = '8px 12px';
  cancelBtn.style.marginRight = '10px';
  cancelBtn.style.border = '1px solid #ddd';
  cancelBtn.style.borderRadius = '4px';
  cancelBtn.style.backgroundColor = '#f5f5f5';
  cancelBtn.style.cursor = 'pointer';
  
  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = '确定';
  confirmBtn.style.padding = '8px 12px';
  confirmBtn.style.backgroundColor = '#4285f4';
  confirmBtn.style.color = 'white';
  confirmBtn.style.border = 'none';
  confirmBtn.style.borderRadius = '4px';
  confirmBtn.style.cursor = 'pointer';
  confirmBtn.disabled = true;
  
  buttonRow.appendChild(cancelBtn);
  buttonRow.appendChild(confirmBtn);
  
  // 组装对话框
  dialog.appendChild(title);
  dialog.appendChild(collectionList);
  dialog.appendChild(newCollectionForm);
  dialog.appendChild(buttonRow);
  
  // 添加对话框和遮罩层到文档
  document.body.appendChild(overlay);
  document.body.appendChild(dialog);
  
  // 显示域名数量
  const domainsCount = Array.isArray(domains) ? domains.length : 1;
  const domainsInfo = document.createElement('p');
  domainsInfo.textContent = `准备保存 ${domainsCount} 个域名`;
  domainsInfo.style.margin = '5px 0 15px 0';
  domainsInfo.style.color = '#666';
  dialog.insertBefore(domainsInfo, collectionList);
  
  // 加载集合
  if (window.storageUtils) {
    window.storageUtils.getDomainCollections().then(collections => {
      collectionList.innerHTML = '';
      
      if (!collections || collections.length === 0) {
        const emptyText = document.createElement('p');
        emptyText.textContent = '没有可用的分类，请创建新分类';
        collectionList.appendChild(emptyText);
      } else {
        // 创建集合选择单选框
        collections.forEach(collection => {
          const collectionItem = document.createElement('div');
          collectionItem.className = 'domain-tool-collection-item';
          collectionItem.style.padding = '8px';
          collectionItem.style.cursor = 'pointer';
          collectionItem.style.borderBottom = '1px solid #eee';
          collectionItem.style.display = 'flex';
          collectionItem.style.alignItems = 'center';
          
          const radio = document.createElement('input');
          radio.type = 'radio';
          radio.name = 'collection';
          radio.value = collection.id;
          radio.id = `collection_${collection.id}`;
          radio.style.marginRight = '10px';
          
          const label = document.createElement('label');
          label.htmlFor = `collection_${collection.id}`;
          label.textContent = collection.name;
          label.style.flex = '1';
          label.style.cursor = 'pointer';
          
          // 默认选中第一个选项
          if (collection.id === 'default') {
            radio.checked = true;
            confirmBtn.disabled = false;
          }
          
          // 域名数量标签
          const countBadge = document.createElement('span');
          countBadge.textContent = collection.domains ? collection.domains.length : 0;
          countBadge.style.backgroundColor = '#f0f0f0';
          countBadge.style.padding = '2px 6px';
          countBadge.style.borderRadius = '10px';
          countBadge.style.fontSize = '12px';
          
          collectionItem.appendChild(radio);
          collectionItem.appendChild(label);
          collectionItem.appendChild(countBadge);
          
          collectionList.appendChild(collectionItem);
          
          // 点击整行选中单选框
          collectionItem.addEventListener('click', () => {
            radio.checked = true;
            confirmBtn.disabled = false;
          });
          
          // 单选框改变事件
          radio.addEventListener('change', () => {
            if (radio.checked) {
              confirmBtn.disabled = false;
            }
          });
        });
      }
    }).catch(error => {
      collectionList.innerHTML = '';
      const errorText = document.createElement('p');
      errorText.textContent = `加载分类出错: ${error.message}`;
      errorText.style.color = 'red';
      collectionList.appendChild(errorText);
    });
  } else {
    collectionList.innerHTML = '';
    const errorText = document.createElement('p');
    errorText.textContent = '存储模块未加载，无法获取分类';
    errorText.style.color = 'red';
    collectionList.appendChild(errorText);
  }
  
  // 事件监听器
  cancelBtn.addEventListener('click', () => {
    closeDialog();
  });
  
  overlay.addEventListener('click', () => {
    closeDialog();
  });
  
  confirmBtn.addEventListener('click', () => {
    const selectedRadio = dialog.querySelector('input[name="collection"]:checked');
    if (selectedRadio) {
      const collectionId = selectedRadio.value;
      closeDialog();
      callback(collectionId);
    } else {
      alert('请选择一个分类');
    }
  });
  
  createCollectionBtn.addEventListener('click', () => {
    const newCollectionName = newCollectionInput.value.trim();
    if (!newCollectionName) {
      alert('请输入分类名称');
      return;
    }
    
    if (window.storageUtils) {
      window.storageUtils.createCollection(newCollectionName).then(newCollection => {
        if (newCollection) {
          closeDialog();
          callback(newCollection.id);
        } else {
          alert('创建分类失败，请稍后重试');
        }
      }).catch(error => {
        alert(`创建分类出错: ${error.message}`);
      });
    } else {
      alert('存储模块未加载，无法创建分类');
    }
  });
  
  // 关闭对话框
  function closeDialog() {
    dialog.remove();
    overlay.remove();
  }
}

/**
 * 保存单个域名
 * @param {string} domain - 要保存的域名
 */
function saveSingleDomain(domain) {
  // 显示集合选择对话框
  createCollectionSelectDialog((collectionId) => {
    // 回调函数中使用选择的集合ID保存域名
    saveDomainToCollection(domain, collectionId);
  }, domain);
}

/**
 * 保存域名到指定集合
 * @param {string|string[]} domains - 域名或域名数组
 * @param {string} collectionId - 集合ID
 */
function saveDomainToCollection(domains, collectionId) {
  // 检查工具函数是否可用
  if (!window.storageUtils) {
    console.error('storageUtils未加载，无法保存域名');
    showNotification('无法保存域名：存储模块未加载', 'error');
    return;
  }
  
  // 使用storage模块保存域名
  window.storageUtils.saveDomains(domains, window.location.href, [], collectionId)
    .then(result => {
      if (result.success) {
        const count = Array.isArray(domains) ? domains.length : 1;
        const filteredCount = result.filtered.length;
        
        if (filteredCount > 0) {
          if (count === filteredCount) {
            // 所有域名都被过滤
            showNotification(`所有域名都在过滤清单中，未保存任何域名`, 'warning');
          } else {
            // 部分域名被过滤
            showNotification(`已成功保存 ${count - filteredCount} 个域名到指定分类 (${filteredCount} 个域名在过滤清单中)`, 'success');
          }
        } else {
          // 没有域名被过滤
          showNotification(`已成功保存 ${count} 个域名到指定分类`, 'success');
        }
      } else {
        showNotification('保存域名失败，请稍后重试', 'error');
      }
    })
    .catch(error => {
      console.error('保存域名出错:', error);
      showNotification(`保存域名出错: ${error.message || '未知错误'}`, 'error');
    });
}

/**
 * 保存全部域名
 */
function saveAllDomains() {
  const sortedDomains = getSortedDomains();
  const domains = sortedDomains.map(item => item.domain);
  
  if (domains.length === 0) {
    showNotification('没有找到外部域名', 'warning');
    return;
  }
  
  // 显示集合选择对话框
  createCollectionSelectDialog((collectionId) => {
    // 回调函数中使用选择的集合ID保存域名
    saveDomainToCollection(domains, collectionId);
  }, domains);
}

/**
 * 显示通知消息
 * @param {string} message - 要显示的消息
 * @param {string} type - 通知类型：'success', 'error', 'warning'
 */
function showNotification(message, type = 'success') {
  // 移除现有通知
  const existingNotifications = document.querySelectorAll('.domain-tool-notification');
  existingNotifications.forEach(note => note.remove());
  
  // 创建新通知
  const notification = document.createElement('div');
  notification.className = `domain-tool-notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // 显示通知
  setTimeout(() => {
    notification.classList.add('show');
    
    // 3秒后隐藏通知
    setTimeout(() => {
      notification.classList.remove('show');
      
      // 动画结束后移除DOM元素
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }, 10);
}

/**
 * 切换面板最小化状态
 */
function togglePanelMinimize() {
  const panel = document.getElementById('domainToolPanel');
  if (!panel) return;
  
  const content = panel.querySelector('.domain-tool-content');
  const footer = panel.querySelector('.domain-tool-footer');
  const minimizeBtn = panel.querySelector('#domainToolMinimize');
  
  if (content.style.display === 'none') {
    // 展开
    content.style.display = '';
    footer.style.display = '';
    minimizeBtn.textContent = '-';
  } else {
    // 最小化
    content.style.display = 'none';
    footer.style.display = 'none';
    minimizeBtn.textContent = '+';
  }
}

/**
 * 切换全选状态
 */
function toggleSelectAll() {
  const panel = document.getElementById('domainToolPanel');
  if (!panel) return;
  
  const selectAllCheckbox = panel.querySelector('#domainToolSelectAll');
  const checkboxes = panel.querySelectorAll('.domain-tool-checkbox');
  
  checkboxes.forEach(checkbox => {
    checkbox.checked = selectAllCheckbox.checked;
  });
}

/**
 * 保存选中的域名
 */
function saveSelectedDomains() {
  const panel = document.getElementById('domainToolPanel');
  if (!panel) return;
  
  const checkboxes = panel.querySelectorAll('.domain-tool-checkbox:checked');
  const selectedDomains = Array.from(checkboxes).map(checkbox => checkbox.dataset.domain);
  
  if (selectedDomains.length === 0) {
    showNotification('请先选择要保存的域名', 'warning');
    return;
  }
  
  // 显示集合选择对话框
  createCollectionSelectDialog((collectionId) => {
    // 回调函数中使用选择的集合ID保存域名
    saveDomainToCollection(selectedDomains, collectionId);
    
    // 取消所有选中状态
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
    panel.querySelector('#domainToolSelectAll').checked = false;
  }, selectedDomains);
}

/**
 * 导出函数到全局，供其他脚本直接调用
 */
function exportFunctions() {
  // 确保window对象存在
  if (typeof window === 'undefined') return;
  
  // 创建导出对象
  window.domainToolExports = {
    togglePanelVisibility: function(forceShow) {
      if (typeof toggleDomainPanel === 'function') {
        return toggleDomainPanel(forceShow);
      }
      return false;
    },
    scanDomains: function() {
      if (typeof scanAndShowDomains === 'function') {
        return scanAndShowDomains();
      }
      return null;
    }
  };
  
  console.log('已导出域名工具函数到全局对象');
}

// 在脚本初始化后执行导出
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', exportFunctions);
} else {
  exportFunctions();
} 