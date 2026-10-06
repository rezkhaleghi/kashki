import { Injectable } from "@nestjs/common";

import { ListVisibility } from "@domain/enums/list-visibility.enum";
import { UserStatus } from "@domain/enums/user-status.enum";

import { UserNotFoundException } from "@domain/exceptions/domain.exception";

import { GiftRepository } from "@domain/repositories/gift.repository";
import { ListRepository } from "@domain/repositories/list.repository";
import { UserRepository } from "@domain/repositories/user.repository";
import { WishRepository } from "@domain/repositories/wish.repository";

const PAGE_SIZE = 100;

@Injectable()
export class GetPublicUserProfileUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly listRepository: ListRepository,
    private readonly wishRepository: WishRepository,
    private readonly giftRepository: GiftRepository,
  ) {}

  async execute(userId: string) {
    const user = await this.userRepository.findById(userId);

    /**
     * Restricted users should not remain discoverable through the public
     * profile endpoint. Returning the same not-found response also avoids
     * exposing account-status information.
     */
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UserNotFoundException();
    }

    const lists = await this.findAllLists(userId);

    const publicLists = lists.filter(
      (list) => list.visibility === ListVisibility.PUBLIC,
    );

    const responseLists = [];

    for (const list of publicLists) {
      const wishes = await this.findAllWishes(list.id);

      const responseWishes = [];

      for (const wish of wishes) {
        let receivedAmount: string | null = null;

        /**
         * A targetless Wish has no single meaningful progress amount because
         * gifts are allowed without a fixed target/currency. For target-based
         * wishes, Gift creation guarantees a consistent currency.
         */
        if (wish.targetAmount !== null && wish.currency !== null) {
          receivedAmount =
            await this.giftRepository.sumAmountByWishIdAndCurrency(
              wish.id,
              wish.currency,
            );
        }

        responseWishes.push({
          id: wish.id,
          title: wish.title,
          description: wish.description,
          targetAmount: wish.targetAmount,
          currency: wish.currency,
          status: wish.getStatus(),
          receivedAmount,
        });
      }

      responseLists.push({
        id: list.id,
        name: list.name,
        description: list.description,
        visibility: list.visibility,
        wishes: responseWishes,
      });
    }

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      userName: user.userName,
      avatar: user.avatar,
      bio: user.bio,
      birthday: this.formatBirthday(user.dateOfBirth, user.hideYear),
      lists: responseLists,
    };
  }

  private async findAllLists(userId: string) {
    const results = [];
    let page = 1;

    while (true) {
      const result = await this.listRepository.findPageByUserId(userId, {
        page,
        limit: PAGE_SIZE,
        sortBy: "createdAt",
        sortDirection: "DESC",
      });

      results.push(...result.data);

      if (page >= result.totalPages) {
        break;
      }

      page++;
    }

    return results;
  }

  private async findAllWishes(listId: string) {
    const results = [];
    let page = 1;

    while (true) {
      const result = await this.wishRepository.findPageByListId(listId, {
        page,
        limit: PAGE_SIZE,
        sortBy: "createdAt",
        sortDirection: "DESC",
      });

      results.push(...result.data);

      if (page >= result.totalPages) {
        break;
      }

      page++;
    }

    return results;
  }

  private formatBirthday(
    dateOfBirth: Date | null,
    hideYear: boolean,
  ): string | null {
    if (!dateOfBirth) {
      return null;
    }

    const month = String(dateOfBirth.getUTCMonth() + 1).padStart(2, "0");
    const day = String(dateOfBirth.getUTCDate()).padStart(2, "0");

    if (hideYear) {
      return `${month}-${day}`;
    }

    const year = dateOfBirth.getUTCFullYear();

    return `${year}-${month}-${day}`;
  }
}
