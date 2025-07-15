import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import cert2Svg from './static/cert2.svg';
import './App.css';

function App() {
  const [name, setName] = useState('鲍宇涵');
  const [planeName, setPlaneName] = useState('B737MAX');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [svgContent, setSvgContent] = useState('');
  const [isA4Preview, setIsA4Preview] = useState(false);
  const svgRef = useRef(null);

  // 加载SVG文件
  useEffect(() => {
    // 首先尝试从全局变量加载（用于独立HTML版本）
    if (window.SVG_CONTENT) {
      setSvgContent(window.SVG_CONTENT);
    } else {
      // 尝试从导入的SVG文件加载
      if (cert2Svg) {
        // 如果是文件路径，则fetch获取内容
        fetch(cert2Svg)
          .then(response => response.text())
          .then(data => {
            setSvgContent(data);
            console.log('SVG loaded successfully from imported file');
          })
          .catch(error => {
            console.warn('Failed to load from imported SVG, trying alternative paths:', error);
            // 备用方案：尝试多个路径
            loadSvgFromPaths();
          });
      } else {
        // 备用方案：尝试多个路径
        loadSvgFromPaths();
      }
    }

    // 备用加载方法
    const loadSvgFromPaths = async () => {
      const svgPaths = [
        '/static/cert2.svg',  // 生产环境构建后的路径
        '/cert2.svg',         // public 目录的路径（备用）
        './static/cert2.svg'  // 相对路径（备用）
      ];
      
      for (const path of svgPaths) {
        try {
          const response = await fetch(path);
          if (response.ok) {
            const data = await response.text();
            setSvgContent(data);
            console.log(`SVG loaded successfully from: ${path}`);
            return;
          }
        } catch (error) {
          console.warn(`Failed to load SVG from ${path}:`, error);
        }
      }
      console.error('Failed to load SVG from all paths');
    };
  }, []);

  // 更新SVG中的内容
  const updateSvgContent = (svgText, newName, newPlaneName, newDate) => {
    let updatedSvg = svgText;

    // 更新姓名 (user-name class)
    const nameRegex = /(<text[^>]*class="user-name"[^>]*>)[^<]*(<\/text>)/g;
    updatedSvg = updatedSvg.replace(nameRegex, `$1${newName}$2`);

    // 更新飞机型号 (plane-name class)
    const planeRegex = /(<tspan[^>]*class="plane-name"[^>]*>)[^<]*(<\/tspan>)/g;
    updatedSvg = updatedSvg.replace(planeRegex, `$1${newPlaneName}$2`);

    // 更新中文日期 (chinese-date class)
    const chineseDateStr = formatChineseDate(newDate);
    const chineseDateRegex = /(<tspan[^>]*class="chinese-date"[^>]*>)[^<]*(<\/tspan>)/g;
    updatedSvg = updatedSvg.replace(chineseDateRegex, `$1${chineseDateStr}$2`);

    // 更新英文日期 (english-date class)
    const englishDateStr = formatEnglishDate(newDate);
    const englishDateRegex = /(<tspan[^>]*class="english-date"[^>]*>)[^<]*(<\/tspan>)/g;
    updatedSvg = updatedSvg.replace(englishDateRegex, `$1${englishDateStr}$2`);

    return updatedSvg;
  };

  // 格式化中文日期
  const formatChineseDate = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
  };

  // 格式化英文日期
  const formatEnglishDate = (date) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const year = date.getFullYear();
    const month = months[date.getMonth()];
    const day = date.getDate();

    // 添加序数后缀
    const getOrdinalSuffix = (day) => {
      if (day >= 11 && day <= 13) return 'th';
      switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };

    return `${month} ${day}${getOrdinalSuffix(day)}, ${year}`;
  };

  // 获取更新后的SVG内容
  const getUpdatedSvg = () => {
    if (!svgContent) return '';
    let updatedSvg = updateSvgContent(svgContent, name, planeName, selectedDate);

    // 确保SVG有正确的A4比例属性
    // updatedSvg = updatedSvg.replace(
    //   /<svg([^>]*)>/,
    //   '<svg$1 preserveAspectRatio="xMidYMid meet" style="width: 100%; height: 100%;">'
    // );

    return updatedSvg;
  };

  // 打印证书
  const printCertificate = () => {
    window.print();
  };

  const exportToPDF = async () => {
    if (svgRef.current) {
      try {
        // 将SVG转换为Canvas
        const canvas = await html2canvas(svgRef.current, {
          backgroundColor: '#ffffff',
          scale: 2, // 提高分辨率
          useCORS: true
        });

        // 创建PDF
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        // 计算图片在PDF中的尺寸
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const width = imgWidth * ratio;
        const height = imgHeight * ratio;

        // 居中放置
        const x = (pdfWidth - width) / 2;
        const y = (pdfHeight - height) / 2;

        pdf.addImage(imgData, 'PNG', x, y, width, height);
      pdf.save(`certificate-${name}-${planeName}-${formatChineseDate(selectedDate)}.pdf`);
      } catch (error) {
        console.error('导出PDF时出错:', error);
        alert('导出PDF时出错，请重试。');
      }
    }
  };

  return (
    <div className="app">
      <div className="container">
        {/* 左侧：证书显示 */}
        <div className="certificate-container">
          <h2>证书预览</h2>

          <div className="preview-controls">
            <button
              className={`preview-toggle ${!isA4Preview ? 'active' : ''}`}
              onClick={() => setIsA4Preview(false)}
            >
              适应屏幕
            </button>
            <button
              className={`preview-toggle ${isA4Preview ? 'active' : ''}`}
              onClick={() => setIsA4Preview(true)}
            >
              A4实际尺寸
            </button>
          </div>

          <div className="certificate-preview-wrapper">
            <div
              className={`svg-container ${isA4Preview ? 'a4-preview' : ''}`}
              ref={svgRef}
              dangerouslySetInnerHTML={{ __html: getUpdatedSvg() }}
            />
          </div>
        </div>

        {/* 右侧：编辑面板 */}
        <div className="editor-container">
          <h2>编辑证书</h2>

          <div className="form-group">
            <label htmlFor="name">姓名：</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入姓名"
              className="name-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="planeName">飞机型号：</label>
            <input
              type="text"
              id="planeName"
              value={planeName}
              onChange={(e) => setPlaneName(e.target.value)}
              placeholder="请输入飞机型号"
              className="plane-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="date">证书日期：</label>
            <input
              type="date"
              id="date"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="date-input"
            />
          </div>

          <div className="preview-info">
            <h4>日期预览：</h4>
            <p><strong>中文日期：</strong>{formatChineseDate(selectedDate)}</p>
            <p><strong>英文日期：</strong>{formatEnglishDate(selectedDate)}</p>
          </div>

          <div className="action-buttons">
            <button
              onClick={exportToPDF}
              className="download-btn primary"
              disabled={!svgContent}
            >
              下载PDF证书
            </button>

            <button
              onClick={printCertificate}
              className="download-btn secondary"
              disabled={!svgContent}
            >
              打印证书
            </button>
          </div>

          <div className="instructions">
            <h3>使用说明：</h3>
            <ul>
              <li>在上方输入框中修改姓名和飞机型号</li>
              <li>选择证书颁发日期</li>
              <li>使用"适应屏幕"和"A4实际尺寸"切换预览模式</li>
              <li>左侧会实时显示更新后的证书</li>
              <li>点击"下载PDF证书"保存为A4尺寸PDF文件</li>
              <li>点击"打印证书"直接打印A4尺寸证书</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;