import { Test, TestingModule } from '@nestjs/testing';
import { S3Controller } from './s3.controller';
import { S3Service } from './s3.service';
import { ProfilesService } from '../profiles/profiles.service';
import { RunsService } from '../runs/runs.service';
import { ConfigService } from '@nestjs/config';

describe('S3Controller', () => {
  let controller: S3Controller;

  const mockS3Service = {
    listFiles: jest.fn(),
    getFileStream: jest.fn(),
    uploadBuffer: jest.fn(),
    objectExists: jest.fn(),
    deleteFile: jest.fn(),
  };

  const mockRunsService = {
    findBySrcPath: jest.fn(),
    createRun: jest.fn(),
  };

  const mockProfilesService = {
    create: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      if (key === 'AWS_S3_BUCKET') return 'test-bucket';
      if (key === 'AWS_REGION') return 'us-east-1';
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [S3Controller],
      providers: [
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
        {
          provide: RunsService,
          useValue: mockRunsService,
        },
        {
          provide: ProfilesService,
          useValue: mockProfilesService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<S3Controller>(S3Controller);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});