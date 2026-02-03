// apps/backend/src/runs/dto/update-run.dto.ts
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateRunDto {
  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsNumber()
  length?: number;

  @IsOptional()
  @IsString()
  location?: string;
}