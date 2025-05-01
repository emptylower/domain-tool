/**
 * 域名识别与管理工具 - 后台脚本
 */

// 加载工具库
try {
  importScripts('../lib/storageUtils.js', '../lib/domainUtils.js', '../lib/serpstatUtils.js');
  console.log('工具库脚本已加载');
  
  // 初始化API标记
  chrome.storage.local.get('serpstatApiToken', function(data) {
    if (data.serpstatApiToken && self.serpstatUtils) {
      console.log('从存储中加载Serpstat API标记');
      self.serpstatUtils.setApiToken(data.serpstatApiToken);
    }
  });
} catch (error) {
  console.error('加载工具库脚本失败:', error);
}

// 扩展安装或更新时的处理
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install') {
    // 首次安装
    initializeStorage();
    // 打开欢迎页面
    chrome.tabs.create({ url: 'options/options.html' });
  } else if (details.reason === 'update') {
    // 版本更新
    const currentVersion = chrome.runtime.getManifest().version;
    const previousVersion = details.previousVersion;
    console.log(`扩展已从 ${previousVersion} 更新到 ${currentVersion}`);
  }
});

// 添加标签页更新监听器，确保在页面加载完成后注入脚本
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 只处理http或https页面
  if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
    if (changeInfo.status === 'loading') {
      // 在页面开始加载时检查是否需要注入脚本
      setTimeout(() => {
        checkAndInjectScripts(tabId);
      }, 100);
    } else if (changeInfo.status === 'complete') {
      // 页面加载完成后再次检查内容脚本状态
      setTimeout(() => {
        ensureContentScriptLoaded(tabId);
      }, 500);
    }
  }
});

// 检查并注入内容脚本
function checkAndInjectScripts(tabId) {
  try {
    // 向页面发送ping消息，检查内容脚本是否已加载
    chrome.tabs.sendMessage(tabId, { action: 'ping' }, response => {
      // 如果发生错误但不是因为接收端不存在，记录错误
      if (chrome.runtime.lastError) {
        const errorMessage = chrome.runtime.lastError.message;
        // 如果是接收端不存在的错误，这是正常的，我们需要注入脚本
        if (errorMessage.includes("Receiving end does not exist") || 
            errorMessage.includes("Could not establish connection")) {
          injectContentScripts(tabId);
        } else {
          console.error(`发送消息出错: ${errorMessage}`);
        }
      } else if (response && response.status === 'ok') {
        console.log(`内容脚本已在标签页 ${tabId} 中加载`);
      } else {
        injectContentScripts(tabId);
      }
    });
  } catch (error) {
    console.error('检查内容脚本时出错:', error);
    injectContentScripts(tabId);
  }
}

// 确保内容脚本已加载
function ensureContentScriptLoaded(tabId) {
  try {
    chrome.tabs.sendMessage(tabId, { action: 'ping' }, response => {
      if (chrome.runtime.lastError || !response) {
        injectContentScripts(tabId);
      }
    });
  } catch (error) {
    console.error('确认内容脚本状态时出错:', error);
    injectContentScripts(tabId);
  }
}

// 注入内容脚本
function injectContentScripts(tabId) {
  console.log(`尝试向标签页 ${tabId} 注入内容脚本`);
  
  // 先注入库文件
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['lib/domainUtils.js', 'lib/storageUtils.js']
  }).then(() => {
    // 成功后注入内容脚本
    return chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content/domainScanner.js', 'content/contentUI.js']
    });
  }).then(() => {
    // 注入CSS
    return chrome.scripting.insertCSS({
      target: { tabId: tabId },
      files: ['content/contentUI.css']
    });
  }).then(() => {
    console.log(`内容脚本成功注入到标签页 ${tabId}`);
  }).catch(error => {
    console.error(`注入内容脚本到标签页 ${tabId} 失败:`, error);
    
    // 如果错误是因为无法访问页面，这是正常的(如Chrome设置页面)
    if (error.message && (
        error.message.includes("Cannot access") || 
        error.message.includes("host permission") ||
        error.message.includes("不能访问") ||
        error.message.includes("权限")
      )) {
      console.log(`标签页 ${tabId} 不允许注入脚本，这可能是正常的限制`);
    }
  });
}

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // 首先在控制台记录接收到的消息类型
  console.log('background.js: 收到消息:', request.action);

  try {
    // 处理工具未加载的消息
    if (request.action === 'toolsNotLoaded') {
      console.log('接收到工具未加载通知', request);
      // 同步响应，不涉及异步操作
      sendResponse({ status: 'acknowledged' });
      return false;
    }
    
    // 处理内容脚本加载消息
    if (request.action === 'contentScriptLoaded') {
      console.log(`内容脚本 ${request.script} 已加载`);
      // 同步响应，不涉及异步操作
      sendResponse({ status: 'acknowledged' });
      return false;
    }
    
    // 处理来自内容脚本的消息
    if (request.action === 'saveDomains') {
      // 确保storageUtils对象存在
      if (!self.storageUtils) {
        console.error('storageUtils未加载，无法保存域名');
        sendResponse({ success: false, error: 'storageUtils未加载' });
        return false;
      }
      
      // 开始异步操作前先发送初始响应
      sendResponse({ status: 'processing' });
      
      // 异步处理，但不再依赖sendResponse
      self.storageUtils.saveDomains(request.domains, request.source, [], request.collectionId)
        .then(result => {
          console.log('域名保存成功:', result);
          // 不再尝试通过sendResponse回传结果，这已经不可靠
          // 如果需要通知结果，可以通过chrome.tabs.sendMessage向原标签页发送消息
          
          if (sender.tab && sender.tab.id) {
            try {
              chrome.tabs.sendMessage(sender.tab.id, {
                action: 'saveDomainsResult',
                success: result.success,
                filtered: result.filtered
              });
            } catch (error) {
              console.error('发送结果回标签页失败:', error);
            }
          }
        })
        .catch(error => {
          console.error('保存域名出错:', error);
          // 同样，不再尝试使用sendResponse
        });
        
      return false; // 已经发送了初始响应，不再保持消息通道开放
    } else if (request.action === 'ping') {
      // 响应ping消息，确认后台脚本正在运行
      sendResponse({ status: 'ok', script: 'background.js' });
      return false;
    }
    
    // 对未知消息类型提供默认响应
    sendResponse({ status: 'unknown_action' });
    return false;
  } catch (error) {
    console.error('处理消息时出错:', error);
    // 确保错误情况下也发送响应
    sendResponse({ success: false, error: error.message || '未知错误' });
    return false;
  }
});

/**
 * 初始化存储
 */
function initializeStorage() {
  try {
    const defaultSettings = {
      scanAutoStart: true,
      panelPosition: 'right',
      itemsPerPage: 20
    };
    
    // 先初始化默认设置
    chrome.storage.local.set({
      ...defaultSettings
    });
    
    // 确保storageUtils对象存在
    if (self.storageUtils) {
      // 调用getDomainCollections确保默认集合存在
      self.storageUtils.getDomainCollections().then(collections => {
        console.log('存储初始化完成，默认集合已创建');
      }).catch(error => {
        console.error('初始化存储出错:', error);
      });
    } else {
      console.error('storageUtils未加载，无法初始化存储');
    }
  } catch (error) {
    console.error('初始化存储过程中出错:', error);
  }
}

// 显示通知的函数，修复图标路径问题
function showNotification(title, message, type = 'info') {
  try {
    // 使用chrome.runtime.getURL获取正确的图标路径
    const iconUrl = chrome.runtime.getURL('icons/icon48.png');
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: iconUrl,
      title: title,
      message: message
    });
  } catch (error) {
    console.error('显示通知出错:', error);
  }
} 