import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { BunErrorFilter } from "./bun-error.filter";
import { ValidationPipe } from "@nestjs/common/pipes/validation.pipe";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Enable CORS for local, Railway-default, and custom domains
  app.enableCors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://frontend-production-74d7.up.railway.app",
      "https://www.sd-squared.co.uk",
      "https://sd-squared.co.uk",     
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"],
    credentials: true,
  });

  // Set global prefix for all routes
  app.setGlobalPrefix("api");

  // 2. Bind to 0.0.0.0 for Railway compatibility
  const port = process.env.PORT || 3001;

  app.useGlobalFilters(new BunErrorFilter());

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Strip properties that don't have decorators
    forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
    transform: true, // Automatically transform payloads to DTO instances
  }));
  
  await app.listen(port, "0.0.0.0");

  console.log(`🚀 Backend server running on port ${port}`);
  console.log(`📚 API available at /api`);
}

bootstrap();