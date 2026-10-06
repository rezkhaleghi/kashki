import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { AdminGetWishUseCase } from "@application/use-cases/admin-wishes/get-wish.use-case";
import { AdminListWishesUseCase } from "@application/use-cases/admin-wishes/list-wishes.use-case";

import { ListWishesQueryDto } from "../wishes/dtos/list-wishes.query.dto";
import { AdminAuthGuard } from "./admin-auth.guard";

@ApiTags("admin-wishes")
@Controller("admin/wishes")
@UseGuards(AdminAuthGuard)
export class AdminWishesController {
  constructor(
    private readonly listWishesUseCase: AdminListWishesUseCase,
    private readonly getWishUseCase: AdminGetWishUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: "List all wishes",
    description: "Returns a paginated list of wishes across all lists.",
  })
  @ApiResponse({
    status: 200,
    description: "Wishes returned",
  })
  async list(@Query() query: ListWishesQueryDto) {
    return this.listWishesUseCase.execute({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
    });
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get wish details",
  })
  @ApiResponse({
    status: 200,
    description: "Wish details",
  })
  @ApiResponse({
    status: 404,
    description: "Wish not found",
  })
  async get(@Param("id", ParseUUIDPipe) id: string) {
    return this.getWishUseCase.execute(id);
  }
}
