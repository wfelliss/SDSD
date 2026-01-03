import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { S3Service } from './s3.service';
import { S3Controller } from './s3.controller';
import { RunsModule } from '../runs/runs.module';
import { ProfilesModule } from 'src/profiles/profiles.module';

@Module({
  imports: [ConfigModule, RunsModule, ProfilesModule],
  controllers: [S3Controller],
  providers: [S3Service],
  exports: [S3Service],
})
export class S3Module {}
