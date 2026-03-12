import { Test, TestingModule } from '@nestjs/testing';
import { RunsController } from './runs.controller';
import { RunsService } from './runs.service';
import { AuthGuard } from 'src/auth/auth.guard';

describe('RunsController', () => {
  let controller: RunsController;
  let service: jest.Mocked<RunsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RunsController],
      providers: [
        {
          provide: RunsService,
          useValue: {
            getAllRuns: jest.fn(),
            getRunById: jest.fn(),
            createRun: jest.fn(),
            updateRun: jest.fn(),
          },
        },
      ],
    }).overrideGuard(AuthGuard)
    .useValue({ canActivate: () => true })
    .compile();

    controller = module.get<RunsController>(RunsController);
    // Cast to jest.Mocked to get access to .mockResolvedValue and other mock methods
    service = module.get(RunsService) as jest.Mocked<RunsService>;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('getAllRuns delegates to service', async () => {
    const mockData = [{ id: 1 }] as any;
    service.getAllRuns.mockResolvedValue(mockData);

    const res = await controller.getAllRuns();
    
    expect(service.getAllRuns).toHaveBeenCalled();
    expect(res).toEqual(mockData);
  });

  it('getRunById delegates with numeric conversion', async () => {
    service.getRunById.mockResolvedValue({ id: 5 } as any);

    // Using '5' (string) because controllers often receive strings from URL params
    const res = await controller.getRunById('5' as any);

    expect(service.getRunById).toHaveBeenCalledWith(5);
    expect(res).toEqual({ id: 5 });
  });

  it('createRun forwards body to service', async () => {
    const body = { srcPath: 'x' };
    service.createRun.mockResolvedValue({ id: 1, ...body } as any);

    const res = await controller.createRun(body as any);

    expect(service.createRun).toHaveBeenCalledWith(body);
    expect(res).toEqual({ id: 1, ...body });
  });

  it('updateRun forwards id and body to service', async () => {
    const body = { comments: 'ok' };
    service.updateRun.mockResolvedValue({ id: 2, comments: 'ok' } as any);

    const res = await controller.updateRun(2 as any, body as any);

    expect(service.updateRun).toHaveBeenCalledWith(2, body);
    expect(res).toEqual({ id: 2, comments: 'ok' });
  });
});