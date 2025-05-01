/**
 * 域名识别与管理工具 - 弹出窗口脚本
 */

document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const scanButton = document.getElementById('scanButton');
  const togglePanelButton = document.getElementById('togglePanelButton');
  const domainCountElement = document.querySelector('#domainCount strong');
  const optionsLink = document.getElementById('optionsLink');
  const savedDomainsLink = document.getElementById('savedDomainsLink');
  const helpLink = document.getElementById('helpLink');
  
  // 获取当前标签页信息
  async function getCurrentTab() {
    try {
      const queryOptions = { active: true, currentWindow: true };
      const [tab] = await chrome.tabs.query(queryOptions);
      return tab;
    } catch (error) {
      console.error('获取当前标签页失败:', error);
      throw error;
    }
  }
  
  // 检查URL是否是扩展自身的页面
  function isExtensionPage(url) {
    return url.startsWith('chrome-extension://') || 
           url.startsWith('chrome://') || 
           url.startsWith('edge://') || 
           url.startsWith('moz-extension://') ||
           url.startsWith('about:');
  }
  
  // 检查URL是否可以执行脚本
  function canExecuteScriptOnUrl(url) {
    try {
      // 检查URL是否为空
      if (!url) return false;
      
      // 解析URL
      const urlObj = new URL(url);
      
      // 检查协议
      const protocol = urlObj.protocol.toLowerCase();
      
      // 不能在这些协议上执行脚本
      const restrictedProtocols = [
        'chrome:', 'chrome-extension:', 'edge:', 
        'about:', 'data:', 'file:', 'moz-extension:'
      ];
      
      return !restrictedProtocols.some(p => protocol.startsWith(p));
    } catch (e) {
      console.error('URL检查错误:', e);
      return false;
    }
  }
  
  // 显示状态信息
  function showStatus(message, isTemporary = false) {
    domainCountElement.textContent = message;
    
    if (isTemporary) {
      setTimeout(() => {
        domainCountElement.textContent = '0';
      }, 3000);
    }
  }
  
  // 扫描当前页面域名
  async function scanPageDomains() {
    try {
      const tab = await getCurrentTab();
      
      if (!tab || !tab.id) {
        console.error('无法获取有效的标签页');
        showStatus('无效标签页', true);
        return;
      }
      
      // 检查是否是扩展页面或其他无法执行脚本的页面
      if (!canExecuteScriptOnUrl(tab.url)) {
        console.log('当前页面不支持扫描:', tab.url);
        showStatus('不支持扫描');
        
        // 禁用切换面板按钮
        togglePanelButton.disabled = true;
        return;
      }
      
      // 显示正在扫描的提示
      showStatus('扫描中...');
      
      // 直接在页面上执行扫描脚本，而非依赖消息传递
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          // 页面内直接扫描域名的函数
          function scanDomains() {
            // 获取所有链接
            const links = document.querySelectorAll('a[href]');
            const domainsMap = {};
            const currentPageUrl = window.location.href;
            
            // 提取域名的增强函数
            function extractDomain(url) {
              try {
                if (!url) return null;
                
                // 确保URL有协议前缀
                if (!url.match(/^https?:\/\//i) && !url.match(/^\/\//)) {
                  // 相对路径处理
                  if (url.startsWith('/')) {
                    const currentUrlObj = new URL(currentPageUrl);
                    url = `${currentUrlObj.protocol}//${currentUrlObj.host}${url}`;
                  } else {
                    url = `http://${url}`;
                  }
                } else if (url.startsWith('//')) {
                  url = `http:${url}`;
                }
                
                const urlObj = new URL(url);
                let domain = urlObj.hostname;
                
                // 规范化域名 (去除www.)
                domain = domain.replace(/^www\./i, '');
                
                return domain;
              } catch (e) {
                console.debug('提取域名出错:', e, url);
                return null;
              }
            }
            
            const currentDomain = extractDomain(currentPageUrl);
            if (!currentDomain) return { count: 0, domains: [] };
            
            // 处理所有链接
            links.forEach(link => {
              try {
                const href = link.href;
                
                // 排除特殊链接
                if (!href || 
                    href.startsWith('javascript:') || 
                    href.startsWith('mailto:') || 
                    href.startsWith('tel:') ||
                    href.startsWith('#')) {
                  return;
                }
                
                const domain = extractDomain(href);
                if (domain && domain !== currentDomain) {
                  // 计数
                  domainsMap[domain] = (domainsMap[domain] || 0) + 1;
                }
              } catch (err) {}
            });
            
            // 转换为数组并排序
            const domainsList = Object.entries(domainsMap)
              .map(([domain, count]) => ({ domain, count }))
              .sort((a, b) => b.count - a.count);
            
            return { 
              count: Object.keys(domainsMap).length,
              domains: domainsList.slice(0, 50) // 限制为前50个域名
            };
          }
          
          // 开始扫描
          try {
            return scanDomains();
          } catch (err) {
            console.error('域名扫描错误:', err);
            return { count: 0, domains: [] };
          }
        }
      });
      
      // 处理扫描结果
      if (results && results[0] && results[0].result) {
        const { count, domains } = results[0].result;
        showStatus(count.toString());
        
        // 存储扫描结果用于显示
        chrome.storage.local.set({ 
          lastScan: {
            timestamp: Date.now(),
            url: tab.url,
            count: count,
            domains: domains
          }
        });
        
        // 如果找到域名，启用面板按钮
        togglePanelButton.disabled = count === 0;
      } else {
        showStatus('0');
        togglePanelButton.disabled = true;
      }
    } catch (error) {
      console.error('扫描域名出错:', error);
      
      // 显示更友好的错误信息
      if (error.toString().includes('Cannot access contents of url')) {
        showStatus('无权访问', true);
      } else {
        showStatus('扫描失败', true);
      }
      
      // 禁用面板按钮
      togglePanelButton.disabled = true;
    }
  }
  
  // 显示简化版面板
  async function showSimplifiedPanel(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        function: () => {
          // 检查面板是否已存在
          let panel = document.getElementById('domainToolPanel');
          
          // 如果面板已存在，则移除它
          if (panel) {
            panel.remove();
            return { success: true, action: 'removed' };
          }
          
          // 创建新面板
          panel = document.createElement('div');
          panel.id = 'domainToolPanel';
          panel.style.position = 'fixed';
          panel.style.top = '20px';
          panel.style.right = '20px';
          panel.style.width = '300px';
          panel.style.maxHeight = '500px';
          panel.style.backgroundColor = 'white';
          panel.style.zIndex = '999999';
          panel.style.border = '1px solid #ccc';
          panel.style.borderRadius = '5px';
          panel.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
          panel.style.overflow = 'auto';
          
          // 简化版的面板内容
          panel.innerHTML = `
            <div style="padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
              <h3 style="margin: 0; font-size: 16px;">域名管理面板</h3>
              <button id="closePanel" style="border: none; background: none; cursor: pointer; font-size: 16px;">×</button>
            </div>
            <div style="padding: 15px;">
              <p>要使用完整的域名管理面板，请刷新页面后重试。</p>
              <p>刷新页面后，将自动加载完整的内容脚本，提供更丰富的功能。</p>
            </div>
          `;
          
          document.body.appendChild(panel);
          
          // 添加关闭按钮事件
          document.getElementById('closePanel').addEventListener('click', () => {
            panel.remove();
          });
          
          return { success: true, action: 'created' };
        }
      });
      
      // 显示通知提示用户刷新页面
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon48.png'), // 使用正确的图标路径
        title: '域名面板',
        message: '为了获得完整功能，请刷新页面后再试'
      });
      
      // 关闭弹出窗口
      window.close();
    } catch (error) {
      console.error('显示简化面板出错:', error);
    }
  }
  
  // 显示/隐藏域名面板
  async function toggleDomainPanel() {
    try {
      const tab = await getCurrentTab();
      
      if (!tab || !tab.id) {
        console.error('无法获取有效的标签页');
        return;
      }
      
      // 检查是否可以在当前页面执行脚本
      if (!canExecuteScriptOnUrl(tab.url)) {
        console.log('不能在此页面显示面板:', tab.url);
        
        // 使用通知而非脚本
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon48.png'), // 使用正确的图标路径
          title: '无法显示域名面板',
          message: '当前页面类型不支持显示域名面板'
        });
        return;
      }
      
      // 改进内容脚本检查和面板切换流程
      try {
        // 先注入必要的库文件，确保基础依赖存在
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['lib/domainUtils.js', 'lib/storageUtils.js']
        });
        
        // 再注入内容脚本
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/domainScanner.js', 'content/contentUI.js']
        });
        
        // 注入CSS
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['content/contentUI.css']
        });
        
        // 等待所有脚本加载完成
        setTimeout(async () => {
          try {
            // 发送切换面板消息，使用更稳健的方式
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              function: () => {
                // 直接调用窗口上的函数，避免消息传递失败
                if (window.domainToolExports && window.domainToolExports.togglePanelVisibility) {
                  window.domainToolExports.togglePanelVisibility(true);
                  return { success: true };
                } else {
                  return { success: false, error: "domainToolExports未找到" };
                }
              }
            });
            
            // 关闭弹出窗口
            window.close();
          } catch (innerError) {
            console.error('切换面板显示最终阶段出错:', innerError);
            showSimplifiedPanel(tab.id);
          }
        }, 300); // 给脚本加载一些时间
      } catch (scriptError) {
        console.warn('脚本注入或执行错误:', scriptError);
        showSimplifiedPanel(tab.id);
      }
    } catch (error) {
      console.error('切换面板显示出错:', error);
      
      // 使用通知显示错误
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon48.png'), // 使用正确的图标路径
        title: '域名面板',
        message: '显示域名面板时出错，请稍后重试'
      });
    }
  }
  
  // 事件监听器
  scanButton.addEventListener('click', scanPageDomains);
  togglePanelButton.addEventListener('click', toggleDomainPanel);
  
  // 打开选项页面
  optionsLink.addEventListener('click', function(e) {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
  
  // 打开已保存域名页面
  savedDomainsLink.addEventListener('click', function(e) {
    e.preventDefault();
    // 直接打开选项页面，不触发自动扫描
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html#domains') });
  });
  
  // 打开帮助页面
  helpLink.addEventListener('click', function(e) {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://github.com/yourusername/domain-tool/wiki' });
  });
  
  // 初始化，获取域名计数
  scanPageDomains();
}); 