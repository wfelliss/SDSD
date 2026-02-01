import { BadRequestException } from '@nestjs/common';
import { RunsService } from './runs.service';

describe('RunsService', () => {
  let service: RunsService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      query: {
        runs: {
          findMany: jest.fn(),
          findFirst: jest.fn(),
        },
      },
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
    };

    // chain: select().from().where()
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn(),
      }),
    });

    // chain: insert(...).values(...).returning()
    mockDb.insert.mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn(),
      }),
    });

    // chain: update(...).set(...).where(...).returning()
    mockDb.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn(),
        }),
      }),
    });

    service = new RunsService(mockDb as any);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getAllRuns returns results from db.query.runs.findMany', async () => {
    const rows = [{ id: 1 }, { id: 2 }];
    mockDb.query.runs.findMany.mockResolvedValue(rows);

    const res = await service.getAllRuns();

    expect(mockDb.query.runs.findMany).toHaveBeenCalled();
    expect(res).toEqual(rows);
  });

  it('getRunById returns run from findFirst', async () => {
    const row = { id: 42, title: 'a' };
    mockDb.query.runs.findFirst.mockResolvedValue(row);

    const res = await service.getRunById(42);

    expect(mockDb.query.runs.findFirst).toHaveBeenCalled();
    expect(res).toEqual(row);
  });

  it('findBySrcPath returns found row or null', async () => {
    const row = { id: 1, srcPath: 'a' };
    mockDb.select().from().where.mockResolvedValue([row]);

    const res = await service.findBySrcPath('a');
    expect(res).toEqual(row);

    mockDb.select().from().where.mockResolvedValue([]);
    const res2 = await service.findBySrcPath('b');
    expect(res2).toBeNull();
  });

  it('createRun throws when run with srcPath exists', async () => {
    const data = { srcPath: 'x', length: 10 } as any;
    jest.spyOn(service, 'findBySrcPath').mockResolvedValue({ id: 1 } as any);

    await expect(service.createRun(data)).rejects.toThrow('Run with this srcPath already exists');
  });

  it('createRun inserts and returns created row', async () => {
    const data = { srcPath: 'unique', length: 10 } as any;
    jest.spyOn(service, 'findBySrcPath').mockResolvedValue(null);

    const inserted = { id: 99, ...data };
    mockDb.insert().values().returning.mockResolvedValue([inserted]);

    const res = await service.createRun(data);

    expect(mockDb.insert).toHaveBeenCalled();
    expect(res).toEqual(inserted);
  });

  it('updateRun throws BadRequestException when updates empty', async () => {
    await expect(service.updateRun(1, {} as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updateRun returns updated record when present', async () => {
    const updated = { id: 1, comments: 'ok' };
    mockDb.update().set().where().returning.mockResolvedValue([updated]);

    const res = await service.updateRun(1, { comments: 'ok' });

    expect(res).toEqual(updated);
  });

  it('updateRun returns null when no rows updated', async () => {
    mockDb.update().set().where().returning.mockResolvedValue([]);

    const res = await service.updateRun(1, { comments: 'none' });

    expect(res).toBeNull();
  });
});
