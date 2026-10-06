import { Gift } from "@domain/entities/gift.entity";
import { PaymentCurrency } from "@domain/enums/payment-currency.enum";
import { GiftRepository } from "@domain/repositories/gift.repository";

import { AdminListGiftsUseCase } from "./list-gifts.use-case";

describe("Admin ListGiftsUseCase", () => {
  let useCase: AdminListGiftsUseCase;
  let giftRepository: jest.Mocked<GiftRepository>;

  beforeEach(() => {
    giftRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findPageByWishId: jest.fn(),
      findPageByUserId: jest.fn(),
      findPage: jest.fn(),
      sumAmountByWishIdAndCurrency: jest.fn(),
      existsByWishId: jest.fn(),
      existsByListId: jest.fn(),
    } as unknown as jest.Mocked<GiftRepository>;

    useCase = new AdminListGiftsUseCase(giftRepository);
  });

  it("lists gifts", async () => {
    const gift = Gift.create({
      userId: "user-id",
      recipientUserId: "recipient-user-id",
      wishId: "wish-id",
      amount: "100",
      currency: PaymentCurrency.USD,
    });

    const pageResult = {
      data: [gift],
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    };

    giftRepository.findPage.mockResolvedValue(pageResult);

    const result = await useCase.execute({
      page: 1,
      limit: 20,
    });

    expect(result).toEqual(pageResult);
    expect(giftRepository.findPage).toHaveBeenCalled();
  });
});
