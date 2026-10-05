import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";

import { SortablePaginationQueryDto } from "@shared/pagination/pagination.query.dto";

export class ListListsQueryDto extends SortablePaginationQueryDto {
  @ApiPropertyOptional({
    enum: ["createdAt", "name"],
    default: "createdAt",
  })
  @IsOptional()
  @IsEnum(["createdAt", "name"])
  sortBy: "createdAt" | "name" = "createdAt";
}
