import { Body, Controller, Get, Header, Inject, Post, ValidationPipe } from '@nestjs/common';
import { DataService } from './data.service.js';
import { FilterRequestDto } from './dto/filter-request.dto.js';

@Controller('data')
export class DataController {
  constructor(@Inject(DataService) private readonly dataService: DataService) {}

  @Get('geojson')
  @Header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  getGeoJson() {
    return this.dataService.getGeoJson();
  }

  @Get('map')
  @Header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
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
