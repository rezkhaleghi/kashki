import { Injectable } from "@nestjs/common";

import { UnitOfWork } from "@application/interfaces/unit-of-work.interface";

import { Wish } from "@domain/entities/wish.entity";
import {
  ListNotFoundException,
  WishNotFoundException,
} from "@domain/exceptions/domain.exception";
import { PaymentCurrency } from "@domain/enums/payment-currency.enum";

export interface AdminUpdateWishInput {
  listId: string;
  wishId: string;

  title?: string;
  description?: string | null;
  targetAmount?: string | null;
  currency?: PaymentCurrency | null;
}

@Injectable()
export class AdminUpdateWishUseCase {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute(input: AdminUpdateWishInput): Promise<Wish> {
    return this.unitOfWork.execute(
      async ({ listRepository, wishRepository, giftRepository }) => {
        /**
         * Admin operations still use the same locking discipline as user
         * operations. Administrative privilege must not create a second
         * concurrency model around financial data.
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
