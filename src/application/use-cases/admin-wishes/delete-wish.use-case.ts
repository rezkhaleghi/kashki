import { Injectable } from "@nestjs/common";

import { UnitOfWork } from "@application/interfaces/unit-of-work.interface";

import {
  ListNotFoundException,
  WishCannotBeDeletedException,
  WishNotFoundException,
} from "@domain/exceptions/domain.exception";

export interface AdminDeleteWishInput {
  listId: string;
  wishId: string;
}

@Injectable()
export class AdminDeleteWishUseCase {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute(input: AdminDeleteWishInput): Promise<void> {
    await this.unitOfWork.execute(
      async ({ listRepository, wishRepository, giftRepository }) => {
        /**
         * Admin deletion follows exactly the same List -> Wish locking
         * order as user deletion and Gift creation.
         */
        const list = await listRepository.findByIdForUpdate(input.listId);

        if (!list) {
          throw new ListNotFoundException();
        }

        const wish = await wishRepository.findByIdForUpdate(input.wishId);

        if (!wish) {
          throw new WishNotFoundException();
        }

        if (wish.listId !== list.id) {
          throw new ListNotFoundException();
        }

        /**
         * Financial history is immutable from the perspective of
         * deletion. Admin privileges do not bypass this invariant.
         */
        if (await giftRepository.existsByWishId(input.wishId)) {
          throw new WishCannotBeDeletedException();
        }

        await wishRepository.deleteById(input.wishId);
      },
    );
  }
}
