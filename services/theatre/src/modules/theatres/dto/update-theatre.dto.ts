import { PartialType } from '@nestjs/swagger';
import { CreateTheatreDto } from './create-theatre.dto';

export class UpdateTheatreDto extends PartialType(CreateTheatreDto) {}
