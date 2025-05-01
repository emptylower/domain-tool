# 图标资源

## 图标要求
需要准备以下尺寸的图标：
- icon16.png (16x16像素)
- icon48.png (48x48像素)
- icon128.png (128x128像素)

## 建议方案
1. 可以使用在线工具如 [Canva](https://www.canva.com/)、[Figma](https://www.figma.com/) 等设计简单的域名工具图标
2. 或者使用图标库如 [Flaticon](https://www.flaticon.com/)、[Iconfinder](https://www.iconfinder.com/) 下载适合的图标
3. 确保图标有不同分辨率的版本，以适应不同的显示场景

## 临时图标
如果暂时没有正式图标，可以使用简单的占位图标：

```javascript
// 用于生成临时图标的JavaScript代码
// 可以保存为generate-icons.js并执行：node generate-icons.js

const fs = require('fs');
const { createCanvas } = require('canvas');

// 创建不同尺寸的图标
[16, 48, 128].forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // 背景
  ctx.fillStyle = '#4285F4';
  ctx.fillRect(0, 0, size, size);
  
  // 文字
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${size * 0.5}px Arial`;
  ctx.fillText('D', size/2, size/2);
  
  // 保存为PNG
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`icon${size}.png`, buffer);
  
  console.log(`Created icon${size}.png`);
});
```

请将生成的图标放在此文件夹中，然后删除本README.md文件。 