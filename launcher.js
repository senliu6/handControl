const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const url = require('url');

function openBrowser(url) {
  const start = process.platform === 'win32' ? 'start' : 'open';
  exec(`${start} ${url}`);
}

function handleError(error) {
  console.error('=== 启动失败 ===');
  console.error('错误信息：', error.message);
  console.error('堆栈信息：', error.stack);
  console.error('=============');
  console.log('按任意键退出...');
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', process.exit.bind(process, 0));
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

function startServer() {
  console.log('\n=== 启动服务 ===');
  const distPath = path.join(__dirname, 'dist');

  if (!fs.existsSync(distPath)) {
    handleError(new Error('dist 目录不存在，请先执行 npm run build'));
    return;
  }

  const server = http.createServer((req, res) => {
    let filePath = path.join(distPath, url.parse(req.url).pathname);
    
    // 处理根路径请求
    if (filePath === path.join(distPath, '/')) {
      filePath = path.join(distPath, 'index.html');
    }

    // 检查文件是否存在
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        res.writeHead(404);
        res.end('404 Not Found');
        return;
      }

      // 读取并发送文件
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end('Server Error');
          return;
        }

        const mimeType = getMimeType(filePath);
        res.writeHead(200, { 'Content-Type': mimeType });
        res.end(data);
      });
    });
  });

  const port = 3000;
  server.listen(port, '0.0.0.0', () => {
    const localUrl = `http://localhost:${port}`;
    console.log(`服务已启动，访问地址：${localUrl}`);
    setTimeout(() => openBrowser(localUrl), 2000);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      handleError(new Error(`端口 ${port} 已被占用`));
    } else {
      handleError(error);
    }
  });
}

process.on('uncaughtException', handleError);
process.on('unhandledRejection', handleError);

startServer();