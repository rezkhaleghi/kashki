import { Injectable } from "@nestjs/common";

import { Gift } from "@domain/entities/gift.entity";
import { Ledger } from "@domain/entities/ledger.entity";

import { ListVisibility } from "@domain/enums/list-visibility.enum";
import { LedgerType } from "@domain/enums/ledger-type.enum";
import { PaymentCurrency } from "@domain/enums/payment-currency.enum";

import {
  GiftCurrencyMismatchException,
  GiftTargetAmountExceededException,
  InsufficientBalanceException,
  ListAccessNotAllowedException,
  ListNotFoundException,
  UserBalanceNotFoundException,
  WishCompletedException,
  WishCurrencyRequiredException,
  WishNotFoundException,
} from "@domain/exceptions/domain.exception";

import {
  addDecimal,
  isNegativeDecimal,
  subtractDecimal,
} from "@domain/utils/decimal.util";

import { UnitOfWork } from "@application/interfaces/unit-of-work.interface";

export interface CreateGiftInput {
  userId: string;
  wishId?: string | null;
  amount: string;
  currency: PaymentCurrency;
  anonymous?: boolean;
  message?: string | null;
}

@Injectable()
export class CreateGiftUseCase {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute(input: CreateGiftInput): Promise<Gift> {
    return this.unitOfWork.execute(
      async ({
        listRepository,
        wishRepository,
        giftRepository,
        userBalanceRepository,
        ledgerRepository,
      }) => {
        /**
         * A Wish row is locked before reading its current status and
         * received amount. This serializes concurrent contributions to the
         * same Wish and prevents two requests from both spending the last
         * remaining target capacity.
         */
        const wish = input.wishId
          ? await wishRepository.findByIdForUpdate(input.wishId)
          : null;

        if (input.wishId && !wish) {
          throw new WishNotFoundException();
        }

        if (wish) {
          const list = await listRepository.findById(wish.listId);

          if (!list) {
            throw new ListNotFoundException();
          }

          if (
            list.visibility === ListVisibility.PRIVATE &&
            list.userId !== input.userId
          ) {
            throw new ListAccessNotAllowedException();
          }

          if (wish.getStatus() === "COMPLETED") {
            throw new WishCompletedException();
          }

          if (wish.targetAmount !== null && wish.currency === null) {
            throw new WishCurrencyRequiredException();
          }

          if (wish.currency !== null && wish.currency !== input.currency) {
            throw new GiftCurrencyMismatchException();
          }

          if (wish.targetAmount !== null) {
            const receivedAmount =
              await giftRepository.sumAmountByWishIdAndCurrency(
                wish.id,
                input.currency,
              );

            const newReceivedAmount = addDecimal(receivedAmount, input.amount);

            if (
              isNegativeDecimal(
                subtractDecimal(wish.targetAmount, newReceivedAmount),
              )
            ) {
              throw new GiftTargetAmountExceededException();
            }
          }
        }

        const balance =
          await userBalanceRepository.findByUserIdAndCurrencyForUpdate(
            input.userId,
            input.currency,
          );

        if (!balance) {
          throw new UserBalanceNotFoundException(input.currency);
        }

        const balanceBefore = balance.amount;

        try {
          balance.debit(input.amount);
        } catch (error) {
          if (error instanceof InsufficientBalanceException) {
            throw error;
          }

          throw error;
        }

        const savedBalance = await userBalanceRepository.save(balance);

        const gift = Gift.create({
          userId: input.userId,
          wishId: input.wishId ?? null,
          amount: input.amount,
          currency: input.currency,
          anonymous: input.anonymous,
          message: input.message,
        });

        const savedGift = await giftRepository.create(gift);

        await ledgerRepository.create(
          Ledger.create({
            userId: input.userId,
            currency: input.currency,
            amount: `-${input.amount}`,
            balanceBefore,
            balanceAfter: savedBalance.amount,
            type: LedgerType.TRANSFER_OUT,
            referenceId: savedGift.id,
            metadata: {
              giftId: savedGift.id,
              wishId: savedGift.wishId,
            },
          }),
        );

        /**
         * The Gift has now been persisted, so calculate the new received
         * amount and complete the Wish when its target has been reached.
         *
         * `wish` is narrowed here before accessing its properties, which
         * also guarantees that a general cash Gift can never reach this
         * completion path.
         */
        if (wish && wish.targetAmount !== null) {
          const receivedAmount =
            await giftRepository.sumAmountByWishIdAndCurrency(
              wish.id,
              input.currency,
            );

          if (
            !isNegativeDecimal(
              subtractDecimal(wish.targetAmount, receivedAmount),
            )
          ) {
            wish.markCompleted();
            await wishRepository.save(wish);
          }
        }

        return savedGift;
      },
    );
  }
}
