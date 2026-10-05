import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

import { ListVisibility } from "@domain/enums/list-visibility.enum";

export class UpdateListDto {
  @ApiPropertyOptional({
    example: "Birthday Wish List",
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: "Things I would love to receive for my birthday.",
    maxLength: 1000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional({
    enum: ListVisibility,
  })
  @IsOptional()
  @IsEnum(ListVisibility)
  visibility?: ListVisibility;
}
