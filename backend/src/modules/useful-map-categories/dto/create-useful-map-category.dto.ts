import { IsString, MaxLength, Matches, MinLength } from 'class-validator';

export class CreateUsefulMapCategoryDto {
  @IsString()
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label!: string;
}
