import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";

import { AuthSessionGuard } from "@api/auth/auth-session.guard";
import { CreateGiftUseCase } from "@application/use-cases/gifts/create-gift.use-case";
import { ListGiftsUseCase } from "@application/use-cases/gifts/list-gifts.use-case";

import { CreateGiftDto } from "./dtos/create-gift.dto";
import { ListGiftsQueryDto } from "./dtos/list-gifts.query.dto";

@ApiTags("gifts")
@Controller()
export class GiftsController {
  constructor(
    private readonly createGiftUseCase: CreateGiftUseCase,
    private readonly listGiftsUseCase: ListGiftsUseCase,
  ) {}

  @Post("gifts")
  @UseGuards(AuthSessionGuard)
  @ApiOperation({
    summary: "Create a gift",
    description:
      "Transfers money from the authenticated user's balance to a wish owner, or creates a general cash contribution.",
  })
  @ApiResponse({
    status: 201,
    description: "Gift created",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid gift request",
  })
  @ApiResponse({
    status: 401,
    description: "Not authenticated",
  })
  @ApiResponse({
    status: 404,
    description: "Wish or required balance not found",
  })
  async create(@Req() req: Request, @Body() dto: CreateGiftDto) {
    return this.createGiftUseCase.execute({
      userId: req.session.userId!,
      ...dto,
    });
  }

  @Get("gifts/given")
  @UseGuards(AuthSessionGuard)
  @ApiOperation({
    summary: "List gifts given by the current user",
  })
  @ApiResponse({
    status: 200,
    description: "Gifts given by the authenticated user",
  })
  async listGiven(@Req() req: Request, @Query() query: ListGiftsQueryDto) {
    return this.listGiftsUseCase.execute({
      userId: req.session.userId!,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
    });
  }

  @Get("gifts/received")
  @UseGuards(AuthSessionGuard)
  @ApiOperation({
    summary: "List gifts received by the current user",
  })
  @ApiResponse({
    status: 200,
    description: "Gifts received by the authenticated user",
  })
  async listReceived(@Req() req: Request, @Query() query: ListGiftsQueryDto) {
    return this.listGiftsUseCase.execute({
      recipientUserId: req.session.userId!,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
    });
  }

  @Get("wishes/:wishId/gifts")
  @ApiOperation({
    summary: "List gifts for a wish",
    description:
      "Returns gifts received by a wish. Anonymous gifts do not expose the giver's user ID.",
  })
  @ApiResponse({
    status: 200,
    description: "Gifts returned",
  })
  @ApiResponse({
    status: 403,
    description: "Wish cannot be accessed",
  })
  @ApiResponse({
    status: 404,
    description: "Wish or list not found",
  })
  async listWishGifts(
    @Param("wishId") wishId: string,
    @Query() query: ListGiftsQueryDto,
    @Req() req: Request,
  ) {
    return this.listGiftsUseCase.execute({
      wishId,
      requesterUserId: req.session?.userId,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
    });
  }
}
