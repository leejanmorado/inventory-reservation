import 'dotenv/config';
import app from '@/app';

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => {
  console.info(`Server running on http://localhost:${PORT}`);
  console.info(`Swagger UI:  http://localhost:${PORT}/docs`);
  console.info(`OpenAPI JSON: http://localhost:${PORT}/openapi.json`);
});
