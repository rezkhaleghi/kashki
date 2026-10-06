import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from "@nestjs/common";

import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { AdminAuthGuard } from "./admin-auth.guard";

import { AdminListGiftsUseCase } from "@application/use-cases/admin-gifts/list-gifts.use-case";
import { AdminGetGiftUseCase } from "@application/use-cases/admin-gifts/get-gift.use-case";

import { ListGiftsQueryDto } from "./dtos/gifts/list-gifts.query.dto";

@ApiTags("admin-gifts")
@Controller("admin/gifts")
@UseGuards(AdminAuthGuard)
export class AdminGiftsController {
  constructor(
    private readonly listGiftsUseCase: AdminListGiftsUseCase,
    private readonly getGiftUseCase: AdminGetGiftUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: "List gifts",
    description:
      "Returns a paginated list of gifts across all users and wishes.",
  })
  @ApiResponse({
    status: 200,
    description: "Gifts list",
  })
  async list(@Query() query: ListGiftsQueryDto) {
    return this.listGiftsUseCase.execute({
      userId: query.userId,
      wishId: query.wishId,
      currency: query.currency,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
    });
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get gift details",
  })
  @ApiResponse({
    status: 200,
    description: "Gift details",
  })
  @ApiResponse({
    status: 404,
    description: "Gift not found",
  })
  async get(@Param("id", ParseUUIDPipe) id: string) {
    return this.getGiftUseCase.execute(id);
  }
}
