require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const connectDB = require('./config/db');
const swaggerDocument = require('./config/swagger');
const gatewayRoutes = require('./routes/gateway.routes');

const app = express();

connectDB();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'Aegis-AI Semantic Gateway',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/v1', gatewayRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Aegis-AI Gateway running on http://localhost:${PORT}`);
  console.log(`Interactive Swagger Docs available at http://localhost:${PORT}/api-docs`);
});
