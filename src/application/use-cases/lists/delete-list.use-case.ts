import { Injectable } from "@nestjs/common";

import {
  ListCannotBeDeletedException,
  ListNotFoundException,
} from "@domain/exceptions/domain.exception";
import { GiftRepository } from "@domain/repositories/gift.repository";
import { ListRepository } from "@domain/repositories/list.repository";
import { UnitOfWork } from "@application/interfaces/unit-of-work.interface";

export interface DeleteListInput {
  listId: string;
  userId: string;
}

@Injectable()
export class DeleteListUseCase {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute(input: DeleteListInput): Promise<void> {
    await this.unitOfWork.execute(
      async ({ listRepository, giftRepository }) => {
        /**
         * Lock the List before checking for Gifts.
         *
         * CreateGiftUseCase uses the same List lock. Therefore:
         *
         * - List deletion waits for an in-progress Gift transaction.
         * - A new Gift waits for List deletion.
         * - Once the List is locked, the Gift existence check represents a
         *   stable state for the remainder of this transaction.
         *
         * The database foreign key from Gift -> Wish with RESTRICT remains
         * the final integrity safeguard.
         */
        const list = await listRepository.findByIdForUpdate(input.listId);

        if (!list || list.userId !== input.userId) {
          throw new ListNotFoundException();
        }

        if (await giftRepository.existsByListId(input.listId)) {
          throw new ListCannotBeDeletedException();
        }

        /**
         * Wishes use ON DELETE CASCADE from List.
         *
         * Therefore a List with Wishes but no Gifts is intentionally
         * deletable. The Wishes are removed together with the List.
         */
        await listRepository.deleteById(input.listId);
      },
    );
  }
}
