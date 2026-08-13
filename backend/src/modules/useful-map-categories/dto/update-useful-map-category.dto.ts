import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateUsefulMapCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label!: string;
}
