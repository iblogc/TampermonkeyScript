// ==UserScript==
// @name         beta-孔夫子旧书网图片下载（自动去水印）-路人甲乙丙
// @description  何以生财，唯有实战。（问题反馈联系微信Byte4Me）
// @version      4.2
// @author       路人甲乙丙
// @namespace    iblogc
// @match        *://search.kongfz.com/*
// @match        *://book.kongfz.com/*
// @match        *://item.kongfz.com/*
// @match        *://book.kongfz.com/C*
// @grant        GM_addStyle
// @grant        GM_download
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @license      Apache License, Version 2.0
// @homepage     https://greasyfork.org/zh-CN/scripts/467062
// ==/UserScript==

; (function () {
    'use strict'

    // 添加配置选项
    const WATERMARK_REMOVAL_METHOD = {
        CANVAS_COVER: 'canvas_cover',      // Canvas覆盖
        CUSTOM_WATERMARK: 'custom_watermark', // 自定义水印
        CROP_BOTTOM: 'crop_bottom'         // 裁剪底部
    }

    // 获取用户配置
    let currentMethod = GM_getValue('watermarkRemovalMethod', WATERMARK_REMOVAL_METHOD.CANVAS_COVER)
    let customWatermarkBase64 = GM_getValue('customWatermarkBase64', '')
    let cropRatio = GM_getValue('cropRatio', 0.9)

    // 注册菜单命令
    GM_registerMenuCommand('⚙️ 去水印设置', showSettings)
    GM_registerMenuCommand(`✨ 当前方式：${getMethodName(currentMethod)}`, switchMethod)

    // 切换去水印方式
    function switchMethod() {
        const methods = Object.values(WATERMARK_REMOVAL_METHOD)
        const currentIndex = methods.indexOf(currentMethod)
        const nextIndex = (currentIndex + 1) % methods.length
        const nextMethod = methods[nextIndex]

        if (nextMethod === WATERMARK_REMOVAL_METHOD.CUSTOM_WATERMARK && !customWatermarkBase64) {
            alert('请先在设置面板中上传自定义水印图片')
            showSettings()
            return
        }

        currentMethod = nextMethod
        GM_setValue('watermarkRemovalMethod', nextMethod)
        alert(`已切换为${getMethodName(nextMethod)}方式`)
    }

    // 获取方式名称
    function getMethodName(method) {
        switch (method) {
            case WATERMARK_REMOVAL_METHOD.CANVAS_COVER:
                return '纯色覆盖'
            case WATERMARK_REMOVAL_METHOD.CUSTOM_WATERMARK:
                return '自定义水印'
            case WATERMARK_REMOVAL_METHOD.CROP_BOTTOM:
                return '裁剪底部'
            default:
                return '未设置'
        }
    }

    // 创建设置面板
    function createSettingsPanel() {
        const panel = document.createElement('div')
        panel.className = 'settings-panel'
        panel.innerHTML = `
      <div class="settings-header">
        <h3>去水印备选方案设置</h3>
        <button class="close-button">×</button>
      </div>
      <div class="settings-content">
        <div class="settings-notice">
          <div class="notice-icon">ⓘ</div>
          <div class="notice-text">
            系统会优先使用完美去水印方式，
            仅在该方式失效时（目前失效率很高）才会使用以下备选方案。
          </div>
        </div>

        <div class="settings-section">
          <div class="method-options">
            <label class="method-radio">
              <input type="radio" name="watermarkMethod" value="canvas_cover" 
                     ${currentMethod === WATERMARK_REMOVAL_METHOD.CANVAS_COVER ? 'checked' : ''}>
              <div class="method-radio-content">
                <span class="method-title">纯色覆盖</span>
                <span class="method-desc">采集图片右下角的颜色，用相近的颜色覆盖水印区域，适合底色均匀的图片。</span>
              </div>
            </label>
            <label class="method-radio">
              <input type="radio" name="watermarkMethod" value="custom_watermark"
                     ${currentMethod === WATERMARK_REMOVAL_METHOD.CUSTOM_WATERMARK ? 'checked' : ''}>
              <div class="method-radio-content">
                <span class="method-title">自定义水印</span>
                <span class="method-desc">使用自定义图片覆盖水印区域，可以上传自己设计的水印或纯色图片。</span>
              </div>
            </label>
            <label class="method-radio">
              <input type="radio" name="watermarkMethod" value="crop_bottom"
                     ${currentMethod === WATERMARK_REMOVAL_METHOD.CROP_BOTTOM ? 'checked' : ''}>
              <div class="method-radio-content">
                <span class="method-title">裁剪底部</span>
                <span class="method-desc">直接裁剪掉图片底部的水印区域，适合水印区域内容不重要的图片。</span>
              </div>
            </label>
          </div>
        </div>

        <div id="customWatermarkSection" class="settings-section" 
             style="display: ${currentMethod === WATERMARK_REMOVAL_METHOD.CUSTOM_WATERMARK ? 'block' : 'none'}">
          <h4>自定义水印图片</h4>
          <span class="method-desc">
            脚本会自动缩放水印图片，以适应水印区域，并且保持水印图片比例，宽:高=5:2的图片刚好能覆盖水印区域。
            当然你也可以上传其它比例图片，不管怎样的水印图片，脚本都会自动缩放以覆盖水印区域。
          </span>
          <div class="file-upload">
            <label class="file-upload-button" for="watermarkFile">
              选择水印图片
            </label>
            <input type="file" id="watermarkFile" accept="image/*">
          </div>
          ${customWatermarkBase64 ?
            `<div class="preview-wrapper">
               <img src="${customWatermarkBase64}" class="preview-image">
             </div>` : ''}
        </div>
      </div>
      <div class="settings-footer">
        <button id="saveSettings" class="save-button">保存设置</button>
        <div class="settings-footer-links">
          <a href="#" id="donation" style="color: #007bff; text-decoration: none;">
            💰 赞赏支持
          </a>
          <span class="link-separator">|</span>
          <a href="#" id="devService" style="color: #007bff; text-decoration: none;">
            💻 软件/脚本/自动化定制开发
          </a>
        </div>
      </div>
    `
        return panel
    }

    // 显示设置面板
    function showSettings() {
        const overlay = document.createElement('div')
        overlay.className = 'settings-overlay'
        document.body.appendChild(overlay)

        const panel = createSettingsPanel()
        document.body.appendChild(panel)

        // 监听单选框变化
        const radioInputs = panel.querySelectorAll('input[name="watermarkMethod"]')
        radioInputs.forEach(input => {
            input.addEventListener('change', () => {
                const customSection = panel.querySelector('#customWatermarkSection')
                customSection.style.display =
                    input.value === WATERMARK_REMOVAL_METHOD.CUSTOM_WATERMARK ? 'block' : 'none'
            })
        })

        // 修改绑定保存事件
        panel.querySelector('#saveSettings').onclick = () => {
            const selectedMethod = panel.querySelector('input[name="watermarkMethod"]:checked').value

            currentMethod = selectedMethod
            
            GM_setValue('watermarkRemovalMethod', selectedMethod)
            GM_setValue('customWatermarkBase64', customWatermarkBase64)

            alert('设置已保存')
            panel.remove()
            overlay.remove()
        }

        // 绑定事件
        panel.querySelector('.close-button').onclick = () => {
            panel.remove()
            overlay.remove()
        }

        panel.querySelector('#watermarkFile').onchange = (e) => {
            const file = e.target.files[0]
            if (file) {
                const reader = new FileReader()
                reader.onload = (e) => {
                    customWatermarkBase64 = e.target.result
                    const preview = panel.querySelector('.preview-image')
                    if (preview) {
                        preview.src = customWatermarkBase64
                    } else {
                        const previewWrapper = document.createElement('div')
                        previewWrapper.className = 'preview-wrapper'
                        const img = document.createElement('img')
                        img.src = customWatermarkBase64
                        img.className = 'preview-image'
                        previewWrapper.appendChild(img)

                        const fileUpload = panel.querySelector('.file-upload')
                        fileUpload.insertAdjacentElement('afterend', previewWrapper)
                    }
                }
                reader.readAsDataURL(file)
            }
        }

        // 添加开发服务链接的点击事件
        panel.querySelector('#devService').addEventListener('click', (event) => {
            event.preventDefault()
            showDevServicePopup()
        })

        // 添加捐赠链接点击事件
        panel.querySelector('#donation').addEventListener('click', (event) => {
            event.preventDefault()
            showDonationPopup()
        })
    }

    // 清理并更新样式
    GM_addStyle(`
    .settings-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(5px);
      z-index: 9998;
    }

    .settings-panel {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(255, 255, 255, 0.95);
      padding: 32px;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      z-index: 9999;
      width: 800px;
      max-height: 90vh;
      overflow-y: auto;
      scrollbar-width: none;
    }

    .settings-panel::-webkit-scrollbar {
      display: none;
    }

    .settings-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      position: relative;
    }

    .settings-header h3 {
      font-size: 20px;
      font-weight: 600;
      color: #1d1d1f;
      margin: 0;
    }

    .settings-notice {
      display: flex;
      align-items: flex-start;
      background: #f5f5f7;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
    }

    .notice-icon {
      font-size: 20px;
      color: #06c;
      margin-right: 12px;
    }

    .notice-text {
      font-size: 14px;
      line-height: 1.4;
      color: #1d1d1f;
    }

    .settings-section {
      margin-bottom: 24px;
    }

    .settings-section h4 {
      font-size: 16px;
      font-weight: 600;
      color: #1d1d1f;
      margin: 0 0 5px 0;
    }

    .size-inputs {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 12px;
      justify-content: center;
    }

    .size-input-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 0 1 auto;
    }

    .size-input-wrapper label {
      white-space: nowrap;
      color: #86868b;
      font-size: 13px;
    }

    .input-unit-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      min-width: 120px;
    }

    .size-separator {
      margin: 0 8px;
      color: #86868b;
      font-size: 14px;
      line-height: 1;
    }

    input[type="text"] {
      width: 100%;
      padding: 8px 50px 8px 12px;
      border: 1px solid #d2d2d7;
      border-radius: 8px;
      font-size: 14px;
      color: #1d1d1f;
    }

    .unit-select {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      border: none;
      background: transparent;
      font-size: 14px;
      color: #86868b;
      cursor: pointer;
      padding-right: 16px;
    }

    .method-options {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
    }

    .method-radio {
      flex: 1;
      cursor: pointer;
    }

    .method-radio input[type="radio"] {
      display: none;
    }

    .method-radio-content {
      padding: 16px;
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 12px;
      text-align: center;
      transition: all 0.2s;
    }

    .method-radio input[type="radio"]:checked + .method-radio-content {
      background: #e8f2ff;
      border: 1px solid #06c;
    }

    .method-title {
      display: block;
      font-size: 15px;
      font-weight: 600;
      color: #1d1d1f;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #eee;
    }

    .method-desc {
      display: block;
      font-size: 13px;
      line-height: 1.5;
      color: #666;
      text-align: left;
      padding: 0 4px;
    }

    .preview-wrapper {
      margin: 16px auto;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #d2d2d7;
      max-width: 200px !important;  
      max-height: 80px !important;  
      width: 200px;
      height: 80px;
      background: #f5f5f7;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .preview-image {
      width: 100%;
      height: 100%;
      object-fit: contain; // 保持图片比例,确保完整显示
    }

    .crop-mode .size-input-wrapper {
      max-width: 300px;
      margin: 0 auto;
    }

    .file-upload {
      margin-bottom: 16px;
      text-align: center;
    }

    .file-upload-button {
      display: inline-block;
      padding: 8px 16px;
      background: #06c;
      color: white;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .file-upload-button:hover {
      background: #0055b3;
    }

    .file-upload input[type="file"] {
      display: none;
    }

    .close-button {
      width: 28px;
      height: 28px;
      border: none;
      background: #f5f5f7;
      border-radius: 50%;
      font-size: 18px;
      color: #86868b;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-button:hover {
      background: #e5e5e7;
      color: #1d1d1f;
    }

    .settings-footer {
      margin-top: 24px;
      text-align: center;
    }

    .save-button {
      padding: 10px 24px;
      background: #06c;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .save-button:hover {
      background: #0055b3;
    }

    /* 图片弹窗样式 */
    .image-popup {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      z-index: 10004;
      overflow: hidden;
    }

    .image-popup-header {
      position: relative;
      height: 0;
    }

    .image-popup-body {
      padding: 30px;
    }

    .image-popup img {
      max-width: 700px;
      max-height: 80vh;
      border-radius: 8px;
      display: block;
    }

    /* 设置面板底部链接样式 */
    .settings-footer-links {
      margin-top: 15px;
      text-align: center;
    }

    .link-separator {
      margin: 0 10px;
      color: #dee2e6;
    }

    /* 捐赠弹窗样式优化 */
    .donation-popup {
      max-width: 800px;
      width: 90%;
      padding: 30px;
    }

    .donation-header {
      position: relative;
      text-align: center;
      margin-bottom: 25px;
      padding-bottom: 15px;
      border-bottom: 2px solid #f0f2f5;
    }

    .donation-header h3 {
      margin: 0;
      font-size: 24px;
      color: #2c3e50;
      font-weight: 600;
    }

    .donation-links {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 20px;
      text-align: center;
    }

    .donation-links a {
      color: #007bff;
      text-decoration: none;
      transition: color 0.2s;
    }

    .donation-links a:hover {
      color: #0056b3;
    }

    /* 统一关闭按钮样式 */
    .close-button {
      position: absolute;
      top: -20px;
      right: -20px;
      width: 36px;
      height: 36px;
      border: none;
      background: #dc3545;
      border-radius: 50%;
      font-size: 20px;
      color: white;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(220, 53, 69, 0.4);
      z-index: 1;
    }

    .close-button:hover {
      background: #c82333;
      transform: scale(1.1) rotate(90deg);
      box-shadow: 0 4px 12px rgba(220, 53, 69, 0.6);
    }
  `)

    const currentPath = window.location.href

    const STORAGE_KEY = 'downloadCount'
    const DONATION_POPUP_SHOWN_KEY = 'donationPopupShown'
    const FIRST_EXECUTION_KEY = 'firstExecutionv42'
    let downloadCount = parseInt(localStorage.getItem(STORAGE_KEY)) || 0
    let donationPopupShown = localStorage.getItem(DONATION_POPUP_SHOWN_KEY) === 'true'
    let firstExecution = localStorage.getItem(FIRST_EXECUTION_KEY) === 'true'

    function updateDownloadCount(count) {
        downloadCount = count
        localStorage.setItem(STORAGE_KEY, count)
    }

    function markDonationPopupShown() {
        donationPopupShown = true
        localStorage.setItem(DONATION_POPUP_SHOWN_KEY, 'true')
    }

    function markFirstExecution() {
        firstExecution = true
        localStorage.setItem(FIRST_EXECUTION_KEY, 'true')
    }

    function removeWatermarkFromHref(href) {
        return href.replace(/(_water|_n|_p|_b|_s)/g, '')
    }

    function createBookPageDownloadButton(images) {
        const downloadButton = document.createElement('button')
        downloadButton.innerText = `👉 下载图片（${images.length}）`
        downloadButton.id = 'downloadButton'
        downloadButton.style.backgroundColor = '#8c222c'
        downloadButton.style.color = 'white'
        document.body.appendChild(downloadButton)
        return downloadButton
    }

    function createSearchPageDownloadButton(doc, item) {
        const downloadButton = doc.createElement('button')
        downloadButton.innerText = '👉 下载图片'
        downloadButton.className = 'searchPageDownloadButton item-button'
        downloadButton.style.backgroundColor = '#8c222c'
        downloadButton.style.color = 'white'
        const addCartBtn = item.querySelector('div.add-cart-btn') || item.querySelector('div.add-cart-button')
        addCartBtn.parentNode.insertBefore(downloadButton, addCartBtn.nextSibling)
        return downloadButton
    }

    function createCategoryPageDownloadButton(doc, item) {
        const downloadButton = doc.createElement('button')
        downloadButton.innerText = '👉 下载图片'
        downloadButton.className = 'searchPageDownloadButton item-button'
        downloadButton.style.backgroundColor = '#8c222c'
        downloadButton.style.color = 'white'
        const addCartBtn = item.querySelector('div.add-cart-btn') || item.querySelector('div.add-cart-button')
        addCartBtn.parentNode.insertBefore(downloadButton, addCartBtn.nextSibling)
        return downloadButton
    }

    function createBookListPageDownloadButton(doc, item) {
        const downloadButton = doc.createElement('button')
        downloadButton.innerText = '👉 下载图片'
        downloadButton.className = 'bookListPageDownloadButton'
        downloadButton.style.backgroundColor = '#8c222c'
        downloadButton.style.color = 'white'
        const addCartBtn = item.querySelector('a.con-btn-cart')
        addCartBtn.parentNode.insertBefore(downloadButton, addCartBtn.nextSibling)
        return downloadButton
    }

    function handleDownloadButtonClick(document, downloadButton) {
        extractImagesAndDownFromWebPage(document, downloadButton)
    }

    function extractImagesFromBookPage(doc) {
        const liElements = doc.querySelectorAll('ul#figure-info-box > li')
        return Array.from(liElements, (liElement) => liElement.querySelector('img').getAttribute('_viewsrc'))
    }

    /**
     * 使用Canvas处理图片水印
     * @param {string} imageUrl - 需要处理的图片URL
     * @returns {Promise<string>} - 返回处理后的图片URL
     */
    async function removeWatermarkWithCanvas(imageUrl) {
        console.log('开始Canvas处理水印，原图URL:', imageUrl)
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'

            img.onload = async function () {
                console.log('图片加载成功，尺寸:', img.width, 'x', img.height)
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')

                // 根据不同方法处理水印
                switch (currentMethod) {
                    case WATERMARK_REMOVAL_METHOD.CANVAS_COVER:
                        // 原有的 Canvas 覆盖方法
                        canvas.width = img.width
                        canvas.height = img.height
                        ctx.drawImage(img, 0, 0)
                        await handleCanvasCover(ctx, img)
                        break

                    case WATERMARK_REMOVAL_METHOD.CUSTOM_WATERMARK:
                        // 使用自定义水印覆盖
                        canvas.width = img.width
                        canvas.height = img.height
                        ctx.drawImage(img, 0, 0)
                        await handleCustomWatermark(ctx, img)
                        break

                    case WATERMARK_REMOVAL_METHOD.CROP_BOTTOM:
                        // 裁剪底部方法
                        canvas.width = img.width
                        // 根据图片宽度计算裁剪高度
                        canvas.height = img.height - (img.width / 10)
                        ctx.drawImage(img, 0, 0)
                        break
                }

                // 转换为blob并返回
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const processedUrl = URL.createObjectURL(blob)
                            console.log('Canvas处理完成，生成新URL:', processedUrl)
                            resolve(processedUrl)
                        } else {
                            console.error('Canvas转Blob失败')
                            reject(new Error('Canvas to Blob conversion failed'))
                        }
                    },
                    'image/jpeg',
                    0.95
                )
            }

            img.onerror = (error) => {
                console.error('图片加载失败:', error)
                reject(new Error('Image loading failed'))
            }
            img.src = imageUrl
        })
    }

    // Canvas覆盖方法
    async function handleCanvasCover(ctx, img) {
        // 根据图片实际宽度计算水印尺寸
        const actualWidth = img.width / 4
        const actualHeight = img.width / 10

        const x = img.width - actualWidth
        const y = img.height - actualHeight

        // 获取右下角颜色采样
        const sampleSize = 5
        let rSum = 0, gSum = 0, bSum = 0, count = 0

        for (let sx = x + actualWidth - sampleSize; sx < x + actualWidth; sx++) {
            for (let sy = y + actualHeight - sampleSize; sy < y + actualHeight; sy++) {
                const pixel = ctx.getImageData(sx, sy, 1, 1).data
                rSum += pixel[0]
                gSum += pixel[1]
                bSum += pixel[2]
                count++
            }
        }

        const avgR = Math.round(rSum / count)
        const avgG = Math.round(gSum / count)
        const avgB = Math.round(bSum / count)

        // 处理水印区域
        const imageData = ctx.getImageData(x, y, actualWidth, actualHeight)
        const pixels = imageData.data

        for (let i = 0; i < pixels.length; i += 4) {
            pixels[i] = avgR + (Math.random() - 0.5) * 10
            pixels[i + 1] = avgG + (Math.random() - 0.5) * 10
            pixels[i + 2] = avgB + (Math.random() - 0.5) * 10
            pixels[i + 3] = 245
        }

        ctx.putImageData(imageData, x, y)
        ctx.filter = 'blur(2px)'
        ctx.fillStyle = `rgba(${avgR}, ${avgG}, ${avgB}, 0.3)`
        ctx.fillRect(x, y, actualWidth, actualHeight)
        ctx.filter = 'none'
    }

    // 修改自定义水印覆盖方法
    async function handleCustomWatermark(ctx, img) {
        if (!customWatermarkBase64) {
            throw new Error('未设置自定义水印图片')
        }

        return new Promise((resolve, reject) => {
            const watermarkImg = new Image()
            watermarkImg.crossOrigin = 'anonymous'

            watermarkImg.onload = () => {
                // 计算目标区域尺寸
                const targetWidth = img.width / 4
                const targetHeight = img.width / 10

                // 计算水印图片的宽高比
                const watermarkRatio = watermarkImg.width / watermarkImg.height
                // 计算目标区域的宽高比
                const targetRatio = targetWidth / targetHeight

                // 计算实际绘制尺寸和位置
                let drawWidth, drawHeight, drawX, drawY

                if (watermarkRatio > targetRatio) {
                    // 如果水印图片比目标区域更宽，则以高度为基准
                    drawHeight = targetHeight
                    drawWidth = drawHeight * watermarkRatio
                    drawY = img.height - targetHeight
                    drawX = img.width - drawWidth + (drawWidth - targetWidth) / 2 // 水平居中
                } else {
                    // 如果水印图片比目标区域更高，则以宽度为基准
                    drawWidth = targetWidth
                    drawHeight = drawWidth / watermarkRatio
                    drawX = img.width - targetWidth
                    drawY = img.height - drawHeight + (drawHeight - targetHeight) / 2 // 垂直居中
                }

                // 绘制自定义水印
                ctx.drawImage(watermarkImg, drawX, drawY, drawWidth, drawHeight)
                resolve()
            }

            watermarkImg.onerror = () => {
                reject(new Error('自定义水印图片加载失败'))
            }

            watermarkImg.src = customWatermarkBase64
        })
    }

    // 解析网页下载图片
    function extractImagesAndDownFromWebPage(doc, downloadButton) {
        const images = extractImagesFromBookPage(doc)
        downloadButton.style.cursor = 'not-allowed'
        var bugReportLink = document.createElement('a')
        bugReportLink.href = '#'
        bugReportLink.textContent = '🐛问题反馈'
        bugReportLink.style.color = '#ffeb83'
        bugReportLink.onclick = (e) => {
            e.preventDefault()
            showImagePopup('https://greasyfork.s3.us-east-2.amazonaws.com/lp9hdyffstt0wpz2ub39gw9p6srr')
        }

        if (images.length === 0) {
            downloadButton.innerText = '🧐商品详情中没\n有图片可以下载\n'
            downloadButton.style.backgroundColor = '#ccc'
            downloadButton.style.color = '#999'
            bugReportLink.style.color = '#b55222'
            downloadButton.appendChild(bugReportLink)
            return
        }

        downloadButton.disabled = true
        downloadButton.innerText = 'Downloading...'

        let directSuccessCount = 0 // 直接去水印成功数量
        let canvasSuccessCount = 0 // Canvas处理成功数量
        let originalImageCount = 0 // 原图下载数量
        let failCount = 0 // 下载失败数量

        const bookNameContent = (doc.querySelector('meta[name="keywords"]').getAttribute('content') || '').match(/([^,]+)/)
        const bookName = bookNameContent && bookNameContent.length > 1 ? bookNameContent[1] : ''
        const isbnContent = (doc.querySelector('meta[name="description"]').getAttribute('content') || '').match(/ISBN：([0-9]*)/)
        const isbn = isbnContent && isbnContent.length > 1 ? isbnContent[1] : ''

        images.forEach((imageUrl, index) => {
            const imageUrlWithoutWatermark = removeWatermarkFromHref(imageUrl)
            const extension = (imageUrlWithoutWatermark.split('.').pop() || '').toLowerCase()
            const imageName = `去水印_${bookName.trim()}-${isbn.trim()}-${index + 1}.${extension || 'jpg'}`

            /**
             * 下载图片的主函数
             * @param {string} url - 图片URL
             * @param {boolean} isRetry - 是否为重试下载
             * @param {boolean} isOriginal - 是否载原图（带水印）
             */
            function downloadImage(url, isRetry = false, isOriginal = false) {
                let method = isOriginal ? 'original' :
                    isRetry ? currentMethod :
                        'direct'

                const filename = getImageFileName(index, bookName, isbn, extension, method)

                console.log('开始下载图片:', {
                    url,
                    filename,
                    isRetry,
                    isOriginal,
                    currentProgress: `${directSuccessCount + canvasSuccessCount + originalImageCount + failCount + 1}/${images.length}`
                })

                GM_download({
                    url,
                    name: filename,
                    onprogress: (event) => {
                        downloadButton.innerText = `Downloading...(${index + 1}/${images.length})`
                    },
                    onload: () => {
                        if (isOriginal) {
                            originalImageCount++
                            console.log(`原图下载成功 - 总进度: ${directSuccessCount + canvasSuccessCount + originalImageCount + failCount}/${images.length}`)
                        } else if (isRetry) {
                            canvasSuccessCount++
                            console.log(`Canvas处理图片下载成功 - 总进度: ${directSuccessCount + canvasSuccessCount + originalImageCount + failCount}/${images.length}`)
                        } else {
                            directSuccessCount++
                            console.log(`直接去水印下载成功 - 总进度: ${directSuccessCount + canvasSuccessCount + originalImageCount + failCount}/${images.length}`)
                        }

                        // 检查是否所有图片都处理完成
                        if (directSuccessCount + canvasSuccessCount + originalImageCount + failCount === images.length) {
                            console.log('所有图片处理完成:', {
                                直接去水印成功: directSuccessCount,
                                Canvas处理成功: canvasSuccessCount,
                                原图下载: originalImageCount,
                                失败: failCount
                            })
                            updateDownloadButton()
                            updateDownloadCount(downloadCount + directSuccessCount + canvasSuccessCount + originalImageCount)

                            // 检查是否需要显示捐赠弹窗
                            if ((downloadCount % 100 === 0 && downloadCount !== 0 && !donationPopupShown) || (downloadCount > 1000 && !donationPopupShown)) {
                                showDonationPopup()
                            }
                        }
                    },
                    onerror: async (error) => {
                        // 第一次下载失败，尝试Canvas处理
                        if (!isRetry && !isOriginal) {
                            console.log('无水印链接下载失败，尝试Canvas处理...', error)
                            try {
                                const processedImageUrl = await removeWatermarkWithCanvas(imageUrl)
                                downloadImage(processedImageUrl, true, false)
                            } catch (canvasError) {
                                console.log('Canvas处理失败，降级到原图下载:', canvasError)
                                downloadImage(imageUrl, true, true)
                            }
                        }
                        // Canvas处理后下载失败，尝试原图
                        else if (isRetry && !isOriginal) {
                            console.log('Canvas处理图片下载失败，降级到原图下载:', error)
                            downloadImage(imageUrl, true, true)
                        }
                        // 所有尝试都失败
                        else {
                            failCount++
                            console.error('图片下载完全失败:', error)
                            if (directSuccessCount + canvasSuccessCount + originalImageCount + failCount === images.length) {
                                updateDownloadButton()
                            }
                        }
                    }
                })
            }

            downloadImage(imageUrlWithoutWatermark)
        })

        function updateDownloadButton() {
            downloadButton.style.lineHeight = '20px'
            downloadButton.innerText =
                `📢总计：${images.length}\n` +
                `✨完美去水印：${directSuccessCount}\n` +
                `🎨备选去水印：${canvasSuccessCount}\n` +
                `🔄未去水印：${originalImageCount}\n` +
                `😭下载失败：${failCount}\n`

            downloadButton.appendChild(bugReportLink)
            if (failCount > 0) {
                downloadButton.style.backgroundColor = '#c97c75'
                downloadButton.style.color = '#fff'
            } else {
                downloadButton.style.backgroundColor = '#7b7475'
                downloadButton.style.color = '#fff'
            }
        }
    }

    function showDonationPopup() {
        // 播放彩带效果
        createConfetti()
        const overlay = document.createElement('div')
        overlay.classList.add('overlay')
        document.body.appendChild(overlay)

        const donationPopup = document.createElement('div')
        donationPopup.classList.add('donation-popup')
        donationPopup.innerHTML = `
      <div class="donation-header">
        <h3>孔夫子旧书网图片下载（自动去水印）</h3>
        <button class="close-button">×</button>
        <p style="font-size: 14px; color: #666;">让您的时间更高效</p>
      </div>
      <div class="donation-body">
        <p>🙏感谢您选择此工具！捐赠是对我最大的支持，也能帮助工具不断改进与维护。</p>
        <div class="donation-images">
          <img src="https://greasyfork.s3.us-east-2.amazonaws.com/hve4r1x61p2vrsx2bjqjb1um8wfh" alt="捐赠二维码1" class="donation-image-large" />
          <img src="https://greasyfork.s3.us-east-2.amazonaws.com/2w21qpqvqb9iikjqiovagnuyut1x" alt="捐赠二维码2" class="donation-image-large" />
        </div>
        <div class="donation-links">
          <a href="#" id="feedbackWeChat">
            ❓问题/建议反馈微信：Byte4Me
          </a>
          <a href="#" id="sideHustleGroup">
            💰副业社群体检卡
          </a>
          <a href="#" id="devService">
            💻 软件/脚本/自动化定制开发
          </a>
        </div>
         <div class="donation-footer">
            <button id="donateBtn" class="donation-button donate">我已捐赠💖</button>
        </div>
      </div>
    `
        document.body.appendChild(donationPopup)

        const closeBtn = donationPopup.querySelector('.close-button')

        const donateBtn = donationPopup.querySelector('#donateBtn')

        donateBtn.addEventListener('click', () => {
            alert('🙏感谢您的支持！如果有问题，欢迎联系微信：Byte4Me')
            donationPopup.remove()
            overlay.remove()
            markDonationPopupShown()
        })

        closeBtn.addEventListener('click', () => {
            donationPopup.remove()
            overlay.remove()
        })

        // Add image popup functionality
        donationPopup.querySelector('#feedbackWeChat').addEventListener('click', (event) => {
            event.preventDefault()
            showImagePopup('https://greasyfork.s3.us-east-2.amazonaws.com/lp9hdyffstt0wpz2ub39gw9p6srr')
        })

        donationPopup.querySelector('#sideHustleGroup').addEventListener('click', (event) => {
            event.preventDefault()
            showImagePopup('https://greasyfork.s3.us-east-2.amazonaws.com/7cjf1r8rohkrh8xwp0mn2srocx0u')
        })

        donationPopup.querySelector('#devService').addEventListener('click', (event) => {
            event.preventDefault()
            showDevServicePopup()
        })
    }

    function showImagePopup(imageUrl) {
        const overlay = document.createElement('div')
        // overlay.classList.add('overlay')
        // overlay.style.zIndex = '10003'
        // document.body.appendChild(overlay)

        const imagePopup = document.createElement('div')
        imagePopup.classList.add('image-popup')
        imagePopup.innerHTML = `
      <div class="image-popup-header">
        <button class="close-button">×</button>
      </div>
      <div class="image-popup-body">
        <img src="${imageUrl}" alt="Image" />
      </div>
    `
        document.body.appendChild(imagePopup)

        const closeButton = imagePopup.querySelector('.close-button')
        closeButton.addEventListener('click', () => {
            imagePopup.remove()
            overlay.remove()
        })

        overlay.addEventListener('click', () => {
            imagePopup.remove()
            overlay.remove()
        })
    }

    function extractImagesFromBookPageUrl(bookPageUrl, downloadButton) {
        downloadButton.addEventListener('click', () => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: bookPageUrl,
                onload: function (response) {
                    const parser = new DOMParser()
                    const doc = parser.parseFromString(response.responseText, 'text/html')
                    extractImagesAndDownFromWebPage(doc, downloadButton)
                },
                onerror: function (error) {
                    console.log('Error:', error)
                    downloadButton.innerText = `⛔ 解析网页时出错`
                }
            })
        })
    }

    function handleSearchPageItemClick(item) {
        const titleLink = item.querySelector('.item-info-box > .item-name > a.item-link')
        const bookPageUrl = titleLink.href
        const downloadButton = createSearchPageDownloadButton(document, item)
        extractImagesFromBookPageUrl(bookPageUrl, downloadButton)
    }

    function handleCategoryPageItemClick(item) {
        const titleLink = item.querySelector('.item-info > .title > a.link')
        const bookPageUrl = titleLink.href
        const downloadButton = createCategoryPageDownloadButton(document, item)
        extractImagesFromBookPageUrl(bookPageUrl, downloadButton)
    }

    function handleBookListPageItemClick(item) {
        const titleLink = item.querySelector('div.list-con-title > a')
        const bookPageUrl = titleLink.href
        const downloadButton = createBookListPageDownloadButton(document, item)
        extractImagesFromBookPageUrl(bookPageUrl, downloadButton)
    }

    let intervalId

    function handleSearchPage() {
        const listBox = document.querySelector('.product-item-box')
        if (listBox) {
            clearInterval(intervalId)
            const items = document.querySelectorAll('.product-item-box > .product-item-wrap')
            items.forEach((item) => {
                handleSearchPageItemClick(item)
            })
        }
    }

    function handleCategoryPage() {
        const listBox = document.querySelector('#listBox')
        if (listBox) {
            clearInterval(intervalId)
            const items = document.querySelectorAll('#listBox > .item')
            items.forEach((item) => {
                handleCategoryPageItemClick(item)
            })
        }
    }

    function handleBookListPage() {
        const listBox = document.querySelector('ul.itemList')
        if (listBox) {
            clearInterval(intervalId)
            const items = document.querySelectorAll('ul.itemList > li')
            items.forEach((item) => {
                handleBookListPageItemClick(item)
            })
        }
    }

    if (!firstExecution) {
        // alert("孔夫子旧书网图片下载插件 v3.6 网站图片规则修改，去水印基本失效，在找到新方法前降级到下载原图");
        showUpdateLogPopup()
        markFirstExecution()
    }

    function showUpdateLogPopup() {
        // 播放彩带效果
        createConfetti()
        const overlay = document.createElement('div')
        overlay.classList.add('overlay')
        document.body.appendChild(overlay)

        const updateLogPopup = document.createElement('div')
        updateLogPopup.classList.add('update-log-popup')
        updateLogPopup.innerHTML = `
              <div class="update-log-header">
                  <p><a target="_blank" href="https://greasyfork.org/zh-CN/scripts/467062">孔夫子旧书网图片下载（自动去水印）更新日志</a></p>
                  <div style="font-size: 12px; color: #666; text-align: center;">每次升级后此窗口可能会展示多次</div>
              </div>
              <div class="update-log-body">
                  <ul>
                    <li>
                      <div style="display: flex; align-items: center; justify-content: center;">🧨提前祝大家新年快乐🧨</div>
                      <p style="font-weight: bold;">[2025-01-22] v4.2</p>
                      <ul>
                          <li style="color: red;">自动根据要下载的图片尺寸计算水印区域，不再需要手动设置</li>
                      </ul>
                    </li>
                    <li>
                      <p style="font-weight: bold;">[2024-12-27] v4.0</p>
                      <ul>
                          <li style="color: red;">1. 新增三种备用去水印方式，分别是：裁剪底部水印区域、裁剪底部水印区域、裁剪底部水印区域；<br><img src="https://greasyfork.s3.us-east-2.amazonaws.com/vb9gy3e8gy70l2r26vw3lgo5bfix" alt="设置菜单说明" style="width: 90%;"></li>
                          <li>2. 修改按钮和弹窗样式。</li>
                      </ul>
                    </li>
                  </ul>
                  <p style="text-align: center; margin-top: 10px;">
                      <a href="#" id="donation" style="color: #007bff; text-decoration: none;">
                          💰 好活，当赏
                      </a>
                      &nbsp;|&nbsp;
                      <a href="#" id="scyspromotion" style="color: #007bff; text-decoration: none;">
                          💵 副业社群体检卡
                      </a>
                      &nbsp;|&nbsp;
                      <a href="#" id="devService" style="color: #007bff; text-decoration: none;">
                          💻 软件/脚本/自动化定制开发
                      </a>
                  </p>
              </div>
              <div class="update-log-footer">
                  <button id="closeUpdateLogBtn" class="update-log-button">我知道了</button>
              </div>
          `
        document.body.appendChild(updateLogPopup)

        const closeUpdateLogBtn = updateLogPopup.querySelector('#closeUpdateLogBtn')

        closeUpdateLogBtn.addEventListener('click', () => {
            updateLogPopup.remove()
            overlay.remove()
        })

        const donation = updateLogPopup.querySelector('#donation')
        const scyspromotion = updateLogPopup.querySelector('#scyspromotion')
        const devService = updateLogPopup.querySelector('#devService')

        donation.addEventListener('click', (event) => {
            event.preventDefault()
            showDonationPopup()
        })

        scyspromotion.addEventListener('click', (event) => {
            event.preventDefault()
            showImagePopup('https://greasyfork.s3.us-east-2.amazonaws.com/7cjf1r8rohkrh8xwp0mn2srocx0u')
        })

        devService.addEventListener('click', (event) => {
            event.preventDefault()
            showDevServicePopup()
        })
    }

    if (currentPath.includes('//search.kongfz.com/')) {
        console.log('//search.kongfz.com/')
        intervalId = setInterval(handleSearchPage, 1000)
    } else if (currentPath.includes('//book.kongfz.com/C')) {
        console.log('//book.kongfz.com/C')
        intervalId = setInterval(handleCategoryPage, 1000)
    } else if (currentPath.includes('//book.kongfz.com/')) {
        console.log('//book.kongfz.com/')
        const downloadButton = createBookPageDownloadButton(extractImagesFromBookPage(document))
        downloadButton.addEventListener('click', () => handleDownloadButtonClick(document, downloadButton))
    } else if (currentPath.includes('//item.kongfz.com/')) {
        console.log('//item.kongfz.com/')
        intervalId = setInterval(handleBookListPage, 1000)
    }

    GM_addStyle(`
    #downloadButton {
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 10px 20px;
    background-color: #333;
    color: #fff;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    z-index: 9999;
    }
    #bugReportLink {
    position: fixed;
    bottom: 5px;
    right: 20px;
    padding: 10px 20px;
    background-color: #333;
    color: #fff;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    z-index: 9999;
    }
    .searchPageDownloadButton {
    padding: 1px 5px;
    background-color: #333;
    color: #fff;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    z-index: 9999;
    font-size: 12px;
    margin: 0px 10px;
    }
    .bookListPageDownloadButton {
    padding: 1px 5px;
    background-color: #333;
    color: #fff;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    z-index: 9999;
    font-size: 12px;
    margin: 8px auto 0;
    display: block;
    }
    button.disabled {
    background-color: #ccc;
    color: #999;
    cursor: pointer;
    /* 其他样式 */
    }
  .overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(5px);
      z-index: 1000;
  }
  .donation-popup {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
      text-align: center;
      z-index: 10001;
      max-width: 800px;
      width: 90%;
  }
  .donation-header p {
      margin: 5px 0;
      font-size: 18px;
      font-weight: bold;
      color: #333;
  }
  .donation-body p {
      font-size: 14px;
      color: #555;
      line-height: 1.5;
  }
  .donation-images {
      display: flex;
      justify-content: space-around;
      margin: 15px 0;
  }
  .donation-image-large {
      max-width: 350px;
      max-height: 350px;
      border: 1px solid #ddd;
      border-radius: 5px;
  }
  .donation-footer {
      margin-top: 20px;
  }
  .donation-button {
      margin: 5px;
      padding: 10px 20px;
      font-size: 14px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
  }
  .donation-button.donate {
      background-color: #28a745;
      color: white;
  }
  .donation-button.cancel {
      background-color: #dc3545;
      color: white;
  }
  .donation-button:hover {
      opacity: 0.9;
  }
  .image-popup {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 10px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
      padding: 10px;
      z-index: 10002;
  }
  .image-popup img {
      max-width: 700px;
      max-height: 90vh;
      border-radius: 5px;
      padding: 20px 50px;
  }
  .image-popup .close-button {
      position: absolute;
      top: 0px;
      right: 0px;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      font-size: 16px;
      text-align: center;
      cursor: pointer;
  }
  .update-log-popup {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
      text-align: left;
      z-index: 10001;
      max-height: 80vh;
      overflow-y: auto;
      max-width: 800px;
      width: 90%;
      scrollbar-width: none;
  }
      
  .update-log-header p {
      margin: 5px 0;
      font-size: 18px;
      font-weight: bold;
      color: #333;
      text-align: center;
  }
  .update-log-body ul {
      list-style-type: disc;
      padding-left: 20px;
  }
  .update-log-body ul ul {
      list-style-type: circle;
      padding-left: 20px;
  }
  .update-log-body li {
      margin-bottom: 2px;
  }
  .update-log-footer {
      margin-top: 20px;
      text-align: center;
  }
  .update-log-button {
      padding: 5px 10px;
      font-size: 14px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      background-color: #007bff;
      color: white;
  }
  .update-log-button:hover {
      opacity: 0.9;
  }
  
    `)

    function createSingleFirework(container) {
        const firework = document.createElement('div')
        firework.className = 'firework'

        // 随机位置，但避免太靠边
        const left = 20 + Math.random() * 60 // 在20%-80%的范围内
        const bottom = 30 + Math.random() * 40 // 在30%-70%的范围内
        firework.style.left = `${left}%`
        firework.style.bottom = `${bottom}%`

        container.appendChild(firework)

        // 增加粒子数量
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div')
            particle.className = 'particle'
            // 随机颜色
            particle.style.background = `hsl(${Math.random() * 360}, 100%, 50%)`
            firework.appendChild(particle)
        }

        // 动画结束后移除
        setTimeout(() => {
            firework.remove()
        }, 4000)
    }

    // 更新烟花效果的样式
    GM_addStyle(`
    .fireworks-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
    }

    .firework {
      position: absolute;
      transform: scale(1);
      animation: scale 0.3s ease-out forwards;
    }

    .particle {
      position: absolute;
      width: 6px;  // 增大粒子尺寸
      height: 6px;
      border-radius: 50%;
      animation: explode 1.5s ease-out forwards;
      box-shadow: 0 0 10px 2px currentColor;  // 添加发光效果
    }

    @keyframes scale {
      from {
        transform: scale(0);
      }
      50% {
        transform: scale(1.2);
      }
      to {
        transform: scale(1);
      }
    }

    @keyframes explode {
      0% {
        transform: translateX(0) translateY(0);
        opacity: 1;
      }
      50% {
        opacity: 0.8;
      }
      100% {
        transform: translateX(var(--x)) translateY(var(--y));
        opacity: 0;
      }
    }
  `)

    // 更新粒子轨迹生成
    document.addEventListener('DOMContentLoaded', () => {
        const style = document.createElement('style')
        let css = ''

        // 为每个粒子生成随机轨迹
        for (let i = 0; i < 20; i++) {
            const angle = i * 18 + (Math.random() * 20 - 10) // 更均匀的角度分布
            const distance = 100 + Math.random() * 50 // 更大的扩散范围
            const x = Math.cos((angle * Math.PI) / 180) * distance
            const y = Math.sin((angle * Math.PI) / 180) * distance
            css += `.firework .particle:nth-child(${i + 1}) { --x: ${x}px; --y: ${y}px; }\n`
        }

        style.textContent = css
        document.head.appendChild(style)
    })

    // 添加彩带效果代码
    function createConfetti() {
        const confettiContainer = document.createElement('div')
        confettiContainer.className = 'confetti-container'
        document.body.appendChild(confettiContainer)

        // 创建多个彩带
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div')
            confetti.className = 'confetti'
            confetti.style.left = Math.random() * 100 + 'vw'
            confetti.style.animationDelay = Math.random() * 3 + 's'
            confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`
            confettiContainer.appendChild(confetti)
        }

        // 3秒后移除彩带容器
        setTimeout(() => {
            confettiContainer.remove()
        }, 5000)
    }

    // 添加彩带样式
    GM_addStyle(`
    .confetti-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
      overflow: hidden;
    }

    .confetti {
      position: absolute;
      width: 10px;
      height: 20px;
      top: -20px;
      transform-origin: center;
      animation: confetti-fall 3s ease-in-out forwards;
    }

    @keyframes confetti-fall {
      0% {
        transform: translateY(0) rotate(0) scale(1);
        opacity: 1;
      }
      
      25% {
        transform: translateY(25vh) rotate(90deg) scale(0.9);
        opacity: 0.8;
      }
      
      50% {
        transform: translateY(50vh) rotate(180deg) scale(0.8);
        opacity: 0.6;
      }
      
      75% {
        transform: translateY(75vh) rotate(270deg) scale(0.7);
        opacity: 0.4;
      }
      
      100% {
        transform: translateY(100vh) rotate(360deg) scale(0.6);
        opacity: 0;
      }
    }
  `)

    // 修改下载图片的文件名生成逻辑
    function getImageFileName(index, bookName, isbn, extension, method) {
        let prefix
        switch (method) {
            case 'direct':
                prefix = '完美去水印'
                break
            case WATERMARK_REMOVAL_METHOD.CANVAS_COVER:
                prefix = '纯色覆盖'
                break
            case WATERMARK_REMOVAL_METHOD.CUSTOM_WATERMARK:
                prefix = '自定义水印'
                break
            case WATERMARK_REMOVAL_METHOD.CROP_BOTTOM:
                prefix = '裁剪底部'
                break
            default:
                prefix = '未知方式'
        }
        return `${prefix}_${bookName.trim()}-${isbn.trim()}-${index + 1}.${extension || 'jpg'}`
    }

    // 修改下载函数中的文件名生成部分
    function downloadImage(url, isRetry = false, isOriginal = false) {
        let method = isOriginal ? 'original' :
            isRetry ? currentMethod :
                'direct'

        const filename = getImageFileName(index, bookName, isbn, extension, method)

        console.log('开始下载图片:', {
            url,
            filename,
            isRetry,
            isOriginal,
            currentProgress: `${directSuccessCount + canvasSuccessCount + originalImageCount + failCount + 1}/${images.length}`
        })

        GM_download({
            url,
            name: filename,
            onprogress: (event) => {
                downloadButton.innerText = `Downloading...(${index + 1}/${images.length})`
            },
            onload: () => {
                if (isOriginal) {
                    originalImageCount++
                    console.log(`原图下载成功 - 总进度: ${directSuccessCount + canvasSuccessCount + originalImageCount + failCount}/${images.length}`)
                } else if (isRetry) {
                    canvasSuccessCount++
                    console.log(`Canvas处理图片下载成功 - 总进度: ${directSuccessCount + canvasSuccessCount + originalImageCount + failCount}/${images.length}`)
                } else {
                    directSuccessCount++
                    console.log(`直接去水印下载成功 - 总进度: ${directSuccessCount + canvasSuccessCount + originalImageCount + failCount}/${images.length}`)
                }

                // 检查是否所有图片都处理完成
                if (directSuccessCount + canvasSuccessCount + originalImageCount + failCount === images.length) {
                    console.log('所有图片处理完成:', {
                        直接去水印成功: directSuccessCount,
                        Canvas处理成功: canvasSuccessCount,
                        原图下载: originalImageCount,
                        失败: failCount
                    })
                    updateDownloadButton()
                    updateDownloadCount(downloadCount + directSuccessCount + canvasSuccessCount + originalImageCount)

                    // 检查是否需要显示捐赠弹窗
                    if ((downloadCount % 100 === 0 && downloadCount !== 0 && !donationPopupShown) || (downloadCount > 1000 && !donationPopupShown)) {
                        showDonationPopup()
                    }
                }
            },
            onerror: async (error) => {
                // 第一次下载失败，尝试Canvas处理
                if (!isRetry && !isOriginal) {
                    console.log('无水印链接下载失败，尝试Canvas处理...', error)
                    try {
                        const processedImageUrl = await removeWatermarkWithCanvas(imageUrl)
                        downloadImage(processedImageUrl, true, false)
                    } catch (canvasError) {
                        console.log('Canvas处理失败，降级到原图下载:', canvasError)
                        downloadImage(imageUrl, true, true)
                    }
                }
                // Canvas处理后下载失败，尝试原图
                else if (isRetry && !isOriginal) {
                    console.log('Canvas处理图片下载失败，降级到原图下载:', error)
                    downloadImage(imageUrl, true, true)
                }
                // 所有尝试都失败
                else {
                    failCount++
                    console.error('图片下载完全失败:', error)
                    if (directSuccessCount + canvasSuccessCount + originalImageCount + failCount === images.length) {
                        updateDownloadButton()
                    }
                }
            }
        })
    }

    // 添加开发服务广告弹窗
    function showDevServicePopup() {
        const overlay = document.createElement('div')
        overlay.className = 'overlay'
        overlay.style.zIndex = '10003' // 确保在其他弹窗之上
        document.body.appendChild(overlay)

        const devPopup = document.createElement('div')
        devPopup.className = 'dev-service-popup'
        devPopup.innerHTML = `
      <div class="dev-service-header">
        <h3>专业软件定制开发服务</h3>
        <button class="close-button">×</button>
      </div>
      <div class="dev-service-body">
        <div class="service-sections">
          <div class="service-intro">
            <h4>🌟 服务范围</h4>
            <ul>
              <li>浏览器脚本工具开发</li>
              <li>数据采集爬虫开发</li>
              <li>RPA自动化流程开发</li>
              <li>网站建设与软件小程序开发</li>
              <li>其他定制化开发需求</li>
            </ul>
          </div>
          <div class="service-intro">
            <h4>💪 为什么选择我们</h4>
            <ul>
              <li>专业技术团队，经验丰富</li>
              <li>一对一需求对接，快速响应</li>
              <li>合理报价，质量保证</li>
              <li>交付及时，售后无忧</li>
            </ul>
          </div>
        </div>
        <div class="contact-info">
          <div class="contact-qr">
            <img src="https://greasyfork.s3.us-east-2.amazonaws.com/lp9hdyffstt0wpz2ub39gw9p6srr" alt="联系方式">
            <p>微信号: Byte4Me</p>
          </div>
          <p class="contact-note">扫码或添加微信咨询</p>
        </div>
      </div>
    `
        document.body.appendChild(devPopup)

        const closeBtn = devPopup.querySelector('.close-button')
        closeBtn.onclick = () => {
            devPopup.remove()
            overlay.remove()
        }

        overlay.onclick = () => {
            devPopup.remove()
            overlay.remove()
        }
    }

    // 添加开发服务弹窗样式
    GM_addStyle(`
    .dev-service-popup {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 30px;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      z-index: 10004;
      max-width: 800px;
      width: 90%;
    }

    .dev-service-header {
      position: relative;
      text-align: center;
      margin-bottom: 25px;
      padding-bottom: 15px;
      border-bottom: 2px solid #f0f2f5;
    }

    .dev-service-header h3 {
      margin: 0;
      font-size: 24px;
      color: #2c3e50;
      font-weight: 600;
    }

    .close-button {
      position: absolute;
      top: -10px;
      right: -10px;
      width: 30px;
      height: 30px;
      border: none;
      background: #dc3545;
      border-radius: 50%;
      font-size: 20px;
      color: white;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-button:hover {
      background: #c82333;
      transform: scale(1.1) rotate(90deg);
      box-shadow: 0 4px 12px rgba(220, 53, 69, 0.6);
    }

    .service-sections {
      display: flex;
      gap: 40px;
      margin-bottom: 30px;
      padding: 20px;
      background: #f8fafc;
      border-radius: 12px;
    }

    .service-intro {
      flex: 1;
      padding: 20px;
      background: white;
      border-radius: 10px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
    }

    .service-intro h4 {
      color: #2c3e50;
      margin: 0 0 15px;
      font-size: 18px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .service-intro ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .service-intro li {
      padding: 8px 0 8px 24px;
      position: relative;
      color: #34495e;
      font-size: 15px;
      line-height: 1.5;
    }

    .service-intro li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #3498db;
      font-weight: bold;
    }

    .contact-info {
      text-align: center;
      padding-top: 20px;
      border-top: 2px solid #f0f2f5;
    }

    .contact-qr {
      margin-bottom: 15px;
    }

    .contact-qr img {
      max-width: 180px;
      border-radius: 10px;
      margin-bottom: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transition: transform 0.3s ease;
    }

    .contact-qr img:hover {
      transform: scale(1.05);
    }

    .contact-qr p {
      margin: 5px 0;
      color: #2c3e50;
      font-weight: 600;
      font-size: 16px;
    }

    .contact-note {
      color: #7f8c8d;
      font-size: 14px;
      margin: 0;
    }

    @media (max-width: 768px) {
      .service-sections {
        flex-direction: column;
        gap: 20px;
      }
      
      .dev-service-popup {
        padding: 20px;
      }
      
      .service-intro {
        padding: 15px;
      }
    }
  `)

})()
