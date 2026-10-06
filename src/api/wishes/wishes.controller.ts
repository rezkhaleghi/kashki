import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";

import { CreateWishUseCase } from "@application/use-cases/wishes/create-wish.use-case";
import { GetWishUseCase } from "@application/use-cases/wishes/get-wish.use-case";
import { ListWishesUseCase } from "@application/use-cases/wishes/list-wishes.use-case";

import { AuthSessionGuard } from "../auth/auth-session.guard";
import { CreateWishDto } from "./dtos/create-wish.dto";
import { ListWishesQueryDto } from "./dtos/list-wishes.query.dto";

@ApiTags("wishes")
@Controller("lists/:listId/wishes")
export class WishesController {
  constructor(
    private readonly createWishUseCase: CreateWishUseCase,
    private readonly listWishesUseCase: ListWishesUseCase,
    private readonly getWishUseCase: GetWishUseCase,
  ) {}

  @Post()
  @UseGuards(AuthSessionGuard)
  @ApiOperation({ summary: "Create a wish in my list" })
  @ApiResponse({ status: 201, description: "Wish created" })
  @ApiResponse({ status: 401, description: "Not authenticated" })
  @ApiResponse({ status: 404, description: "List not found" })
  async create(
    @Param("listId", ParseUUIDPipe) listId: string,
    @Body() dto: CreateWishDto,
    @Req() req: Request,
  ) {
    return this.createWishUseCase.execute({
      userId: req.session.userId!,
      listId,
      title: dto.title,
      description: dto.description,
      targetAmount: dto.targetAmount,
      currency: dto.currency,
    });
  }

  @Get()
  @ApiOperation({ summary: "List wishes in a list" })
  @ApiResponse({ status: 200, description: "Wishes returned" })
  @ApiResponse({ status: 403, description: "List cannot be accessed" })
  @ApiResponse({ status: 404, description: "List not found" })
  async list(
    @Param("listId", ParseUUIDPipe) listId: string,
    @Query() query: ListWishesQueryDto,
    @Req() req: Request,
  ) {
    return this.listWishesUseCase.execute({
      listId,
      requesterUserId: req.session?.userId,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
    });
  }

  @Get(":wishId")
  @ApiOperation({ summary: "Get a wish" })
  @ApiResponse({ status: 200, description: "Wish returned" })
  @ApiResponse({ status: 403, description: "Wish cannot be accessed" })
  @ApiResponse({ status: 404, description: "Wish not found" })
  async get(
    @Param("listId", ParseUUIDPipe) listId: string,
    @Param("wishId", ParseUUIDPipe) wishId: string,
    @Req() req: Request,
  ) {
    return this.getWishUseCase.execute({
      listId,
      wishId,
      requesterUserId: req.session?.userId,
    });
  }
}
