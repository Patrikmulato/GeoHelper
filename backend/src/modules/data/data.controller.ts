import { Body, Controller, Get, Inject, Post, ValidationPipe } from '@nestjs/common';
import { DataService } from './data.service.js';
import { FilterRequestDto } from './dto/filter-request.dto.js';

@Controller('data')
export class DataController {
  constructor(@Inject(DataService) private readonly dataService: DataService) {}

  @Get('geojson')
  getGeoJson() {
    return this.dataService.getGeoJson();
  }

  @Get('map')
  getMapData() {
    return this.dataService.getMapData();
  }

  @Post('filter')
  getFilteredCountries(
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        expectedType: FilterRequestDto,
      })
    )
    body: FilterRequestDto
  ) {
    return this.dataService.getFilteredCountries(body);
  }
}
