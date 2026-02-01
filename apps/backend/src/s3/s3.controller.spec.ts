import { Test, TestingModule } from '@nestjs/testing';
import { S3Controller } from './s3.controller';
import { S3Service } from './s3.service';
import { ProfilesService } from '../profiles/profiles.service';
import { RunsService } from '../runs/runs.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { Readable } from 'stream';

describe('S3Controller', () => {
  let controller: S3Controller;
  let s3Service: jest.Mocked<S3Service>;
  let runsService: jest.Mocked<RunsService>;
  let profilesService: jest.Mocked<ProfilesService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [S3Controller],
      providers: [
        {
          provide: S3Service,
          useValue: {
            listFiles: jest.fn(),
            getFileStream: jest.fn(),
            uploadBuffer: jest.fn(),
            objectExists: jest.fn(),
            deleteFile: jest.fn(),
          },
        },
        {
          provide: RunsService,
          useValue: {
            findBySrcPath: jest.fn(),
            createRun: jest.fn(),
          },
        },
        {
          provide: ProfilesService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'AWS_S3_BUCKET') return 'test-bucket';
              if (key === 'AWS_REGION') return 'us-east-1';
              return null;
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<S3Controller>(S3Controller);
    s3Service = module.get(S3Service) as jest.Mocked<S3Service>;
    runsService = module.get(RunsService) as jest.Mocked<RunsService>;
    profilesService = module.get(ProfilesService) as jest.Mocked<ProfilesService>;
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listFiles', () => {
    it('should return a list of files', async () => {
      const mockFiles = [{ key: 'test.json' }] as any;
      s3Service.listFiles.mockResolvedValue(mockFiles);

      const result = await controller.listFiles('prefix');

      expect(s3Service.listFiles).toHaveBeenCalledWith('prefix');
      expect(result).toEqual({
        success: true,
        prefix: 'prefix',
        files: mockFiles,
        count: 1,
      });
    });
  });

  describe('getFile', () => {
    it('should stream the file if it exists', async () => {
      // Mock a readable stream
      const mockStream = new Readable();
      mockStream.push('file-content');
      mockStream.push(null);

      s3Service.getFileStream.mockResolvedValue({
        stream: mockStream as any,
        contentType: 'application/json',
        contentLength: 100,
      });

      const res = {
        setHeader: jest.fn(),
      } as unknown as Response;

      // Mock the pipe method on the stream to return the response
      const pipeSpy = jest.spyOn(mockStream, 'pipe').mockImplementation(() => res as any);

      await controller.getFile('path/to/file.json', res);

      expect(s3Service.getFileStream).toHaveBeenCalledWith('path/to/file.json');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(pipeSpy).toHaveBeenCalledWith(res);
    });

    it('should throw BadRequestException if path is missing', async () => {
      await expect(controller.getFile('', {} as Response)).rejects.toThrow(BadRequestException);
    });
  });

  describe('newRunFile', () => {
    const mockFile = {
      buffer: Buffer.from('col1,col2\n1,2\n3,4'), // minimal CSV content
      originalname: 'test_run.csv',
      size: 100,
    } as any;

    it('should process CSV, upload JSON, and create DB records successfully', async () => {
      const metadata = { run_name: 'Test Run', front_stroke: 100, rear_stroke: 100 };
      
      // Mocks for success flow
      s3Service.objectExists.mockResolvedValue(false); // Key is unique immediately
      profilesService.create.mockResolvedValue({ id: 1 } as any);
      runsService.createRun.mockResolvedValue({ id: 100 } as any);

      const result = await controller.newRunFile(mockFile, JSON.stringify(metadata));

      expect(s3Service.objectExists).toHaveBeenCalled();
      
      // Verify S3 upload was called with JSON content
      expect(s3Service.uploadBuffer).toHaveBeenCalledWith(
        expect.stringContaining('.json'), // filename should change to .json
        expect.any(Buffer),
        'application/json'
      );

      // Verify DB calls
      expect(profilesService.create).toHaveBeenCalled();
      expect(runsService.createRun).toHaveBeenCalledWith(expect.objectContaining({
        title: expect.any(String),
        profile: 1
      }));

      expect(result.success).toBe(true);
      expect(result.run).toEqual({ id: 100 });
    });

    it('should handle unique key generation if file already exists', async () => {
      // First call returns true (exists), second returns false (safe to use)
      s3Service.objectExists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      profilesService.create.mockResolvedValue({ id: 1 } as any);
      runsService.createRun.mockResolvedValue({ id: 100 } as any);

      await controller.newRunFile(mockFile, JSON.stringify({ run_name: 'duplicate' }));

      // Should have tried to upload with a suffix (e.g. duplicate-1.json)
      expect(s3Service.uploadBuffer).toHaveBeenCalledWith(
        expect.stringMatching(/duplicate-1\.json$/),
        expect.any(Buffer),
        'application/json'
      );
    });

    it('should rollback (delete S3 file) if DB creation fails', async () => {
      s3Service.objectExists.mockResolvedValue(false);
      profilesService.create.mockResolvedValue({ id: 1 } as any);
      
      // DB insert fails
      runsService.createRun.mockRejectedValue(new Error('DB Insert Failed'));

      const result = await controller.newRunFile(mockFile, '{}');

      // Verify rollback behavior
      expect(s3Service.deleteFile).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toContain('DB Insert Failed');
    });

    it('should fail gracefully if file is missing', async () => {
      await expect(controller.newRunFile(null as any)).rejects.toThrow(BadRequestException);
    });
  });
});