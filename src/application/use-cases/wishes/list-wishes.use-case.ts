import { Injectable } from "@nestjs/common";

import { Wish } from "@domain/entities/wish.entity";
import { ListVisibility } from "@domain/enums/list-visibility.enum";
import {
  ListAccessNotAllowedException,
  ListNotFoundException,
} from "@domain/exceptions/domain.exception";
import { ListRepository } from "@domain/repositories/list.repository";
import { WishRepository } from "@domain/repositories/wish.repository";
import { PageQuery, PageResult } from "@shared/pagination/page-query";

export interface ListWishesInput extends PageQuery<"createdAt" | "title"> {
  listId: string;
  requesterUserId?: string;
}

@Injectable()
export class ListWishesUseCase {
  constructor(
    private readonly wishRepository: WishRepository,
    private readonly listRepository: ListRepository,
  ) {}

  async execute(input: ListWishesInput): Promise<PageResult<Wish>> {
    const list = await this.listRepository.findById(input.listId);

    if (!list) {
      throw new ListNotFoundException();
    }

    const isOwner = list.userId === input.requesterUserId;

    if (!isOwner && list.visibility === ListVisibility.PRIVATE) {
      throw new ListAccessNotAllowedException();
    }

    return this.wishRepository.findPageByListId(input.listId, {
      page: input.page,
      limit: input.limit,
      sortBy: input.sortBy,
      sortDirection: input.sortDirection,
    });
  }
}
