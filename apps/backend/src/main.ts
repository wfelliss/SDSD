import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend requests
  app.enableCors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  });

  // Set global prefix for all routes
  app.setGlobalPrefix("api");

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 Backend server running on http://localhost:${port}`);
  console.log(`📚 API available at http://localhost:${port}/api`);
}

bootstrap();
