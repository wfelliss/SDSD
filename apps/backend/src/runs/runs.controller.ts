import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { RunsService } from './runs.service';

@Controller('runs')
export class RunsController {
  constructor(private readonly runsService: RunsService) {}

  // Get all runs
  @Get()
  getAllRuns() {
    return this.runsService.getAllRuns();
  }

  // Get a single run by ID
  @Get(':id')
  getRunById(@Param('id') id: number) {
    return this.runsService.getRunById(Number(id));
  }

  // Create a new run
  @Post()
  createRun(@Body() body: any) {
    return this.runsService.createRun(body);
  }

  // Update run fields (partial update)
  @Patch(':id')
  updateRun(@Param('id') id: number, @Body() body: any) {
    return this.runsService.updateRun(Number(id), body);
  }
} 
