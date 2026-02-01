import { RunsController } from './runs.controller';

describe('RunsController', () => {
  let controller: RunsController;
  let mockRunsService: any;

  beforeEach(() => {
    mockRunsService = {
      getAllRuns: jest.fn(),
      getRunById: jest.fn(),
      createRun: jest.fn(),
      updateRun: jest.fn(),
    };

    controller = new RunsController(mockRunsService);
  });

  afterEach(() => jest.resetAllMocks());

  it('getAllRuns delegates to service', async () => {
    mockRunsService.getAllRuns.mockResolvedValue([{ id: 1 }]);
    const res = await controller.getAllRuns();
    expect(mockRunsService.getAllRuns).toHaveBeenCalled();
    expect(res).toEqual([{ id: 1 }]);
  });

  it('getRunById delegates with numeric conversion', async () => {
    mockRunsService.getRunById.mockResolvedValue({ id: 5 });
    const res = await controller.getRunById('5' as any);
    expect(mockRunsService.getRunById).toHaveBeenCalledWith(5);
    expect(res).toEqual({ id: 5 });
  });

  it('createRun forwards body to service', async () => {
    const body = { srcPath: 'x' };
    mockRunsService.createRun.mockResolvedValue({ id: 1, ...body });
    const res = await controller.createRun(body as any);
    expect(mockRunsService.createRun).toHaveBeenCalledWith(body);
    expect(res).toEqual({ id: 1, ...body });
  });

  it('updateRun forwards id and body to service', async () => {
    const body = { comments: 'ok' };
    mockRunsService.updateRun.mockResolvedValue({ id: 2, comments: 'ok' });
    const res = await controller.updateRun(2 as any, body as any);
    expect(mockRunsService.updateRun).toHaveBeenCalledWith(2, body);
    expect(res).toEqual({ id: 2, comments: 'ok' });
  });
});
