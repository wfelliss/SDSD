import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import cookieParser from "cookie-parser";



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
// set up cookies for remembering login

  // Set global prefix for all routes
  app.setGlobalPrefix("api");
  app.use(cookieParser())

  // 2. Bind to 0.0.0.0 for Railway compatibility
  const port = process.env.PORT || 3001;
  
  await app.listen(port, "0.0.0.0");

  console.log(`🚀 Backend server running on port ${port}`);
  console.log(`📚 API available at /api`);
}

bootstrap();