const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const bootstrapData = require('./config/bootstrap');

const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const adminRoutes = require('./routes/adminRoutes');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

let initializationPromise;

const initialize = async () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters');
  }
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI must be configured');
  }
  await connectDB();
  await bootstrapData();
};

app.use(async (req, res, next) => {
  try {
    initializationPromise ||= initialize();
    await initializationPromise;
    next();
  } catch (error) {
    console.error(`Server startup failed: ${error.message}`);
    res.status(500).json({ message: 'Server configuration error' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/admin', adminRoutes);

if (require.main === module) {
  initialize()
    .then(() => {
      app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch((error) => {
      console.error(`Server startup failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = app;