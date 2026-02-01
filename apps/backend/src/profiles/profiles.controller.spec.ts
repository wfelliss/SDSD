import { Test, TestingModule } from '@nestjs/testing';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';

describe('ProfilesController', () => {
  let controller: ProfilesController;
  let service: ProfilesService;

  const mockProfilesService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfilesController],
      providers: [
        {
          provide: ProfilesService,
          useValue: mockProfilesService,
        },
      ],
    }).compile();

    controller = module.get<ProfilesController>(ProfilesController);
    service = module.get<ProfilesService>(ProfilesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all profiles', async () => {
      const result = [
        { id: 1, name: 'Profile 1' },
        { id: 2, name: 'Profile 2' },
      ];
      mockProfilesService.findAll.mockResolvedValue(result);

      expect(await controller.findAll()).toEqual(result);
      expect(mockProfilesService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a profile by id', async () => {
      const result = { id: 1, name: 'Profile 1' };
      mockProfilesService.findOne.mockResolvedValue(result);

      expect(await controller.findOne(1)).toBe(result);
      expect(mockProfilesService.findOne).toHaveBeenCalledWith(1);
    });

    it('should return null if profile not found', async () => {
      mockProfilesService.findOne.mockResolvedValue(null);

      expect(await controller.findOne(999)).toBeNull();
      expect(mockProfilesService.findOne).toHaveBeenCalledWith(999);
    });
  });

  describe('create', () => {
    it('should create a new profile', async () => {
      const profileData = {
        name: 'New Profile',
        front_min: 0,
        front_max: 100,
        back_min: 0,
        back_max: 100,
      };
      const result = { id: 1, ...profileData };
      mockProfilesService.create.mockResolvedValue(result);

      expect(await controller.create(profileData)).toBe(result);
      expect(mockProfilesService.create).toHaveBeenCalledWith(profileData);
    });
  });

  describe('update', () => {
    it('should update a profile', async () => {
      const profileData = {
        name: 'Updated Profile',
        front_min: 10,
        front_max: 90,
      };
      const result = { id: 1, ...profileData };
      mockProfilesService.update.mockResolvedValue(result);

      expect(await controller.update(1, profileData)).toBe(result);
      expect(mockProfilesService.update).toHaveBeenCalledWith(1, profileData);
    });
  });

  describe('partialUpdate', () => {
    it('should partially update a profile with valid data', async () => {
      const profileData = {
        front_min: 10,
        front_max: 90,
        back_min: 5,
        back_max: 95,
      };
      const result = { id: 1, ...profileData };
      mockProfilesService.update.mockResolvedValue(result);

      expect(await controller.partialUpdate(1, profileData)).toBe(result);
      expect(mockProfilesService.update).toHaveBeenCalledWith(1, profileData);
    });

    it('should throw error when no valid fields to update', async () => {
      const profileData = {};

      await expect(controller.partialUpdate(1, profileData)).rejects.toThrow(
        'No valid fields to update.'
      );
      expect(mockProfilesService.update).not.toHaveBeenCalled();
    });

    it('should throw error when front_min is negative', async () => {
      const profileData = {
        front_min: -1,
        front_max: 100,
        back_min: 0,
        back_max: 100,
      };

      await expect(controller.partialUpdate(1, profileData)).rejects.toThrow(
        'Profile range values must be non-negative.'
      );
      expect(mockProfilesService.update).not.toHaveBeenCalled();
    });

    it('should throw error when front_max is negative', async () => {
      const profileData = {
        front_min: 0,
        front_max: -1,
        back_min: 0,
        back_max: 100,
      };

      await expect(controller.partialUpdate(1, profileData)).rejects.toThrow(
        'Profile range values must be non-negative.'
      );
      expect(mockProfilesService.update).not.toHaveBeenCalled();
    });

    it('should throw error when back_min is negative', async () => {
      const profileData = {
        front_min: 0,
        front_max: 100,
        back_min: -1,
        back_max: 100,
      };

      await expect(controller.partialUpdate(1, profileData)).rejects.toThrow(
        'Profile range values must be non-negative.'
      );
      expect(mockProfilesService.update).not.toHaveBeenCalled();
    });

    it('should throw error when back_max is negative', async () => {
      const profileData = {
        front_min: 0,
        front_max: 100,
        back_min: 0,
        back_max: -1,
      };

      await expect(controller.partialUpdate(1, profileData)).rejects.toThrow(
        'Profile range values must be non-negative.'
      );
      expect(mockProfilesService.update).not.toHaveBeenCalled();
    });

    it('should throw error when front_max is less than front_min', async () => {
      const profileData = {
        front_min: 100,
        front_max: 50,
        back_min: 0,
        back_max: 100,
      };

      await expect(controller.partialUpdate(1, profileData)).rejects.toThrow(
        'front_max must be greater than or equal to front_min.'
      );
      expect(mockProfilesService.update).not.toHaveBeenCalled();
    });

    it('should throw error when back_max is less than back_min', async () => {
      const profileData = {
        front_min: 0,
        front_max: 100,
        back_min: 100,
        back_max: 50,
      };

      await expect(controller.partialUpdate(1, profileData)).rejects.toThrow(
        'back_max must be greater than or equal to back_min.'
      );
      expect(mockProfilesService.update).not.toHaveBeenCalled();
    });

    it('should allow front_max equal to front_min', async () => {
      const profileData = {
        front_min: 50,
        front_max: 50,
        back_min: 0,
        back_max: 100,
      };
      const result = { id: 1, ...profileData };
      mockProfilesService.update.mockResolvedValue(result);

      expect(await controller.partialUpdate(1, profileData)).toBe(result);
      expect(mockProfilesService.update).toHaveBeenCalledWith(1, profileData);
    });

    it('should allow back_max equal to back_min', async () => {
      const profileData = {
        front_min: 0,
        front_max: 100,
        back_min: 50,
        back_max: 50,
      };
      const result = { id: 1, ...profileData };
      mockProfilesService.update.mockResolvedValue(result);

      expect(await controller.partialUpdate(1, profileData)).toBe(result);
      expect(mockProfilesService.update).toHaveBeenCalledWith(1, profileData);
    });
  });

  describe('remove', () => {
    it('should remove a profile and return success true', async () => {
      mockProfilesService.remove.mockResolvedValue(true);

      const result = await controller.remove(1);
      expect(result).toEqual({ success: true });
      expect(mockProfilesService.remove).toHaveBeenCalledWith(1);
    });

    it('should return success false if profile not found', async () => {
      mockProfilesService.remove.mockResolvedValue(false);

      const result = await controller.remove(999);
      expect(result).toEqual({ success: false });
      expect(mockProfilesService.remove).toHaveBeenCalledWith(999);
    });
  });
});