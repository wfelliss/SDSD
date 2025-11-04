import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { type User, type NewUser } from "../database/schema";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: number): Promise<User | null> {
    return this.usersService.findOne(id);
  }

  @Post()
  async create(
    @Body() userData: Omit<NewUser, "createdAt" | "updatedAt">
  ): Promise<User> {
    return this.usersService.create(userData);
  }

  @Put(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() userData: Partial<Omit<NewUser, "id" | "createdAt">>
  ): Promise<User | null> {
    return this.usersService.update(id, userData);
  }

  @Delete(":id")
  async remove(
    @Param("id", ParseIntPipe) id: number
  ): Promise<{ success: boolean }> {
    const success = await this.usersService.remove(id);
    return { success };
  }
}
