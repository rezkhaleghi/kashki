import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { AdminDeleteWishUseCase } from "@application/use-cases/admin-wishes/delete-wish.use-case";
import { AdminGetWishUseCase } from "@application/use-cases/admin-wishes/get-wish.use-case";
import { AdminListWishesUseCase } from "@application/use-cases/admin-wishes/list-wishes.use-case";
import { AdminUpdateWishUseCase } from "@application/use-cases/admin-wishes/update-wish.use-case";

import { UpdateWishDto } from "../wishes/dtos/update-wish.dto";
import { ListWishesQueryDto } from "../wishes/dtos/list-wishes.query.dto";
import { AdminAuthGuard } from "./admin-auth.guard";

@ApiTags("admin-wishes")
@Controller("admin/wishes")
@UseGuards(AdminAuthGuard)
export class AdminWishesController {
  constructor(
    private readonly listWishesUseCase: AdminListWishesUseCase,
    private readonly getWishUseCase: AdminGetWishUseCase,
    private readonly updateWishUseCase: AdminUpdateWishUseCase,
    private readonly deleteWishUseCase: AdminDeleteWishUseCase,
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

  @Patch(":id")
  @ApiOperation({
    summary: "Update a wish",
    description:
      "Administrators can update a wish while the same financial invariants enforced for users remain active.",
  })
  @ApiResponse({
    status: 200,
    description: "Wish updated",
  })
  @ApiResponse({
    status: 404,
    description: "Wish or list not found",
  })
  @ApiResponse({
    status: 409,
    description: "Wish update violates its financial state",
  })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateWishDto,
  ) {
    /**
     * The route contains the Wish ID, while the locking model requires
     * the parent List ID. The admin API therefore intentionally expects
     * listId in the request body only if needed by the caller.
     *
     * However, the current DTO does not expose listId. We therefore
     * resolve the Wish first through the existing admin read use case.
     */
    const wish = await this.getWishUseCase.execute(id);

    return this.updateWishUseCase.execute({
      listId: wish.listId,
      wishId: id,
      title: dto.title,
      description: dto.description,
      links: dto.links,
      targetAmount: dto.targetAmount,
      currency: dto.currency,
    });
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Delete a wish",
  })
  @ApiResponse({
    status: 200,
    description: "Wish deleted",
  })
  @ApiResponse({
    status: 404,
    description: "Wish or list not found",
  })
  @ApiResponse({
    status: 409,
    description: "Wish cannot be deleted because it has gifts",
  })
  async delete(@Param("id", ParseUUIDPipe) id: string) {
    /**
     * Resolve the parent List ID before entering the transactional
     * deletion use case. The deletion use case then re-reads and locks
     * both records, so this preliminary read is only route resolution;
     * it is not trusted for the actual mutation.
     */
    const wish = await this.getWishUseCase.execute(id);

    await this.deleteWishUseCase.execute({
      listId: wish.listId,
      wishId: id,
    });

    return {
      message: "Wish deleted",
    };
  }
}
