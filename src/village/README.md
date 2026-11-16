# 柏树麦田

第四个独立场景，地址 `http://127.0.0.1:5405/?scene=village`。

```powershell
pnpm run build
pnpm run serve
```

WASD 行走，Shift 冲刺，空格跳跃，鼠标看向、滚轮调距，E 采色或作画，R 重新作画，V 全景 / 跟随，Esc 释放鼠标。沿小路找到三处调色台，再返回画架完成画作。

建筑与山体是代码生成几何，资产参考图不参与场景背景渲染。世界尺度、笔触规范、资产清单和扩展位置见 `docs/柏树麦田-场景拆解与资产规范.md`。

```powershell
$env:CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe'
node tools/village-check.mjs
```

自动检查使用无头浏览器及项目防鼠标锁定保护；不会占用桌面鼠标。
