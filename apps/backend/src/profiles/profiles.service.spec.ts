import { Test, TestingModule } from '@nestjs/testing';
import { ProfilesService } from './profiles.service';

describe('ProfilesService', () => {
  let service: ProfilesService;
  let mockDatabase: any;

  beforeEach(async () => {
    mockDatabase = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilesService,
        {
          provide: 'DATABASE_CONNECTION',
          useValue: mockDatabase,
        },
      ],
    }).compile();

    service = module.get<ProfilesService>(ProfilesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all profiles', async () => {
      const profilesData = [
        { id: 1, name: 'Profile 1', front_min: 0, front_max: 100, back_min: 0, back_max: 100 },
        { id: 2, name: 'Profile 2', front_min: 10, front_max: 90, back_min: 5, back_max: 95 },
      ];

      // Mock the entire chain
      mockDatabase.select.mockReturnValue({
        from: jest.fn().mockResolvedValue(profilesData),
      });

      const result = await service.findAll();

      expect(result).toEqual(profilesData);
      expect(mockDatabase.select).toHaveBeenCalled();
    });

    it('should return empty array when no profiles exist', async () => {
      mockDatabase.select.mockReturnValue({
        from: jest.fn().mockResolvedValue([]),
      });

      const result = await service.findAll();

      expect(result).toEqual([]);
      expect(mockDatabase.select).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a profile by id', async () => {
      const profile = { id: 1, name: 'Profile 1', front_min: 0, front_max: 100, back_min: 0, back_max: 100 };
      
      mockDatabase.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([profile]),
      });

      const result = await service.findOne(1);

      expect(result).toEqual(profile);
      expect(mockDatabase.select).toHaveBeenCalled();
    });

    it('should return null when profile not found', async () => {
      mockDatabase.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      });

      const result = await service.findOne(999);

      expect(result).toBeNull();
      expect(mockDatabase.select).toHaveBeenCalled();
    });
  });

  describe('findOneByName', () => {
    it('should return a profile by name', async () => {
      const profile = { id: 1, name: 'Profile 1', front_min: 0, front_max: 100, back_min: 0, back_max: 100 };
      
      mockDatabase.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([profile]),
      });

      const result = await service.findOneByName('Profile 1');

      expect(result).toEqual(profile);
      expect(mockDatabase.select).toHaveBeenCalled();
    });

    it('should return null when profile name not found', async () => {
      mockDatabase.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      });

      const result = await service.findOneByName('NonExistent');

      expect(result).toBeNull();
      expect(mockDatabase.select).toHaveBeenCalled();
    });

    it('should return first profile when multiple profiles have same name', async () => {
      const profilesData = [
        { id: 1, name: 'Duplicate', front_min: 0, front_max: 100, back_min: 0, back_max: 100 },
        { id: 2, name: 'Duplicate', front_min: 10, front_max: 90, back_min: 5, back_max: 95 },
      ];
      
      mockDatabase.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(profilesData),
      });

      const result = await service.findOneByName('Duplicate');

      expect(result).toEqual(profilesData[0]);
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

      const createdProfile = {
        id: 1,
        ...profileData,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      };

      mockDatabase.insert.mockReturnValue({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([createdProfile]),
      });

      const result = await service.create(profileData);

      expect(result).toEqual(createdProfile);
      expect(mockDatabase.insert).toHaveBeenCalled();
    });

    it('should create profile with all fields', async () => {
      const profileData = {
        name: 'Complete Profile',
        front_min: 10,
        front_max: 90,
        back_min: 5,
        back_max: 95,
      };

      const createdProfile = {
        id: 1,
        ...profileData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDatabase.insert.mockReturnValue({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([createdProfile]),
      });

      const result = await service.create(profileData);

      expect(result).toBeDefined();
      expect(result.name).toBe(profileData.name);
      expect(result.front_min).toBe(profileData.front_min);
      expect(result.front_max).toBe(profileData.front_max);
      expect(result.back_min).toBe(profileData.back_min);
      expect(result.back_max).toBe(profileData.back_max);
    });
  });

  describe('update', () => {
    it('should update a profile and return updated record', async () => {
      const updateData = {
        name: 'Updated Profile',
        front_min: 10,
        front_max: 90,
      };

      const updatedProfile = {
        id: 1,
        ...updateData,
        back_min: 0,
        back_max: 100,
        createdAt: new Date('2024-01-01'),
        updatedAt: expect.any(Date),
      };

      mockDatabase.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([updatedProfile]),
      });

      const result = await service.update(1, updateData);

      expect(result).toEqual(updatedProfile);
      expect(mockDatabase.update).toHaveBeenCalled();
    });

    it('should return null when profile not found', async () => {
      mockDatabase.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]),
      });

      const result = await service.update(999, { name: 'Test' });

      expect(result).toBeNull();
      expect(mockDatabase.update).toHaveBeenCalled();
    });

    it('should filter out createdAt from update data', async () => {
      const updateData = {
        name: 'Updated',
        createdAt: new Date('2020-01-01'),
        front_min: 20,
      };

      const updatedProfile = {
        id: 1,
        name: 'Updated',
        front_min: 20,
        front_max: 100,
        back_min: 0,
        back_max: 100,
        createdAt: new Date('2024-01-01'),
        updatedAt: expect.any(Date),
      };

      const mockSet = jest.fn().mockReturnThis();
      mockDatabase.update.mockReturnValue({
        set: mockSet,
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([updatedProfile]),
      });

      const result = await service.update(1, updateData);

      expect(result).toEqual(updatedProfile);
      
      // Verify createdAt was NOT passed to set()
      const setCall = mockSet.mock.calls[0][0];
      expect(setCall).not.toHaveProperty('createdAt');
      expect(setCall).toHaveProperty('name', 'Updated');
      expect(setCall).toHaveProperty('front_min', 20);
      expect(setCall).toHaveProperty('updatedAt');
    });

    it('should update only provided fields', async () => {
      const updateData = {
        front_max: 95,
      };

      const updatedProfile = {
        id: 1,
        name: 'Original Name',
        front_min: 0,
        front_max: 95,
        back_min: 0,
        back_max: 100,
        createdAt: new Date('2024-01-01'),
        updatedAt: expect.any(Date),
      };

      mockDatabase.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([updatedProfile]),
      });

      const result = await service.update(1, updateData);

      expect(result).toEqual(updatedProfile);
    });

    it('should update all range values', async () => {
      const updateData = {
        front_min: 5,
        front_max: 85,
        back_min: 10,
        back_max: 90,
      };

      const updatedProfile = {
        id: 1,
        name: 'Profile',
        ...updateData,
        createdAt: new Date('2024-01-01'),
        updatedAt: expect.any(Date),
      };

      mockDatabase.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([updatedProfile]),
      });

      const result = await service.update(1, updateData);

      expect(result).toEqual(updatedProfile);
    });
  });

  describe('remove', () => {
    it('should delete a profile and return true', async () => {
      const deletedProfile = {
        id: 1,
        name: 'Deleted Profile',
        front_min: 0,
        front_max: 100,
        back_min: 0,
        back_max: 100,
      };

      mockDatabase.delete.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([deletedProfile]),
      });

      const result = await service.remove(1);

      expect(result).toBe(true);
      expect(mockDatabase.delete).toHaveBeenCalled();
    });

    it('should return false when profile not found', async () => {
      mockDatabase.delete.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]),
      });

      const result = await service.remove(999);

      expect(result).toBe(false);
      expect(mockDatabase.delete).toHaveBeenCalled();
    });

    it('should handle deletion of multiple profiles with same id (edge case)', async () => {
      const deletedProfiles = [
        { id: 1, name: 'Profile 1' },
        { id: 1, name: 'Profile 1 Duplicate' },
      ];

      mockDatabase.delete.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue(deletedProfiles),
      });

      const result = await service.remove(1);

      expect(result).toBe(true);
      expect(deletedProfiles.length).toBeGreaterThan(0);
    });
  });
});