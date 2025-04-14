const path = require('path');
const express = require('express');
const isDev = process.env.NODE_ENV === 'development';

const app = express();

if (isDev) {
    console.log('Running in development mode');
} else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'), { dotfiles: 'allow' });
    });
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});