import { randomUUID } from "crypto";

import { PaymentCurrency } from "@domain/enums/payment-currency.enum";
import { WishStatus } from "@domain/enums/wish-status.enum";
import {
  FieldMustExistException,
  InvalidWishTargetAmountException,
  WishCompletedException,
} from "@domain/exceptions/domain.exception";
import { isNegativeDecimal, isZeroDecimal } from "@domain/utils/decimal.util";

export interface CreateWishProps {
  id?: string;
  listId: string;
  title: string;
  description?: string | null;
  targetAmount?: string | null;
  currency?: PaymentCurrency | null;
  status?: WishStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateWishParams {
  title?: string;
  description?: string | null;
  targetAmount?: string | null;
  currency?: PaymentCurrency | null;
}

export interface RestoreWishProps {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  targetAmount: string | null;
  currency: PaymentCurrency | null;
  status: WishStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class Wish {
  private constructor(
    public readonly id: string,
    public readonly listId: string,
    public title: string,
    public description: string | null,
    public targetAmount: string | null,
    public currency: PaymentCurrency | null,
    private status: WishStatus,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  getStatus(): WishStatus {
    return this.status;
  }

  static create(props: CreateWishProps): Wish {
    if (!props.listId.trim()) {
      throw new FieldMustExistException("Wish list ID");
    }

    const title = props.title.trim();

    if (!title) {
      throw new FieldMustExistException("Wish title");
    }

    if (
      props.targetAmount !== undefined &&
      props.targetAmount !== null &&
      (isNegativeDecimal(props.targetAmount) ||
        isZeroDecimal(props.targetAmount))
    ) {
      throw new InvalidWishTargetAmountException();
    }

    const now = new Date();

    return new Wish(
      props.id ?? randomUUID(),
      props.listId,
      title,
      props.description?.trim() ?? null,
      props.targetAmount ?? null,
      props.currency ?? null,
      props.status ?? WishStatus.ACTIVE,
      props.createdAt ?? now,
      props.updatedAt ?? now,
    );
  }

  static restore(props: RestoreWishProps): Wish {
    return new Wish(
      props.id,
      props.listId,
      props.title,
      props.description,
      props.targetAmount,
      props.currency,
      props.status,
      props.createdAt,
      props.updatedAt,
    );
  }

  update(params: UpdateWishParams): void {
    if (this.status === WishStatus.COMPLETED) {
      throw new WishCompletedException();
    }

    if (params.title !== undefined) {
      const title = params.title.trim();

      if (!title) {
        throw new FieldMustExistException("Wish title");
      }

      this.title = title;
    }

    if (params.description !== undefined) {
      this.description = params.description?.trim() ?? null;
    }

    if (params.targetAmount !== undefined) {
      if (
        params.targetAmount !== null &&
        (isNegativeDecimal(params.targetAmount) ||
          isZeroDecimal(params.targetAmount))
      ) {
        throw new InvalidWishTargetAmountException();
      }

      this.targetAmount = params.targetAmount;
    }

    if (params.currency !== undefined) {
      this.currency = params.currency;
    }

    this.updatedAt = new Date();
  }

  markCompleted(): void {
    if (this.status === WishStatus.COMPLETED) {
      throw new WishCompletedException();
    }

    this.status = WishStatus.COMPLETED;
    this.updatedAt = new Date();
  }
}
