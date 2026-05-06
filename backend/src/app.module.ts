import { Module } from '@nestjs/common';
import { DataModule } from './modules/data/data.module.js';

@Module({
    imports: [DataModule],
})
export class AppModule { }
