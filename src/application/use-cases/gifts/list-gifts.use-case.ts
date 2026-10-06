import { Injectable } from "@nestjs/common";

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
import { Gift } from "@domain/entities/gift.entity";

export interface ListGiftsInput extends PageQuery<"createdAt" | "amount"> {
  wishId: string;
  requesterUserId?: string;
}

@Injectable()
export class ListGiftsUseCase {
  constructor(
    private readonly giftRepository: GiftRepository,
    private readonly wishRepository: WishRepository,
    private readonly listRepository: ListRepository,
  ) {}

  async execute(input: ListGiftsInput): Promise<PageResult<Gift>> {
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

    return this.giftRepository.findPageByWishId(input.wishId, input);
  }
}
