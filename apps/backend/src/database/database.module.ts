import { Module, Global } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export const DATABASE_CONNECTION = "DATABASE_CONNECTION";

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      useFactory: async (configService: ConfigService) => {
        const connectionString =
          configService.get<string>("DATABASE_URL") ||
          "postgresql://postgres:password@localhost:5432/nestjs_app";

        const client = postgres(connectionString);
        return drizzle(client, { schema });
      },
      inject: [ConfigService],
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}
