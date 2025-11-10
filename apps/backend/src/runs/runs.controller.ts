import { Controller, Get, Post, Body, Param } from '@nestjs/common';
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
}
