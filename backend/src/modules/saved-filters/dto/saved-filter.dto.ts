export class SavedFilterDto {
  id!: string;
  userId!: string;
  name!: string;
  description?: string;
  filters!: Record<string, unknown>;
  isPublic!: boolean;
  views!: number;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedSavedFiltersDto {
  items!: SavedFilterDto[];
  total!: number;
  page!: number;
  limit!: number;
}
