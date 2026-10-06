import { Injectable } from "@nestjs/common";

import { UnitOfWork } from "@application/interfaces/unit-of-work.interface";

import { Gift } from "@domain/entities/gift.entity";
import { Ledger } from "@domain/entities/ledger.entity";
import { Notification } from "@domain/entities/notification.entity";

import { ListVisibility } from "@domain/enums/list-visibility.enum";
import { LedgerType } from "@domain/enums/ledger-type.enum";
import { NotificationChannel } from "@domain/enums/notification-channel.enum";
import { NotificationType } from "@domain/enums/notification-type.enum";
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

export interface CreateGiftInput {
  userId: string;
  recipientUserId?: string | null;
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
        notificationRepository,
      }) => {
        let wish = null;
        let recipientUserId: string | null = null;

        if (input.wishId) {
          const existingWish = await wishRepository.findById(input.wishId);

          if (!existingWish) {
            throw new WishNotFoundException();
          }

          /**
           * List is the synchronization boundary shared with List deletion.
           * Always acquire List before Wish for targeted Gift operations.
           */
          const list = await listRepository.findByIdForUpdate(
            existingWish.listId,
          );

          if (!list) {
            throw new ListNotFoundException();
          }

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

          wish = await wishRepository.findByIdForUpdate(input.wishId);

          if (!wish) {
            throw new WishNotFoundException();
          }

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
        } else {
          /**
           * General cash gifts have no Wish from which a recipient can be
           * inferred, so the recipient must be explicit.
           */
          recipientUserId = input.recipientUserId?.trim() || null;

          if (!recipientUserId) {
            throw new UserBalanceNotFoundException(input.currency);
          }
        }

        let giverBalance = null;
        let recipientBalance = null;

        if (recipientUserId === input.userId) {
          giverBalance =
            await userBalanceRepository.findByUserIdAndCurrencyForUpdate(
              input.userId,
              input.currency,
            );

          recipientBalance = giverBalance;
        } else {
          /**
           * Both balance rows participate in the same transfer. Lock them in
           * deterministic user-ID order to prevent A -> B and B -> A
           * deadlocks.
           */
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

        if (!recipientBalance) {
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
          recipientUserId,
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
            balanceBefore: giverBalanceBefore,
            balanceAfter: savedGiverBalance.amount,
            type: LedgerType.TRANSFER_OUT,
            referenceId: savedGift.id,
            metadata: {
              giftId: savedGift.id,
              wishId: savedGift.wishId,
              recipientUserId,
            },
          }),
        );

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

        /**
         * The notification is persisted through the same UnitOfWork as the
         * financial transfer. Therefore a rolled-back Gift transaction cannot
         * leave behind a false "gift received" notification.
         *
         * We only create an in-app notification here. External delivery
         * channels remain independent from the financial transaction.
         */
        const wishDescription = wish ? ` for your "${wish.title}" wish` : "";

        const notification = Notification.create({
          userId: recipientUserId,
          type: NotificationType.GIFT_RECEIVED,
          channel: NotificationChannel.IN_APP,
          title: "You received a gift 🎁",
          message: input.anonymous
            ? `You received an anonymous gift of ${input.amount} ${input.currency}${wishDescription}.`
            : `You received a gift of ${input.amount} ${input.currency}${wishDescription}.`,
          referenceId: savedGift.id,
        });

        notification.markSent();

        await notificationRepository.create(notification);

        return savedGift;
      },
    );
  }
}
