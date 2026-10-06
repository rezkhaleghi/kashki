import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";

import { SortablePaginationQueryDto } from "@shared/pagination/pagination.query.dto";

export class ListWishesQueryDto extends SortablePaginationQueryDto {
  @ApiPropertyOptional({
    enum: ["createdAt", "title"],
    default: "createdAt",
  })
  @IsOptional()
  @IsEnum(["createdAt", "title"])
  sortBy: "createdAt" | "title" = "createdAt";
}
