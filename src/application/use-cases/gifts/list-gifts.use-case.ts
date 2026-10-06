import { Injectable } from "@nestjs/common";

import { Gift } from "@domain/entities/gift.entity";
import { ListVisibility } from "@domain/enums/list-visibility.enum";
import {
  ListAccessNotAllowedException,
  ListNotFoundException,
  WishNotFoundException,
} from "@domain/exceptions/domain.exception";
import { GiftRepository } from "@domain/repositories/gift.repository";
import { ListRepository } from "@domain/repositories/list.repository";
import { WishRepository } from "@domain/repositories/wish.repository";
import { PageQuery, PageResult } from "@shared/pagination/page-query";

export interface ListGiftsInput extends PageQuery<"createdAt" | "amount"> {
  wishId: string;
  requesterUserId?: string;
}

export type GiftListItem = Omit<Gift, "userId"> & {
  userId: string | null;
};

@Injectable()
export class ListGiftsUseCase {
  constructor(
    private readonly giftRepository: GiftRepository,
    private readonly wishRepository: WishRepository,
    private readonly listRepository: ListRepository,
  ) {}

  async execute(input: ListGiftsInput): Promise<PageResult<GiftListItem>> {
    const wish = await this.wishRepository.findById(input.wishId);

    if (!wish) {
      throw new WishNotFoundException();
    }

    const list = await this.listRepository.findById(wish.listId);

    if (!list) {
      throw new ListNotFoundException();
    }

    if (
      list.visibility === ListVisibility.PRIVATE &&
      list.userId !== input.requesterUserId
    ) {
      throw new ListAccessNotAllowedException();
    }

    const result = await this.giftRepository.findPageByWishId(input.wishId, {
      page: input.page,
      limit: input.limit,
      sortBy: input.sortBy,
      sortDirection: input.sortDirection,
    });

    /**
     * Anonymous Gifts still contribute to the Wish financially, but their
     * giver identity must not be exposed through the read API.
     */
    return {
      ...result,
      data: result.data.map((gift) => ({
        ...gift,
        userId: gift.anonymous ? null : gift.userId,
      })),
    };
  }
}
