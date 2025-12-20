import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Enable CORS for both local development and production
  app.enableCors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://frontend-production-74d7.up.railway.app", // Your Railway frontend
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"],
    credentials: true,
  });

  // Set global prefix for all routes
  app.setGlobalPrefix("api");

  // 2. Bind to 0.0.0.0 for Railway compatibility
  // Railway assigns a dynamic port via process.env.PORT
  const port = process.env.PORT || 3001;
  
  await app.listen(port, "0.0.0.0");

  console.log(`🚀 Backend server running on port ${port}`);
  console.log(`📚 API available at /api`);
}

bootstrap();