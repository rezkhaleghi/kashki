import { Gift } from "@domain/entities/gift.entity";
import { GiftRepository } from "@domain/repositories/gift.repository";
import { PaymentCurrency } from "@domain/enums/payment-currency.enum";

import { AdminListGiftsUseCase } from "./list-gifts.use-case";

describe("AdminListGiftsUseCase", () => {
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
    };

    useCase = new AdminListGiftsUseCase(giftRepository);
  });

  it("should return a paginated list of gifts", async () => {
    const gift = Gift.create({
      userId: "user-id",
      wishId: "wish-id",
      amount: "100",
      currency: PaymentCurrency.USD,
    });

    const pageResult = {
      data: [gift],
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    };

    giftRepository.findPage.mockResolvedValue(pageResult);

    const result = await useCase.execute({
      page: 1,
      limit: 10,
      sortBy: "createdAt",
      sortDirection: "DESC",
    });

    expect(result).toEqual(pageResult);
    expect(giftRepository.findPage).toHaveBeenCalledWith(
      {
        userId: undefined,
        wishId: undefined,
        currency: undefined,
      },
      {
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortDirection: "DESC",
      },
    );
  });

  it("should pass filters to the repository", async () => {
    const pageResult = {
      data: [],
      page: 2,
      limit: 20,
      total: 0,
      totalPages: 0,
    };

    giftRepository.findPage.mockResolvedValue(pageResult);

    const result = await useCase.execute({
      userId: "user-id",
      wishId: "wish-id",
      currency: PaymentCurrency.EUR,
      page: 2,
      limit: 20,
      sortBy: "amount",
      sortDirection: "ASC",
    });

    expect(result).toEqual(pageResult);
    expect(giftRepository.findPage).toHaveBeenCalledWith(
      {
        userId: "user-id",
        wishId: "wish-id",
        currency: PaymentCurrency.EUR,
      },
      {
        page: 2,
        limit: 20,
        sortBy: "amount",
        sortDirection: "ASC",
      },
    );
  });

  it("should propagate repository errors", async () => {
    const error = new Error("Database error");

    giftRepository.findPage.mockRejectedValue(error);

    await expect(
      useCase.execute({
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortDirection: "DESC",
      }),
    ).rejects.toThrow(error);
  });
});
