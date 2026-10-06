import { Injectable } from "@nestjs/common";

import { UnitOfWork } from "@application/interfaces/unit-of-work.interface";

import { Wish } from "@domain/entities/wish.entity";
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
  targetAmount?: string | null;
  currency?:
    | import("@domain/enums/payment-currency.enum").PaymentCurrency
    | null;
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
         *
         * The ownership check is deliberately performed against the
         * locked List rather than trusting the route parameters.
         */
        const wish = await wishRepository.findByIdForUpdate(input.wishId);

        if (!wish) {
          throw new WishNotFoundException();
        }

        /**
         * A Wish belongs to exactly one List. Reject a mismatched route
         * instead of allowing a Wish to be modified through another List.
         */
        if (wish.listId !== list.id) {
          throw new ListNotFoundException();
        }

        /**
         * Gift totals are persistent financial history. We pass the
         * received amount into the domain so Wish.update() can enforce:
         *
         * - target cannot fall below received gifts
         * - currency cannot change after gifts
         * - completed wishes can only be reopened by increasing target
         *
         * A targetless Wish cannot have targeted Gifts, therefore there
         * cannot be received targeted Gift money while currency is null.
         */
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
