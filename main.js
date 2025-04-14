const path = require('path');
const express = require('express');
const isDev = process.env.NODE_ENV === 'development';

const app = express();
const open = require('open'); // 引入 open 模块

const port = process.env.PORT || 3000;
const serverUrl = `http://localhost:${port}`

if (isDev) {
    console.log('Running in development mode');
} else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'), {dotfiles: 'allow'});
    });
}

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    open(serverUrl); // 在开发模式下自动打开浏览器

});