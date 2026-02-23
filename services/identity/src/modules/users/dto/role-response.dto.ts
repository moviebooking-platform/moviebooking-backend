import { ApiProperty } from '@nestjs/swagger';

export class RoleResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'SUPER_ADMIN' })
  code: string;

  @ApiProperty({ example: 'Super Admin' })
  name: string;
}
