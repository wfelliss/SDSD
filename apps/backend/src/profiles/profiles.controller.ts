import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { NewProfile } from 'src/database/schema';

@Controller('profiles')
export class ProfilesController {
    constructor(private readonly profilesService: ProfilesService) {}
    
    @Get()
    async findAll() : Promise<any[]> {
        return this.profilesService.findAll();
    }

    @Get(":id")
    async findOne(@Param("id", ParseIntPipe) id: number): Promise<any | null> {
        return this.profilesService.findOne(id);
    }

    @Post()
    async create(@Body() profileData: Omit<NewProfile, "createdAt" | "updatedAt">): Promise<any> {
        return this.profilesService.create(profileData);
    }

    @Put(":id")
    async update(
        @Param("id", ParseIntPipe) id: number,
        @Body() profileData: Partial<Omit<NewProfile, "id" | "createdAt">>
    ): Promise<any | null> {
        return this.profilesService.update(id, profileData);
    }

    @Delete(":id")
    async remove(@Param("id", ParseIntPipe) id: number): Promise<{ success: boolean }> {
        const success = await this.profilesService.remove(id);
        return { success };
    }
}
