import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from '@/middleware/errorHandler';
import { generateOpenAPIDocument } from '@/openapi';
import v1Router from '@/routes/index';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/v1', v1Router);

const openApiDoc = generateOpenAPIDocument();

app.get('/openapi.json', (_req, res) => {
  res.json(openApiDoc);
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDoc));

app.use(errorHandler);

export default app;
