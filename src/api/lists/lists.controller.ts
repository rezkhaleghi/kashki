import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";

import { CreateListUseCase } from "@application/use-cases/lists/create-list.use-case";
import { DeleteListUseCase } from "@application/use-cases/lists/delete-list.use-case";
import { UpdateListUseCase } from "@application/use-cases/lists/update-list.use-case";

import { AuthSessionGuard } from "../auth/auth-session.guard";
import { CreateListDto } from "./dtos/create-list.dto";
import { ListListsQueryDto } from "./dtos/list-lists.query.dto";
import { ListListsUseCase } from "@application/use-cases/lists/list-lists.use-case";
import { UpdateListDto } from "./dtos/update-list.dto";

@ApiTags("lists")
@Controller("lists")
export class ListsController {
  constructor(
    private readonly createListUseCase: CreateListUseCase,
    private readonly listListsUseCase: ListListsUseCase,
    private readonly updateListUseCase: UpdateListUseCase,
    private readonly deleteListUseCase: DeleteListUseCase,
  ) {}

  @Post()
  @UseGuards(AuthSessionGuard)
  @ApiOperation({ summary: "Create a list" })
  @ApiResponse({ status: 201, description: "List created" })
  @ApiResponse({ status: 401, description: "Not authenticated" })
  async create(@Body() dto: CreateListDto, @Req() req: Request) {
    return this.createListUseCase.execute({
      userId: req.session.userId!,
      name: dto.name,
      description: dto.description,
      visibility: dto.visibility,
    });
  }

  @Get()
  @UseGuards(AuthSessionGuard)
  @ApiOperation({ summary: "List my lists" })
  @ApiResponse({ status: 200, description: "Lists returned" })
  @ApiResponse({ status: 401, description: "Not authenticated" })
  async list(@Req() req: Request, @Query() query: ListListsQueryDto) {
    return this.listListsUseCase.execute({
      userId: req.session.userId!,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
    });
  }

  /**
   * This endpoint intentionally has no AuthSessionGuard.
   *
   * PUBLIC and UNLISTED lists can be viewed anonymously.
   * GetListUseCase is responsible for deciding whether the requested
   * list is visible to the requester.
   */
  @Get(":id")
  @ApiOperation({ summary: "Get a list" })
  @ApiResponse({ status: 200, description: "List returned" })
  @ApiResponse({ status: 403, description: "List cannot be accessed" })
  @ApiResponse({ status: 404, description: "List not found" })
  async get(@Param("id", ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.getListUseCase.execute({
      listId: id,
      requesterUserId: req.session?.userId,
    });
  }

  @Patch(":id")
  @UseGuards(AuthSessionGuard)
  @ApiOperation({ summary: "Update my list" })
  @ApiResponse({ status: 200, description: "List updated" })
  @ApiResponse({ status: 401, description: "Not authenticated" })
  @ApiResponse({ status: 404, description: "List not found" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateListDto,
    @Req() req: Request,
  ) {
    return this.updateListUseCase.execute({
      userId: req.session.userId!,
      listId: id,
      data: {
        name: dto.name,
        description: dto.description,
        visibility: dto.visibility,
      },
    });
  }

  @Delete(":id")
  @UseGuards(AuthSessionGuard)
  @ApiOperation({ summary: "Delete my list" })
  @ApiResponse({ status: 200, description: "List deleted" })
  @ApiResponse({ status: 401, description: "Not authenticated" })
  @ApiResponse({ status: 404, description: "List not found" })
  async delete(@Param("id", ParseUUIDPipe) id: string, @Req() req: Request) {
    await this.deleteListUseCase.execute({
      userId: req.session.userId!,
      listId: id,
    });

    return {
      message: "List deleted",
    };
  }
}
