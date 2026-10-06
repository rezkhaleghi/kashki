import { Injectable } from "@nestjs/common";

import { Wish } from "@domain/entities/wish.entity";
import { WishRepository } from "@domain/repositories/wish.repository";
import { PageQuery, PageResult } from "@shared/pagination/page-query";

export interface AdminListWishesInput extends PageQuery<
  "createdAt" | "title"
> {}

@Injectable()
export class AdminListWishesUseCase {
  constructor(private readonly wishRepository: WishRepository) {}

  async execute(input: AdminListWishesInput): Promise<PageResult<Wish>> {
    return this.wishRepository.findPage({
      page: input.page,
      limit: input.limit,
      sortBy: input.sortBy,
      sortDirection: input.sortDirection,
    });
  }
}
