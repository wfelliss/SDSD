import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import { ProfilesService } from "./profiles.service";
import { NewProfile, Profile } from "@repo/database";

@Controller("profiles")
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  async findAll(): Promise<any[]> {
    return this.profilesService.findAll();
  }

  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: number): Promise<any | null> {
    return this.profilesService.findOne(id);
  }

  @Post()
  async create(
    @Body() profileData: Omit<NewProfile, "createdAt" | "updatedAt">
  ): Promise<any> {
    return this.profilesService.create(profileData);
  }

  @Put(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() profileData: Partial<Omit<NewProfile, "id" | "createdAt">>
  ): Promise<any | null> {
    return this.profilesService.update(id, profileData);
  }

  @Patch(":id")
  async partialUpdate(
    @Param("id", ParseIntPipe) id: number,
    @Body()
    profileData: Partial<Omit<Profile, "id" | "createdAt" | "updatedAt">>
  ): Promise<any | null> {
    const { front_min, front_max, back_min, back_max } = profileData;

    if (!front_min && !front_max && !back_min && !back_max) {
      throw new Error("No valid fields to update.");
    }

    if (front_min < 0 || front_max < 0 || back_min < 0 || back_max < 0) {
      throw new Error("Profile range values must be non-negative.");
    }

    if (front_max < front_min) {
      throw new Error("front_max must be greater than or equal to front_min.");
    }

    if (back_max < back_min) {
      throw new Error("back_max must be greater than or equal to back_min.");
    }

    return this.profilesService.update(id, profileData);
  }

  @Delete(":id")
  async remove(
    @Param("id", ParseIntPipe) id: number
  ): Promise<{ success: boolean }> {
    const success = await this.profilesService.remove(id);
    return { success };
  }
}
