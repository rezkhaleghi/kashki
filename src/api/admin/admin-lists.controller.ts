import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { AdminListListsUseCase } from "@application/use-cases/admin-lists/list-lists.use-case";
import { AdminGetListUseCase } from "@application/use-cases/admin-lists/get-list.use-case";

import { AdminAuthGuard } from "./admin-auth.guard";
import { ListListsQueryDto } from "../lists/dtos/list-lists.query.dto";

@ApiTags("admin-lists")
@Controller("admin/lists")
@UseGuards(AdminAuthGuard)
export class AdminListsController {
  constructor(
    private readonly listListsUseCase: AdminListListsUseCase,
    private readonly getListUseCase: AdminGetListUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: "List all lists",
    description: "Returns a paginated list of lists across all users.",
  })
  @ApiResponse({
    status: 200,
    description: "Lists returned",
  })
  async list(@Query() query: ListListsQueryDto) {
    return this.listListsUseCase.execute({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
    });
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get list details",
  })
  @ApiResponse({
    status: 200,
    description: "List details",
  })
  @ApiResponse({
    status: 404,
    description: "List not found",
  })
  async get(@Param("id", ParseUUIDPipe) id: string) {
    return this.getListUseCase.execute(id);
  }
}
