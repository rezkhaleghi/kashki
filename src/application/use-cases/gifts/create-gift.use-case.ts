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
        let wish = null;
        let recipientUserId: string | null = null;

        if (input.wishId) {
          /**
           * Read the Wish without a lock only to discover its List.
           *
           * The Wish itself must not be locked yet because List deletion
           * uses the List as its synchronization boundary. Targeted Gifts
           * therefore follow the same lock hierarchy:
           *
           *   List -> Wish -> balances
           *
           * This prevents Gift creation and List deletion from acquiring
           * List/Wish locks in opposite orders.
           */
          const existingWish = await wishRepository.findById(input.wishId);

          if (!existingWish) {
            throw new WishNotFoundException();
          }

          /**
           * Lock the List before locking the Wish.
           *
           * The List lock synchronizes this Gift operation with operations
           * such as List deletion.
           */
          const list = await listRepository.findByIdForUpdate(
            existingWish.listId,
          );

          if (!list) {
            throw new ListNotFoundException();
          }

          /**
           * The first Wish lookup was intentionally unlocked, so its
           * relationship cannot be treated as authoritative after the List
           * lock is acquired.
           *
           * If the locked List does not match the List recorded by the Wish,
           * stop before acquiring the Wish lock.
           *
           * ListNotFoundException is used here because the List resolved for
           * the Gift is not the List that owns the requested Wish.
           */
          if (list.id !== existingWish.listId) {
            throw new ListNotFoundException();
          }

          if (
            list.visibility === ListVisibility.PRIVATE &&
            list.userId !== input.userId
          ) {
            throw new ListAccessNotAllowedException();
          }

          recipientUserId = list.userId;

          /**
           * Only after the List has been locked and validated do we lock the
           * Wish.
           *
           * At this point the authoritative lock order is:
           *
           *   locked List -> locked Wish
           */
          wish = await wishRepository.findByIdForUpdate(input.wishId);

          if (!wish) {
            throw new WishNotFoundException();
          }

          /**
           * Verify that the authoritative locked Wish still belongs to the
           * List we locked above.
           *
           * This protects against using stale relationship data from the
           * initial unlocked Wish lookup.
           */
          if (wish.listId !== list.id) {
            throw new ListNotFoundException();
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

        /**
         * Balance rows are locked only after the List and Wish locks.
         *
         * Targeted Gift:
         *
         *   List -> Wish -> balances
         *
         * General cash Gift:
         *
         *   balances
         *
         * Balance locks themselves use deterministic user-ID ordering so
         * simultaneous transfers such as A -> B and B -> A cannot acquire
         * the two balance rows in opposite orders.
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
         * The outgoing ledger entry references the Gift. The recipient's
         * incoming entry below uses the same referenceId so both ledger
         * entries can be traced back to the same transfer.
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
         * A targeted Gift immediately transfers the money to the Wish
         * owner's balance. There is deliberately no separate claim/status
         * step: creating the Gift means the transfer is complete.
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
         * The Gift and balance changes are inside the same transaction.
         *
         * Recalculate the Wish's received amount and mark it completed only
         * when it reaches the target exactly. Overflow was already rejected
         * before the transfer.
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
