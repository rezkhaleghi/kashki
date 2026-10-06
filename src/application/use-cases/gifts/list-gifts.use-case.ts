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
  /**
   * The authenticated user. Used when listing gifts for the current user.
   */
  userId?: string;

  /**
   * Gifts received by a specific user.
   */
  recipientUserId?: string;

  /**
   * Gifts attached to a specific wish.
   */
  wishId?: string;

  /**
   * Only relevant when wishId is provided.
   * Required to enforce private-list access.
   */
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
    /**
     * Wish access is special because private/unlisted visibility rules apply
     * only when gifts are requested for a specific Wish.
     *
     * Given/received gift history does not need Wish/List lookup.
     */
    if (input.wishId) {
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
    }

    const result = await this.giftRepository.findPage(
      {
        userId: input.userId,
        recipientUserId: input.recipientUserId,
        wishId: input.wishId,
      },
      {
        page: input.page,
        limit: input.limit,
        sortBy: input.sortBy,
        sortDirection: input.sortDirection,
      },
    );

    /**
     * Anonymous gifts still contribute financially, but the giver's identity
     * must not be exposed when the gifts are displayed.
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
