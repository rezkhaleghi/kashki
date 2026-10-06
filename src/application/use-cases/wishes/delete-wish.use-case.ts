import { Injectable } from "@nestjs/common";

import { UnitOfWork } from "@application/interfaces/unit-of-work.interface";

import {
  ListNotFoundException,
  WishCannotBeDeletedException,
  WishNotFoundException,
} from "@domain/exceptions/domain.exception";

export interface DeleteWishInput {
  userId: string;
  listId: string;
  wishId: string;
}

@Injectable()
export class DeleteWishUseCase {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute(input: DeleteWishInput): Promise<void> {
    await this.unitOfWork.execute(
      async ({ listRepository, wishRepository, giftRepository }) => {
        /**
         * List is the first lock because Gift creation also locks
         * List before Wish. This gives both operations one deterministic
         * lock order and closes the Gift-vs-delete race.
         */
        const list = await listRepository.findByIdForUpdate(input.listId);

        if (!list || list.userId !== input.userId) {
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
         * A Gift is financial history. A Wish that has received money
         * must never be silently removed, even though the database FK
         * could otherwise permit or cascade the deletion.
         */
        if (await giftRepository.existsByWishId(input.wishId)) {
          throw new WishCannotBeDeletedException();
        }

        await wishRepository.deleteById(input.wishId);
      },
    );
  }
}
