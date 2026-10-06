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

import { AuthSessionGuard } from "@api/auth/auth-session.guard";
import { CreateGiftUseCase } from "@application/use-cases/gifts/create-gift.use-case";
import { ListGiftsUseCase } from "@application/use-cases/gifts/list-gifts.use-case";

import { CreateGiftDto } from "./dtos/create-gift.dto";
import { ListGiftsQueryDto } from "./dtos/list-gifts.query.dto";

@Controller()
export class GiftsController {
  constructor(
    private readonly createGiftUseCase: CreateGiftUseCase,
    private readonly listGiftsUseCase: ListGiftsUseCase,
  ) {}

  @Post("gifts")
  @UseGuards(AuthSessionGuard)
  async create(@Req() req: any, @Body() dto: CreateGiftDto) {
    return this.createGiftUseCase.execute({
      userId: req.session.userId,
      ...dto,
    });
  }

  @Get("wishes/:wishId/gifts")
  async list(
    @Param("wishId") wishId: string,
    @Query() query: ListGiftsQueryDto,
    @Req() req: any,
  ) {
    return this.listGiftsUseCase.execute({
      wishId,
      requesterUserId: req.session?.userId,
      ...query,
    });
  }
}
