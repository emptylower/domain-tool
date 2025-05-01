/**
 * 域名识别与管理工具 - 内容页面UI脚本
 * 
 * 注意：此脚本主要负责UI视觉效果和交互优化，
 * 核心功能在domainScanner.js中实现
 */

// 确保脚本只初始化一次
// 使用全局变量防止重复声明
if (typeof self.domainToolUiInitialized === 'undefined') {
  self.domainToolUiInitialized = false;
}

// 延迟加载检查机制，确保DOM和工具函数已准备好
function initializeIfReady() {
  if (self.domainToolUiInitialized) return;
  
  try {
    // 检查当前是否是扩展的选项页面，如果是则不执行内容脚本
    if (window.location.href.startsWith(chrome.runtime.getURL(''))) {
      console.log('在扩展页面中，不执行内容脚本');
      return;
    }
    
    // 检查DOM是否已经可用
    if (document.readyState !== 'loading') {
      initializeContentUI();
    } else {
      // DOM尚未准备好，等待DOMContentLoaded事件
      document.addEventListener('DOMContentLoaded', initializeContentUI);
    }
  } catch (error) {
    console.error('初始化内容UI时出错:', error);
  }
}

// 初始化内容UI
function initializeContentUI() {
  try {
    if (self.domainToolUiInitialized) return;
    self.domainToolUiInitialized = true;
    
    console.log('内容UI初始化开始');

    // 将CSS样式动态注入页面
    injectStyles();
    
    // 添加面板拖动过渡效果
    document.addEventListener('mouseup', function(e) {
      try {
        const panel = document.getElementById('domainToolPanel');
        if (panel) {
          panel.classList.remove('dragging');
        }
      } catch (err) {
        console.error('处理mouseup事件出错:', err);
      }
    });
    
    // 确保此脚本也暴露接口到window.domainToolExports
    if (!window.domainToolExports) {
      window.domainToolExports = {};
    }
    
    // 添加或修改togglePanelVisibility函数
    window.domainToolExports.togglePanelVisibility = function(forceShow) {
      // 如果domainScanner.js已经定义了此函数，则使用它的实现
      if (window.domainToolExports.togglePanelVisibility && 
          window.domainToolExports.togglePanelVisibility !== this.togglePanelVisibility) {
        return window.domainToolExports.togglePanelVisibility(forceShow);
      }
      
      // 否则使用简化版实现
      const panel = document.getElementById('domainToolPanel');
      if (panel) {
        if (forceShow === true) {
          panel.style.display = 'block';
          return true;
        } else if (forceShow === false) {
          panel.style.display = 'none';
          return false;
        } else {
          // 切换显示状态
          panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
          return panel.style.display === 'block';
        }
      }
      return false;
    };
    
    // 添加面板悬停效果
    document.addEventListener('mouseover', function(e) {
      try {
        const panel = document.getElementById('domainToolPanel');
        if (panel && panel.contains(e.target)) {
          panel.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
        }
      } catch (error) {
        console.error('处理面板悬停效果时出错:', error);
      }
    });
    
    document.addEventListener('mouseout', function(e) {
      try {
        const panel = document.getElementById('domainToolPanel');
        if (panel && !panel.contains(e.target)) {
          panel.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
        }
      } catch (error) {
        console.error('处理面板移出效果时出错:', error);
      }
    });
    
    // 为域名项添加点击事件（整行选择效果）
    document.addEventListener('click', function(e) {
      try {
        // 检查点击的是否是域名项
        const item = e.target.closest('.domain-tool-item');
        if (item && !e.target.classList.contains('domain-tool-checkbox') && 
            !e.target.classList.contains('domain-tool-save-single-btn')) {
          // 找到对应的复选框并切换选中状态
          const checkbox = item.querySelector('.domain-tool-checkbox');
          if (checkbox) {
            checkbox.checked = !checkbox.checked;
            
            // 触发change事件，以便其他可能的监听器能够感知到变化
            const event = new Event('change', { bubbles: true });
            checkbox.dispatchEvent(event);
          }
        }
      } catch (error) {
        console.error('处理域名项点击事件时出错:', error);
      }
    });
    
    console.log('内容UI初始化完成');
    
    // 通知后台脚本，内容脚本已加载
    try {
      chrome.runtime.sendMessage({ action: 'contentScriptLoaded', script: 'contentUI.js' }, 
        function(response) {
          if (chrome.runtime.lastError) {
            // 忽略错误，不抛出异常，仅记录日志
            console.warn('通知后台脚本时出错:', chrome.runtime.lastError.message);
            return; // 确保返回，不执行后续代码
          }
          console.log('后台脚本已收到内容脚本加载通知:', response);
        }
      );
    } catch (error) {
      console.error('发送内容脚本加载消息时出错:', error);
    }
  } catch (error) {
    console.error('内容UI初始化失败:', error);
  }
}

/**
 * 动态注入自定义CSS样式
 * 扩展已有contentUI.css的样式
 */
function injectStyles() {
  try {
    // 为面板添加动画效果
    const style = document.createElement('style');
    style.textContent = `
      /* 面板出现动画 */
      #domainToolPanel {
        animation: domainToolFadeIn 0.3s ease;
        background-color: white; /* 确保有背景色 */
        border: 1px solid #ddd; /* 确保有边框 */
      }
      
      @keyframes domainToolFadeIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      /* 按钮悬停效果 */
      .domain-tool-save-button {
        cursor: pointer;
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        background-color: #4285f4;
        color: white;
        transition: all 0.2s ease;
      }
      
      .domain-tool-save-button:hover {
        background-color: #3367d6;
        transform: translateY(-1px);
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      }
      
      .domain-tool-save-button:active {
        transform: translateY(0);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      }
      
      /* 域名项悬停效果 */
      .domain-tool-item {
        transition: background-color 0.2s ease;
        padding: 8px;
        border-bottom: 1px solid #eee;
        display: flex;
        align-items: center;
      }
      
      .domain-tool-item:hover {
        background-color: #f5f5f5;
      }
      
      /* 页码按钮过渡效果 */
      .domain-tool-page-button {
        transition: all 0.2s ease;
        margin: 0 2px;
        padding: 5px 8px;
        background-color: #f0f0f0;
        border: 1px solid #ddd;
        border-radius: 3px;
        cursor: pointer;
      }
      
      .domain-tool-page-button:hover {
        background-color: #e0e0e0;
      }
      
      .domain-tool-page-button.active {
        background-color: #4285f4;
        color: white;
        border-color: #4285f4;
      }
      
      /* 提升复选框可用性 */
      .domain-tool-checkbox {
        cursor: pointer;
        width: 16px;
        height: 16px;
      }
      
      /* 提升标签可点击性 */
      .domain-tool-select-all label {
        cursor: pointer;
        user-select: none;
        margin-left: 5px;
      }
      
      /* 优化控制按钮 */
      .domain-tool-control-button {
        transition: all 0.2s ease;
        background: none;
        border: none;
        font-size: 16px;
        cursor: pointer;
        padding: 0 5px;
      }
      
      .domain-tool-control-button:hover {
        transform: scale(1.1);
      }
      
      /* 单独保存按钮样式 */
      .domain-tool-save-single-btn {
        margin-left: 5px;
        padding: 2px 5px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
        transition: background-color 0.2s ease;
      }
      
      .domain-tool-save-single-btn:hover {
        background-color: #368c39;
      }
      
      /* 一键保存全部按钮 */
      .domain-tool-save-all-btn {
        background-color: #FF9800;
        margin-left: 10px;
      }
      
      /* 通知样式 */
      .domain-tool-notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 10px 20px;
        border-radius: 4px;
        color: white;
        opacity: 0;
        transition: opacity 0.3s;
        z-index: 10000;
        max-width: 300px;
      }
      
      .domain-tool-notification.success {
        background-color: #4CAF50;
      }
      
      .domain-tool-notification.error {
        background-color: #f44336;
      }
      
      .domain-tool-notification.warning {
        background-color: #ff9800;
      }
      
      .domain-tool-notification.show {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
    console.log('样式注入成功');
  } catch (error) {
    console.error('注入样式时出错:', error);
  }
}

// 添加消息监听器，以便响应background.js的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  try {
    if (request.action === 'ping') {
      // 用于检测contentUI.js是否已加载
      console.log('contentUI.js: 接收到ping请求');
      // 立即发送响应，不要等待异步操作
      sendResponse({ status: 'ok', script: 'contentUI.js' });
      return true; // 保持channel打开，但不依赖于异步响应
    }
    
    // 如果是请求扫描页面中的域名
    if (request.action === 'scanPage') {
      console.log('contentUI.js: 接收到扫描页面请求');
      
      // 检查是否有scanPageForDomains函数可用
      if (window.domainToolExports && window.domainToolExports.scanPageForDomains) {
        try {
          const domains = window.domainToolExports.scanPageForDomains();
          // 立即响应，避免异步操作导致端口关闭
          sendResponse({ 
            success: true, 
            domains: domains,
            count: Object.keys(domains).length
          });
        } catch (error) {
          console.error('扫描页面出错:', error);
          sendResponse({ 
            success: false, 
            error: error.message || '扫描页面时发生错误'
          });
        }
      } else {
        console.warn('未找到scanPageForDomains函数');
        sendResponse({ 
          success: false, 
          error: 'domainScanner脚本未正确加载'
        });
      }
      
      return false; // 已立即发送响应，不需要保持通道开放
    }
    
    // 如果是请求显示面板
    if (request.action === 'togglePanel') {
      console.log('contentUI.js: 接收到切换面板请求');
      
      if (window.domainToolExports && window.domainToolExports.togglePanelVisibility) {
        try {
          window.domainToolExports.togglePanelVisibility();
          // 立即响应
          sendResponse({ success: true });
        } catch (error) {
          console.error('切换面板时出错:', error);
          sendResponse({ success: false, error: error.message || '切换面板时发生错误' });
        }
      } else {
        console.warn('未找到togglePanelVisibility函数');
        sendResponse({ success: false, error: 'domainScanner脚本未正确加载' });
      }
      
      return false; // 已立即发送响应，不需要保持通道开放
    }
    
    // 为所有其他未处理的消息提供默认响应
    sendResponse({ success: false, error: '未知或不支持的操作' });
    return false;
  } catch (error) {
    console.error('处理消息时出错:', error);
    sendResponse({ success: false, error: error.message || '未知错误' });
    return false;
  }
});

// 立即开始初始化检查
initializeIfReady(); 