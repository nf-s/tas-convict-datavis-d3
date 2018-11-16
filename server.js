const express = require('express');

const app = express();

app.use('/', express.static('public/static', { index: ['index.html', 'index.htm'] }));
app.use('/dist', express.static('public/dist'));

app.listen(3000);