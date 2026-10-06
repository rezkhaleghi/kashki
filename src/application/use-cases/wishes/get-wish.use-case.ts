import { Injectable } from "@nestjs/common";

import { ListVisibility } from "@domain/enums/list-visibility.enum";
import {
  ListAccessNotAllowedException,
  ListNotFoundException,
  WishNotFoundException,
} from "@domain/exceptions/domain.exception";
import { ListRepository } from "@domain/repositories/list.repository";
import { WishRepository } from "@domain/repositories/wish.repository";
import { Wish } from "@domain/entities/wish.entity";

export interface GetWishInput {
  listId: string;
  wishId: string;
  requesterUserId?: string;
}

@Injectable()
export class GetWishUseCase {
  constructor(
    private readonly wishRepository: WishRepository,
    private readonly listRepository: ListRepository,
  ) {}

  async execute(input: GetWishInput): Promise<Wish> {
    const list = await this.listRepository.findById(input.listId);

    if (!list) {
      throw new ListNotFoundException();
    }

    const isOwner = list.userId === input.requesterUserId;

    if (!isOwner && list.visibility === ListVisibility.PRIVATE) {
      throw new ListAccessNotAllowedException();
    }

    const wish = await this.wishRepository.findByListIdAndId(
      input.listId,
      input.wishId,
    );

    if (!wish) {
      throw new WishNotFoundException();
    }

    return wish;
  }
}
