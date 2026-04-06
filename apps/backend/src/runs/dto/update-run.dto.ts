// apps/backend/src/runs/dto/update-run.dto.ts
import { IsString, IsOptional, IsNumber, IsInt, Min } from 'class-validator';

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

  @IsOptional()
  @IsInt()
  @Min(0)
  lower_bound_idx?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  upper_bound_idx?: number;
}