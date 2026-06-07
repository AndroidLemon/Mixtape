const express = require('express');
const { createGenerateRouter } = require('./routes/generate');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(createGenerateRouter());

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

module.exports = app;
