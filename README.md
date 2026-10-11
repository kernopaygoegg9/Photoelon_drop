# Photo Melon｜合成我的臉：原始碼與開發交接

這份套件包含目前可玩版本的完整 HTML、CSS、JavaScript、Matter.js 與物理測試，另附繁體中文技術文件。遊戲程式以來源版本 `7a665924d388caa8d543e706be13114973f538ec`（2026-10-11，關閉自動休眠的版本）為基礎，之後修正了照片裁切與高解析度繪製；`SOURCE_VERSION.json` 記錄的是原始快照的雜湊，不再對應目前的 `dist/app.js` 與 `dist/index.html`。

## 1. 在 Windows 電腦執行

需要已安裝 Node.js 18 或以上版本。遊戲與本機伺服器都不需要執行 `npm install`。

1. 解壓縮整份 ZIP。
2. 雙擊 `start-local.bat`，或在此資料夾開啟終端機，執行：

```bash
node start-local.cjs
```

3. 使用瀏覽器開啟 <http://127.0.0.1:8000/>。
4. 修改 `dist/` 下的檔案後，重新整理瀏覽器即可看到結果。

按 `Ctrl+C` 停止伺服器。8000 已被其他程式使用時，可執行 `node start-local.cjs 8001`，並開啟 <http://127.0.0.1:8001/>。

macOS / Linux 也能使用相同 Node.js 指令。若電腦已有 Python 3，可用以下替代指令：

```bash
python -m http.server 8000 --bind 127.0.0.1 --directory dist
```

macOS / Linux 常使用 `python3` 取代 `python`。

本套件是可在桌面瀏覽器執行的網頁原始碼。獨立 Windows 執行檔、Electron/Tauri 封裝與 Godot 專案尚未製作。直接雙擊 `dist/index.html` 可能能遊玩，但請使用本機 HTTP 伺服器，保持儲存來源與載入行為一致。

## 2. 檔案入口

| 檔案 | 用途 |
| --- | --- |
| `TECHNICAL.md` | 完整技術文件、參數、資料格式、限制與開發建議 |
| `dist/index.html` | 頁面結構與載入順序 |
| `dist/style.css` | 桌面與手機版面、按鈕與裁切視窗 |
| `dist/game.js` | Matter.js 包裝、物理世界與合成判定 |
| `dist/app.js` | 遊戲流程、Canvas 繪製、照片裁切、儲存與音效 |
| `dist/vendor/matter-0.20.0.min.js` | 已包含的 Matter.js 0.20.0 |
| `dist/vendor/MATTER-LICENSE.txt` | Matter.js 的 MIT 授權 |
| `tests/physics.cjs` | 12 項 Node.js 物理與規則測試 |
| `start-local.cjs` | 只監聽本機的靜態 HTTP 伺服器 |
| `start-local.bat` | Windows 啟動入口 |

## 3. 執行測試

在專案根目錄執行：

```bash
node --test tests/physics.cjs
```

測試使用套件內的 Matter.js，不需要下載其他依賴。它驗證模擬結果，並未取代真實瀏覽器的操作、照片解碼與效能測試。

## 4. 快速修改位置

| 想修改的項目 | 檔案／入口 |
| --- | --- |
| 球體大小 | `dist/game.js`：`RADII` |
| 重力、摩擦、反彈 | `dist/game.js`：`Physics.constructor()`、`add()` |
| 合成長大時間 | `dist/game.js`：`GROW_TIME` |
| 投球概率 | `dist/app.js`：`randomLevel()` |
| 投球間隔 | `dist/app.js`：`drop()` 與預覽透明度判斷 |
| 分數規則 | `dist/app.js`：`onMerge()` |
| 上傳大小與圖像解析度 | `dist/app.js`：`loadFile()`、`renderTile()`、`TILE` |
| 存檔格式 | `dist/app.js`：`save-theme` 事件與 `restoreTheme()` |

球階數、畫布大小與危險線目前涉及多處固定值；修改前請閱讀 `TECHNICAL.md` 的同步修改清單。

## 5. 交接給桌面版 AI／編輯器的任務文字

可直接貼上以下內容，並提供這個資料夾：

> 這是 Photo Melon 的現有網頁專案。請先讀 README.md 與 TECHNICAL.md，再閱讀 dist/game.js、dist/app.js 與 tests/physics.cjs。保留照片在本機處理、11 階圓形合成、關閉自動休眠和 140 ms 合成成長的行為。先執行 node --test tests/physics.cjs 確認基線，再根據我的新需求修改。已完成項目與建議改進要分清楚；不要把現有技術文件中的待辦當成已實作。

## 6. 儲存與版本

照片素材與最高分儲存在瀏覽器的 localStorage；不同網域、主機名稱或連接埠不會共用。例如線上版、`localhost:8000` 與 `127.0.0.1:8000` 的素材各自獨立。目前沒有素材匯出／匯入，所以線上版的已儲存照片不會自動出現在本機版。

本套件保留遊戲原始檔，沒有加入線上專案的 Git 中繼資料、部署身分或憑證。Matter.js 第三方授權文件已隨套件附上。
