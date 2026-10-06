import { Injectable } from "@nestjs/common";

import { Gift } from "@domain/entities/gift.entity";
import { GiftRepository } from "@domain/repositories/gift.repository";
import { PaymentCurrency } from "@domain/enums/payment-currency.enum";
import { PageQuery, PageResult } from "@shared/pagination/page-query";

export interface AdminListGiftsInput extends PageQuery<"createdAt" | "amount"> {
  userId?: string;
  wishId?: string;
  currency?: PaymentCurrency;
}

@Injectable()
export class AdminListGiftsUseCase {
  constructor(private readonly giftRepository: GiftRepository) {}

  async execute(input: AdminListGiftsInput): Promise<PageResult<Gift>> {
    return this.giftRepository.findPage(
      {
        userId: input.userId,
        wishId: input.wishId,
        currency: input.currency,
      },
      {
        page: input.page,
        limit: input.limit,
        sortBy: input.sortBy,
        sortDirection: input.sortDirection,
      },
    );
  }
}
