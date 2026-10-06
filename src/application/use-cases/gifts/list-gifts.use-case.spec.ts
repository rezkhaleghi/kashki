import { Gift } from "@domain/entities/gift.entity";
import { List } from "@domain/entities/list.entity";
import { Wish } from "@domain/entities/wish.entity";

import { ListVisibility } from "@domain/enums/list-visibility.enum";
import { PaymentCurrency } from "@domain/enums/payment-currency.enum";

import {
  ListAccessNotAllowedException,
  ListNotFoundException,
  WishNotFoundException,
} from "@domain/exceptions/domain.exception";

import { GiftRepository } from "@domain/repositories/gift.repository";
import { ListRepository } from "@domain/repositories/list.repository";
import { WishRepository } from "@domain/repositories/wish.repository";

import { ListGiftsUseCase } from "./list-gifts.use-case";

describe("ListGiftsUseCase", () => {
  const wishId = "wish-id";
  const listId = "list-id";
  const ownerId = "owner-id";
  const giverId = "giver-id";

  let useCase: ListGiftsUseCase;
  let giftRepository: jest.Mocked<GiftRepository>;
  let wishRepository: jest.Mocked<WishRepository>;
  let listRepository: jest.Mocked<ListRepository>;

  let wish: Wish;
  let list: List;

  beforeEach(() => {
    wish = Wish.create({
      id: wishId,
      listId,
      title: "MacBook",
      currency: PaymentCurrency.USD,
      targetAmount: "1000",
    });

    list = List.create({
      id: listId,
      userId: ownerId,
      name: "Birthday",
      visibility: ListVisibility.PUBLIC,
    });

    giftRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findPageByWishId: jest.fn(),
      findPageByUserId: jest.fn(),
      sumAmountByWishIdAndCurrency: jest.fn(),
      existsByWishId: jest.fn(),
    } as unknown as jest.Mocked<GiftRepository>;

    wishRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      findByIdForUpdate: jest.fn(),
      findByListIdAndId: jest.fn(),
      findPageByListId: jest.fn(),
      findPage: jest.fn(),
      deleteById: jest.fn(),
    } as unknown as jest.Mocked<WishRepository>;

    listRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      findByUserIdAndId: jest.fn(),
      findPageByUserId: jest.fn(),
      findPage: jest.fn(),
      deleteById: jest.fn(),
    } as unknown as jest.Mocked<ListRepository>;

    useCase = new ListGiftsUseCase(
      giftRepository,
      wishRepository,
      listRepository,
    );

    wishRepository.findById.mockResolvedValue(wish);
    listRepository.findById.mockResolvedValue(list);

    giftRepository.findPageByWishId.mockResolvedValue({
      data: [],
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it("lists gifts on a public wish", async () => {
    const gift = Gift.create({
      id: "gift-1",
      userId: giverId,
      wishId,
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

    giftRepository.findPageByWishId.mockResolvedValue(pageResult);

    const result = await useCase.execute({
      wishId,
      page: 1,
      limit: 20,
      sortBy: "createdAt",
      sortDirection: "DESC",
    });

    expect(result).toEqual({
      ...pageResult,
      data: [gift],
    });

    expect(giftRepository.findPageByWishId).toHaveBeenCalledWith(wishId, {
      page: 1,
      limit: 20,
      sortBy: "createdAt",
      sortDirection: "DESC",
    });
  });

  it("hides the giver identity for anonymous gifts", async () => {
    const anonymousGift = Gift.create({
      id: "gift-1",
      userId: giverId,
      wishId,
      amount: "100",
      currency: PaymentCurrency.USD,
      anonymous: true,
    });

    giftRepository.findPageByWishId.mockResolvedValue({
      data: [anonymousGift],
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });

    const result = await useCase.execute({
      wishId,
      page: 1,
      limit: 20,
    });

    expect(result.data[0]).toEqual(
      expect.objectContaining({
        id: "gift-1",
        amount: "100",
        anonymous: true,
        userId: null,
      }),
    );
  });

  it("preserves the giver identity for non-anonymous gifts", async () => {
    const gift = Gift.create({
      id: "gift-1",
      userId: giverId,
      wishId,
      amount: "100",
      currency: PaymentCurrency.USD,
      anonymous: false,
    });

    giftRepository.findPageByWishId.mockResolvedValue({
      data: [gift],
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });

    const result = await useCase.execute({
      wishId,
      page: 1,
      limit: 20,
    });

    expect(result.data[0].userId).toBe(giverId);
  });

  it("lists gifts on an unlisted wish when the list ID is known", async () => {
    list = List.create({
      id: listId,
      userId: ownerId,
      name: "Birthday",
      visibility: ListVisibility.UNLISTED,
    });

    listRepository.findById.mockResolvedValue(list);

    await expect(
      useCase.execute({
        wishId,
        page: 1,
        limit: 20,
      }),
    ).resolves.toBeDefined();
  });

  it("allows the owner to list gifts on a private wish", async () => {
    list = List.create({
      id: listId,
      userId: ownerId,
      name: "Birthday",
      visibility: ListVisibility.PRIVATE,
    });

    listRepository.findById.mockResolvedValue(list);

    await expect(
      useCase.execute({
        wishId,
        requesterUserId: ownerId,
        page: 1,
        limit: 20,
      }),
    ).resolves.toBeDefined();
  });

  it("rejects another user from a private wish", async () => {
    list = List.create({
      id: listId,
      userId: ownerId,
      name: "Birthday",
      visibility: ListVisibility.PRIVATE,
    });

    listRepository.findById.mockResolvedValue(list);

    await expect(
      useCase.execute({
        wishId,
        requesterUserId: "other-user",
        page: 1,
        limit: 20,
      }),
    ).rejects.toThrow(ListAccessNotAllowedException);

    expect(giftRepository.findPageByWishId).not.toHaveBeenCalled();
  });

  it("rejects a missing wish", async () => {
    wishRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        wishId,
        page: 1,
        limit: 20,
      }),
    ).rejects.toThrow(WishNotFoundException);

    expect(giftRepository.findPageByWishId).not.toHaveBeenCalled();
  });

  it("rejects a missing list", async () => {
    listRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        wishId,
        page: 1,
        limit: 20,
      }),
    ).rejects.toThrow(ListNotFoundException);

    expect(giftRepository.findPageByWishId).not.toHaveBeenCalled();
  });
});
