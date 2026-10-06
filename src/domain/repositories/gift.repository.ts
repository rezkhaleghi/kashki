import { Gift } from "@domain/entities/gift.entity";
import { PaymentCurrency } from "@domain/enums/payment-currency.enum";
import { PageQuery, PageResult } from "@shared/pagination/page-query";

export interface GiftFilters {
  userId?: string;
  wishId?: string;
  currency?: PaymentCurrency;
}

export abstract class GiftRepository {
  abstract create(gift: Gift): Promise<Gift>;

  abstract findById(id: string): Promise<Gift | null>;

  abstract findPageByWishId(
    wishId: string,
    params: PageQuery<"createdAt" | "amount">,
  ): Promise<PageResult<Gift>>;

  abstract findPageByUserId(
    userId: string,
    params: PageQuery<"createdAt" | "amount">,
  ): Promise<PageResult<Gift>>;

  abstract findPage(
    filters: GiftFilters,
    params: PageQuery<"createdAt" | "amount">,
  ): Promise<PageResult<Gift>>;

  abstract sumAmountByWishIdAndCurrency(
    wishId: string,
    currency: PaymentCurrency,
  ): Promise<string>;

  abstract existsByWishId(wishId: string): Promise<boolean>;

  /**
   * Used by List deletion to determine whether any Wish under the List
   * already has a Gift without loading all Wishes or Gifts.
   */
  abstract existsByListId(listId: string): Promise<boolean>;
}
