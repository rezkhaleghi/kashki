import { List } from "@domain/entities/list.entity";
import { Wish } from "@domain/entities/wish.entity";
import { ListVisibility } from "@domain/enums/list-visibility.enum";
import { PaymentCurrency } from "@domain/enums/payment-currency.enum";
import { ListNotFoundException } from "@domain/exceptions/domain.exception";
import { ListRepository } from "@domain/repositories/list.repository";
import { WishRepository } from "@domain/repositories/wish.repository";

import { CreateWishUseCase } from "./create-wish.use-case";

describe("CreateWishUseCase", () => {
  let useCase: CreateWishUseCase;
  let wishRepository: jest.Mocked<WishRepository>;
  let listRepository: jest.Mocked<ListRepository>;

  beforeEach(() => {
    wishRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      findByListIdAndId: jest.fn(),
      findPageByListId: jest.fn(),
      findPage: jest.fn(),
      deleteById: jest.fn(),
      findByIdForUpdate: jest.fn(),
    };

    listRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      findByUserIdAndId: jest.fn(),
      findPageByUserId: jest.fn(),
      findPage: jest.fn(),
      findByIdForUpdate: jest.fn(),
      deleteById: jest.fn(),
    };

    useCase = new CreateWishUseCase(wishRepository, listRepository);
  });

  it("should create a wish in an owned list with product links", async () => {
    const list = List.create({
      id: "list-1",
      userId: "user-1",
      name: "Birthday",
      visibility: ListVisibility.PUBLIC,
    });

    const links = [
      "https://www.amazon.com/dp/example",
      "https://www.digikala.com/product/example",
    ];

    const wish = Wish.create({
      id: "wish-1",
      listId: "list-1",
      title: "MacBook Pro",
      links,
      targetAmount: "1500",
      currency: PaymentCurrency.USD,
    });

    listRepository.findByUserIdAndId.mockResolvedValue(list);
    wishRepository.create.mockResolvedValue(wish);

    const result = await useCase.execute({
      userId: "user-1",
      listId: "list-1",
      title: "MacBook Pro",
      links,
      targetAmount: "1500",
      currency: PaymentCurrency.USD,
    });

    expect(result).toBe(wish);
    expect(listRepository.findByUserIdAndId).toHaveBeenCalledWith(
      "user-1",
      "list-1",
    );
    expect(wishRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        listId: "list-1",
        title: "MacBook Pro",
        links,
        targetAmount: "1500",
        currency: PaymentCurrency.USD,
      }),
    );
  });

  it("should create a wish without links", async () => {
    const list = List.create({
      id: "list-1",
      userId: "user-1",
      name: "Birthday",
    });

    const wish = Wish.create({
      listId: "list-1",
      title: "Surprise me",
    });

    listRepository.findByUserIdAndId.mockResolvedValue(list);
    wishRepository.create.mockResolvedValue(wish);

    const result = await useCase.execute({
      userId: "user-1",
      listId: "list-1",
      title: "Surprise me",
    });

    expect(result).toBe(wish);
    expect(result.links).toEqual([]);
    expect(wishRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        links: [],
      }),
    );
  });

  it("should allow a targetless wish with links", async () => {
    const list = List.create({
      id: "list-1",
      userId: "user-1",
      name: "Birthday",
    });

    const links = ["https://example.com/product"];

    const wish = Wish.create({
      listId: "list-1",
      title: "Surprise me",
      links,
    });

    listRepository.findByUserIdAndId.mockResolvedValue(list);
    wishRepository.create.mockResolvedValue(wish);

    const result = await useCase.execute({
      userId: "user-1",
      listId: "list-1",
      title: "Surprise me",
      links,
    });

    expect(result).toBe(wish);
    expect(result.links).toEqual(links);
    expect(wishRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        links,
      }),
    );
  });

  it("should reject creating a wish in a list the user does not own", async () => {
    listRepository.findByUserIdAndId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: "user-1",
        listId: "list-1",
        title: "MacBook Pro",
        links: ["https://example.com/product"],
      }),
    ).rejects.toBeInstanceOf(ListNotFoundException);

    expect(wishRepository.create).not.toHaveBeenCalled();
  });

  it("should propagate repository errors", async () => {
    const error = new Error("Database error");

    listRepository.findByUserIdAndId.mockRejectedValue(error);

    await expect(
      useCase.execute({
        userId: "user-1",
        listId: "list-1",
        title: "MacBook Pro",
      }),
    ).rejects.toThrow(error);
  });
});
