import { Gift } from "@domain/entities/gift.entity";
import { GiftNotFoundException } from "@domain/exceptions/domain.exception";
import { GiftRepository } from "@domain/repositories/gift.repository";
import { PaymentCurrency } from "@domain/enums/payment-currency.enum";

import { AdminGetGiftUseCase } from "./get-gift.use-case";

describe("AdminGetGiftUseCase", () => {
  let useCase: AdminGetGiftUseCase;
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
    };

    useCase = new AdminGetGiftUseCase(giftRepository);
  });

  it("should return the gift when it exists", async () => {
    const gift = Gift.create({
      id: "gift-id",
      userId: "user-id",
      wishId: "wish-id",
      amount: "100",
      currency: PaymentCurrency.USD,
    });

    giftRepository.findById.mockResolvedValue(gift);

    const result = await useCase.execute("gift-id");

    expect(result).toBe(gift);
    expect(giftRepository.findById).toHaveBeenCalledWith("gift-id");
  });

  it("should throw GiftNotFoundException when the gift does not exist", async () => {
    giftRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute("gift-id")).rejects.toThrow(
      GiftNotFoundException,
    );

    expect(giftRepository.findById).toHaveBeenCalledWith("gift-id");
  });

  it("should propagate repository errors", async () => {
    const error = new Error("Database error");

    giftRepository.findById.mockRejectedValue(error);

    await expect(useCase.execute("gift-id")).rejects.toThrow(error);
  });
});
