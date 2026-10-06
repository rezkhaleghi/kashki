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
  isZeroDecimal,
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
         * Lock the Wish before checking its state and received amount.
         *
         * This serializes concurrent Gifts targeting the same Wish and
         * prevents two requests from both spending the same remaining
         * target capacity.
         */
        const wish = input.wishId
          ? await wishRepository.findByIdForUpdate(input.wishId)
          : null;

        if (input.wishId && !wish) {
          throw new WishNotFoundException();
        }

        let recipientUserId: string | null = null;

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

          recipientUserId = list.userId;

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

        /**
         * Balance rows are locked in deterministic user-ID order.
         *
         * Without a consistent order, two simultaneous transfers such as
         * A -> B and B -> A could acquire their first balance lock in
         * opposite order and deadlock while waiting for the second one.
         *
         * General cash Gifts only have the giver balance.
         */
        let giverBalance = null;
        let recipientBalance = null;

        if (recipientUserId === null) {
          giverBalance =
            await userBalanceRepository.findByUserIdAndCurrencyForUpdate(
              input.userId,
              input.currency,
            );
        } else if (recipientUserId === input.userId) {
          giverBalance =
            await userBalanceRepository.findByUserIdAndCurrencyForUpdate(
              input.userId,
              input.currency,
            );
          recipientBalance = giverBalance;
        } else {
          const firstUserId =
            input.userId < recipientUserId ? input.userId : recipientUserId;

          const secondUserId =
            input.userId < recipientUserId ? recipientUserId : input.userId;

          const firstBalance =
            await userBalanceRepository.findByUserIdAndCurrencyForUpdate(
              firstUserId,
              input.currency,
            );

          const secondBalance =
            await userBalanceRepository.findByUserIdAndCurrencyForUpdate(
              secondUserId,
              input.currency,
            );

          if (firstUserId === input.userId) {
            giverBalance = firstBalance;
            recipientBalance = secondBalance;
          } else {
            recipientBalance = firstBalance;
            giverBalance = secondBalance;
          }
        }

        if (!giverBalance) {
          throw new UserBalanceNotFoundException(input.currency);
        }

        if (recipientUserId !== null && !recipientBalance) {
          throw new UserBalanceNotFoundException(input.currency);
        }

        const giverBalanceBefore = giverBalance.amount;

        try {
          giverBalance.debit(input.amount);
        } catch (error) {
          if (error instanceof InsufficientBalanceException) {
            throw error;
          }

          throw error;
        }

        const savedGiverBalance =
          await userBalanceRepository.save(giverBalance);

        const gift = Gift.create({
          userId: input.userId,
          wishId: input.wishId ?? null,
          amount: input.amount,
          currency: input.currency,
          anonymous: input.anonymous,
          message: input.message,
        });

        const savedGift = await giftRepository.create(gift);

        /**
         * The outgoing ledger entry references the Gift. The incoming
         * recipient entry below uses the exact same referenceId, allowing
         * both sides of the transfer to be matched to one Gift.
         */
        await ledgerRepository.create(
          Ledger.create({
            userId: input.userId,
            currency: input.currency,
            amount: `-${input.amount}`,
            balanceBefore: giverBalanceBefore,
            balanceAfter: savedGiverBalance.amount,
            type: LedgerType.TRANSFER_OUT,
            referenceId: savedGift.id,
            metadata: {
              giftId: savedGift.id,
              wishId: savedGift.wishId,
            },
          }),
        );

        /**
         * A targeted Gift is immediately transferred to the Wish owner's
         * balance. There is intentionally no claim/status step: creating
         * the Gift represents the completed transfer of funds.
         */
        if (recipientUserId !== null && recipientBalance) {
          const recipientBalanceBefore = recipientBalance.amount;

          recipientBalance.credit(input.amount);

          const savedRecipientBalance =
            await userBalanceRepository.save(recipientBalance);

          await ledgerRepository.create(
            Ledger.create({
              userId: recipientUserId,
              currency: input.currency,
              amount: input.amount,
              balanceBefore: recipientBalanceBefore,
              balanceAfter: savedRecipientBalance.amount,
              type: LedgerType.TRANSFER_IN,
              referenceId: savedGift.id,
              metadata: {
                giftId: savedGift.id,
                wishId: savedGift.wishId,
                fromUserId: input.userId,
              },
            }),
          );
        }

        /**
         * The Gift is already persisted inside the same transaction.
         * Recalculate the received amount and complete the Wish only when
         * the target has been reached exactly.
         *
         * The distinction matters:
         *   target = 500, received = 400 -> ACTIVE
         *   target = 500, received = 500 -> COMPLETED
         *
         * The overflow case was already rejected above, so equality is
         * the correct completion condition.
         */
        if (wish && wish.targetAmount !== null) {
          const receivedAmount =
            await giftRepository.sumAmountByWishIdAndCurrency(
              wish.id,
              input.currency,
            );

          const remainingAmount = subtractDecimal(
            wish.targetAmount,
            receivedAmount,
          );

          if (isZeroDecimal(remainingAmount)) {
            wish.markCompleted();
            await wishRepository.save(wish);
          }
        }

        return savedGift;
      },
    );
  }
}
