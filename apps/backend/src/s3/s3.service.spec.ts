import { ConfigService } from '@nestjs/config';
import { Readable } from 'node:stream';
import { S3Service } from './s3.service';

describe('S3Service', () => {
  let mockConfig: Partial<ConfigService>;
  let service: S3Service;
  let mockClient: any;
  let mockFile: any;

  beforeEach(() => {
    mockConfig = {
      get: jest.fn((key: string, fallback?: any) => {
        if (key === 'AWS_ACCESS_KEY_ID') return 'AKIA';
        if (key === 'AWS_SECRET_ACCESS_KEY') return 'SECRET';
        if (key === 'AWS_S3_BUCKET') return 'my-bucket';
        if (key === 'AWS_REGION') return 'us-east-1';
        return fallback;
      }),
    };

    service = new S3Service(mockConfig as ConfigService);

    // Create a reusable mock file object
    mockFile = {
      exists: jest.fn(),
      arrayBuffer: jest.fn(),
      json: jest.fn(),
      stream: jest.fn(),
      delete: jest.fn(),
      presign: jest.fn(),
      type: 'application/json',
      size: 123,
    };

    mockClient = {
      file: jest.fn().mockReturnValue(mockFile),
      list: jest.fn(),
      write: jest.fn(),
    };

    // replace the private s3Client with our mock
    (service as any).s3Client = mockClient;
  });

  afterEach(() => jest.resetAllMocks());

  it('constructor throws when missing config values', () => {
    const badConf = { get: () => undefined } as unknown as ConfigService;
    expect(() => new S3Service(badConf)).toThrow('Missing AWS Configuration');
  });

  it('handleError logs and rethrows AggregateError', () => {
    const agg = new AggregateError([new Error('one'), new Error('two')], 'agg');
    const spy = jest.spyOn((service as any).logger, 'error');

    expect(() => (service as any).handleError('ops', 'k', agg)).toThrow(agg);
    expect(spy).toHaveBeenCalled();
  });

  it('objectExists returns boolean when exists resolves', async () => {
    mockFile.exists.mockResolvedValue(true);

    const res = await service.objectExists('k');
    expect(res).toBe(true);
    expect(mockClient.file).toHaveBeenCalledWith('k');

    mockFile.exists.mockResolvedValue(false);
    const res2 = await service.objectExists('k');
    expect(res2).toBe(false);
  });

  it('objectExists rethrows and logs AggregateError', async () => {
    const agg = new AggregateError([new Error('a')], 'agg');
    mockFile.exists.mockRejectedValue(agg);
    const spy = jest.spyOn((service as any).logger, 'error');

    await expect(service.objectExists('k')).rejects.toThrow(agg);
    expect(spy).toHaveBeenCalled();
  });

  it('getFile returns a Buffer from arrayBuffer', async () => {
    const buf = Buffer.from('hello');
    mockFile.arrayBuffer.mockResolvedValue(buf.buffer);

    const res = await service.getFile('k');
    expect(res).toEqual(Buffer.from('hello'));
    expect(mockClient.file).toHaveBeenCalledWith('k');
  });

  it('getFileAsJson returns parsed JSON', async () => {
    const obj = { a: 1 };
    mockFile.json.mockResolvedValue(obj);

    const res = await service.getFileAsJson('k');
    expect(res).toEqual(obj);
    expect(mockClient.file).toHaveBeenCalledWith('k');
  });

  it('listFiles maps contents to keys', async () => {
    mockClient.list.mockResolvedValue({ contents: [{ key: 'a' }, { key: 'b' }] });

    const res = await service.listFiles('prefix');
    expect(res).toEqual(['a', 'b']);
    expect(mockClient.list).toHaveBeenCalledWith({ prefix: 'prefix' });
  });

  it('uploadBuffer calls write with type', async () => {
    mockClient.write.mockResolvedValue(undefined);
    const buf = Buffer.from('x');

    await service.uploadBuffer('k', buf, 'application/octet-stream');
    expect(mockClient.write).toHaveBeenCalledWith('k', buf, { type: 'application/octet-stream' });
  });

  it('uploadFile calls write with data', async () => {
    mockClient.write.mockResolvedValue(undefined);
    await service.uploadFile('k', 'data');
    expect(mockClient.write).toHaveBeenCalledWith('k', 'data');
  });

  it('deleteFile calls file().delete', async () => {
    mockFile.delete.mockResolvedValue(undefined);

    await service.deleteFile('k');
    expect(mockClient.file).toHaveBeenCalledWith('k');
    expect(mockFile.delete).toHaveBeenCalled();
  });

  it('getSignedUrl calls presign and returns url', async () => {
    mockFile.presign.mockResolvedValue('https://signed');

    const res = await service.getSignedUrl('k', 100);
    expect(res).toBe('https://signed');
    expect(mockClient.file).toHaveBeenCalledWith('k');
    expect(mockFile.presign).toHaveBeenCalledWith({ expiresIn: 100 });
  });

  it('getFileStream converts web stream to node Readable and returns metadata', async () => {
    // stub Readable.fromWeb to return a node Readable
    const nodeStream = new Readable({ read() { this.push(null); } });
    const spyFromWeb = jest.spyOn(Readable as any, 'fromWeb').mockReturnValue(nodeStream);

    // provide a dummy web stream value (content ignored because we mocked fromWeb)
    mockFile.stream.mockReturnValue({});

    const res = await service.getFileStream('https://bucket.s3.amazonaws.com/path/file');

    expect(mockClient.file).toHaveBeenCalledWith('path/file');
    expect(spyFromWeb).toHaveBeenCalled();
    expect(res.stream).toBe(nodeStream);
    expect(res.contentType).toBe(mockFile.type);
    expect(res.contentLength).toBe(mockFile.size);
  });
});