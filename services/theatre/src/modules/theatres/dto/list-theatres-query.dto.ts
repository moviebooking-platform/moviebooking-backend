import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '@moviebooking/common';

export class ListTheatresQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  city?: string;
}
