import { randomUUID } from "crypto";

import { PaymentCurrency } from "@domain/enums/payment-currency.enum";
import {
  FieldMustExistException,
  InvalidGiftAmountException,
} from "@domain/exceptions/domain.exception";
import { isNegativeDecimal, isZeroDecimal } from "@domain/utils/decimal.util";

export interface CreateGiftProps {
  id?: string;
  userId: string;
  recipientUserId: string;
  wishId?: string | null;
  amount: string;
  currency: PaymentCurrency;
  anonymous?: boolean;
  message?: string | null;
  createdAt?: Date;
}

export interface RestoreGiftProps {
  id: string;
  userId: string;
  recipientUserId: string;
  wishId: string | null;
  amount: string;
  currency: PaymentCurrency;
  anonymous: boolean;
  message: string | null;
  createdAt: Date;
}

export class Gift {
  private constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly recipientUserId: string,
    public readonly wishId: string | null,
    public readonly amount: string,
    public readonly currency: PaymentCurrency,
    public readonly anonymous: boolean,
    public readonly message: string | null,
    public readonly createdAt: Date,
  ) {}

  /**
   * A Gift represents a completed money transfer.
   *
   * recipientUserId is intentionally part of the financial record instead of
   * being inferred later from the Wish. General cash gifts have no Wish, and
   * historical records must remain understandable even if Wish data changes.
   */
  static create(props: CreateGiftProps): Gift {
    if (!props.userId.trim()) {
      throw new FieldMustExistException("Gift user ID");
    }

    if (!props.recipientUserId.trim()) {
      throw new FieldMustExistException("Gift recipient user ID");
    }

    if (isNegativeDecimal(props.amount) || isZeroDecimal(props.amount)) {
      throw new InvalidGiftAmountException();
    }

    return new Gift(
      props.id ?? randomUUID(),
      props.userId,
      props.recipientUserId,
      props.wishId?.trim() || null,
      props.amount,
      props.currency,
      props.anonymous ?? false,
      props.message?.trim() || null,
      props.createdAt ?? new Date(),
    );
  }

  /**
   * Rehydrates persisted state without applying creation defaults.
   */
  static restore(props: RestoreGiftProps): Gift {
    return new Gift(
      props.id,
      props.userId,
      props.recipientUserId,
      props.wishId,
      props.amount,
      props.currency,
      props.anonymous,
      props.message,
      props.createdAt,
    );
  }
}
