import { Injectable } from "@nestjs/common";

import { UnitOfWork } from "@application/interfaces/unit-of-work.interface";

import { Wish } from "@domain/entities/wish.entity";
import { PaymentCurrency } from "@domain/enums/payment-currency.enum";
import {
  ListNotFoundException,
  WishNotFoundException,
} from "@domain/exceptions/domain.exception";

export interface UpdateWishInput {
  userId: string;
  listId: string;
  wishId: string;

  title?: string;
  description?: string | null;
  links?: string[];
  targetAmount?: string | null;
  currency?: PaymentCurrency | null;
}

@Injectable()
export class UpdateWishUseCase {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute(input: UpdateWishInput): Promise<Wish> {
    return this.unitOfWork.execute(
      async ({ listRepository, wishRepository, giftRepository }) => {
        /**
         * List is locked first because Gift creation follows the same
         * List -> Wish locking order.
         *
         * This prevents a concurrent Gift from changing the financial
         * state while this update is validating ownership and received
         * amount.
         */
        const list = await listRepository.findByIdForUpdate(input.listId);

        if (!list || list.userId !== input.userId) {
          throw new ListNotFoundException();
        }

        /**
         * Wish is locked after its parent List.
         */
        const wish = await wishRepository.findByIdForUpdate(input.wishId);

        if (!wish) {
          throw new WishNotFoundException();
        }

        if (wish.listId !== list.id) {
          throw new ListNotFoundException();
        }

        const receivedAmount = wish.currency
          ? await giftRepository.sumAmountByWishIdAndCurrency(
              wish.id,
              wish.currency,
            )
          : "0";

        wish.update(
          {
            title: input.title,
            description: input.description,
            links: input.links,
            targetAmount: input.targetAmount,
            currency: input.currency,
          },
          receivedAmount,
        );

        return wishRepository.save(wish);
      },
    );
  }
}
