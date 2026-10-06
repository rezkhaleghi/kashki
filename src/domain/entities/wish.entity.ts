import { randomUUID } from "crypto";

import { PaymentCurrency } from "@domain/enums/payment-currency.enum";
import { WishStatus } from "@domain/enums/wish-status.enum";
import {
  FieldMustExistException,
  InvalidWishTargetAmountException,
  WishCompletedException,
  WishCurrencyChangeNotAllowedException,
  WishTargetAmountTooLowException,
} from "@domain/exceptions/domain.exception";
import {
  isNegativeDecimal,
  isZeroDecimal,
  subtractDecimal,
} from "@domain/utils/decimal.util";

export interface CreateWishProps {
  id?: string;
  listId: string;
  title: string;
  description?: string | null;
  links?: string[];
  targetAmount?: string | null;
  currency?: PaymentCurrency | null;
  status?: WishStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateWishParams {
  title?: string;
  description?: string | null;
  links?: string[];
  targetAmount?: string | null;
  currency?: PaymentCurrency | null;
}

export interface RestoreWishProps {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  links: string[];
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
    public links: string[],
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
      [...(props.links ?? [])],
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
      [...props.links],
      props.targetAmount,
      props.currency,
      props.status,
      props.createdAt,
      props.updatedAt,
    );
  }

  update(params: UpdateWishParams, receivedAmount = "0"): void {
    if (this.status === WishStatus.COMPLETED) {
      if (
        params.targetAmount === undefined ||
        params.targetAmount === null ||
        this.targetAmount === null
      ) {
        throw new WishCompletedException();
      }

      const targetDelta = subtractDecimal(
        params.targetAmount,
        this.targetAmount,
      );

      const isIncreasingTarget =
        !isNegativeDecimal(targetDelta) && !isZeroDecimal(targetDelta);

      if (!isIncreasingTarget) {
        throw new WishCompletedException();
      }

      this.validateTargetAmount(params.targetAmount, receivedAmount);

      this.targetAmount = params.targetAmount;
      this.status = WishStatus.ACTIVE;
      this.updatedAt = new Date();

      return;
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

    if (params.links !== undefined) {
      this.links = [...params.links];
    }

    if (params.targetAmount !== undefined) {
      this.validateTargetAmount(params.targetAmount, receivedAmount);
      this.targetAmount = params.targetAmount;
    }

    if (params.currency !== undefined) {
      const hasReceivedGifts = !isZeroDecimal(receivedAmount);

      if (hasReceivedGifts && params.currency !== this.currency) {
        throw new WishCurrencyChangeNotAllowedException();
      }

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

  private validateTargetAmount(
    targetAmount: string | null,
    receivedAmount: string,
  ): void {
    if (targetAmount === null) {
      return;
    }

    if (isNegativeDecimal(targetAmount) || isZeroDecimal(targetAmount)) {
      throw new InvalidWishTargetAmountException();
    }

    const remainingAfterTarget = subtractDecimal(targetAmount, receivedAmount);

    if (isNegativeDecimal(remainingAfterTarget)) {
      throw new WishTargetAmountTooLowException();
    }
  }
}
