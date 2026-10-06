import { List } from "@domain/entities/list.entity";
import { Wish } from "@domain/entities/wish.entity";
import { GiftRepository } from "@domain/repositories/gift.repository";
import { ListRepository } from "@domain/repositories/list.repository";
import { WishRepository } from "@domain/repositories/wish.repository";

import { ListVisibility } from "@domain/enums/list-visibility.enum";
import { PaymentCurrency } from "@domain/enums/payment-currency.enum";

import {
  ListAccessNotAllowedException,
  ListNotFoundException,
  WishNotFoundException,
} from "@domain/exceptions/domain.exception";

import { ListGiftsUseCase } from "./list-gifts.use-case";

describe("ListGiftsUseCase", () => {
  const wishId = "wish-id";
  const listId = "list-id";
  const ownerId = "owner-id";

  let useCase: ListGiftsUseCase;
  let giftRepository: jest.Mocked<GiftRepository>;
  let wishRepository: jest.Mocked<WishRepository>;
  let listRepository: jest.Mocked<ListRepository>;

  const wish = Wish.create({
    id: wishId,
    listId,
    title: "MacBook",
    currency: PaymentCurrency.USD,
    targetAmount: "1000",
  });

  let list = List.create({
    id: listId,
    userId: ownerId,
    name: "Birthday",
    visibility: ListVisibility.PUBLIC,
  });

  beforeEach(() => {
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
    await useCase.execute({
      wishId,
      page: 1,
      limit: 20,
    });

    expect(giftRepository.findPageByWishId).toHaveBeenCalledWith(
      wishId,
      expect.objectContaining({
        page: 1,
        limit: 20,
      }),
    );
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
  });
});
