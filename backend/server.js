const app = require('./src/app');
const connectDB = require('./src/config/database');
const ensureDefaults = require('./src/config/ensureDefaults');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  await ensureDefaults();
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT} [${process.env.NODE_ENV}]`);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
  process.exit(1);
});
