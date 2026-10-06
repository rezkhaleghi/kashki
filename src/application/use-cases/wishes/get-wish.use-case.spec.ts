import { List } from "@domain/entities/list.entity";
import { Wish } from "@domain/entities/wish.entity";
import { ListVisibility } from "@domain/enums/list-visibility.enum";
import {
  ListAccessNotAllowedException,
  ListNotFoundException,
  WishNotFoundException,
} from "@domain/exceptions/domain.exception";
import { ListRepository } from "@domain/repositories/list.repository";
import { WishRepository } from "@domain/repositories/wish.repository";

import { GetWishUseCase } from "./get-wish.use-case";

describe("GetWishUseCase", () => {
  let useCase: GetWishUseCase;
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
      deleteById: jest.fn(),
      findByIdForUpdate: jest.fn(),
    };

    useCase = new GetWishUseCase(wishRepository, listRepository);
  });

  it("should return a wish from a public list", async () => {
    const list = List.create({
      id: "list-1",
      userId: "owner-1",
      name: "Birthday",
      visibility: ListVisibility.PUBLIC,
    });

    const wish = Wish.create({
      id: "wish-1",
      listId: "list-1",
      title: "MacBook Pro",
    });

    listRepository.findById.mockResolvedValue(list);
    wishRepository.findByListIdAndId.mockResolvedValue(wish);

    const result = await useCase.execute({
      listId: "list-1",
      wishId: "wish-1",
    });

    expect(result).toBe(wish);
  });

  it("should return a wish from an unlisted list", async () => {
    const list = List.create({
      id: "list-1",
      userId: "owner-1",
      name: "Birthday",
      visibility: ListVisibility.UNLISTED,
    });

    const wish = Wish.create({
      id: "wish-1",
      listId: "list-1",
      title: "MacBook Pro",
    });

    listRepository.findById.mockResolvedValue(list);
    wishRepository.findByListIdAndId.mockResolvedValue(wish);

    const result = await useCase.execute({
      listId: "list-1",
      wishId: "wish-1",
    });

    expect(result).toBe(wish);
  });

  it("should allow the owner to view a wish in a private list", async () => {
    const list = List.create({
      id: "list-1",
      userId: "owner-1",
      name: "Birthday",
      visibility: ListVisibility.PRIVATE,
    });

    const wish = Wish.create({
      id: "wish-1",
      listId: "list-1",
      title: "MacBook Pro",
    });

    listRepository.findById.mockResolvedValue(list);
    wishRepository.findByListIdAndId.mockResolvedValue(wish);

    const result = await useCase.execute({
      listId: "list-1",
      wishId: "wish-1",
      requesterUserId: "owner-1",
    });

    expect(result).toBe(wish);
  });

  it("should reject a private list for another user", async () => {
    const list = List.create({
      id: "list-1",
      userId: "owner-1",
      name: "Birthday",
      visibility: ListVisibility.PRIVATE,
    });

    listRepository.findById.mockResolvedValue(list);

    await expect(
      useCase.execute({
        listId: "list-1",
        wishId: "wish-1",
        requesterUserId: "user-2",
      }),
    ).rejects.toBeInstanceOf(ListAccessNotAllowedException);

    expect(wishRepository.findByListIdAndId).not.toHaveBeenCalled();
  });

  it("should reject an unknown list", async () => {
    listRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        listId: "missing-list",
        wishId: "wish-1",
      }),
    ).rejects.toBeInstanceOf(ListNotFoundException);
  });

  it("should reject an unknown wish", async () => {
    const list = List.create({
      id: "list-1",
      userId: "owner-1",
      name: "Birthday",
      visibility: ListVisibility.PUBLIC,
    });

    listRepository.findById.mockResolvedValue(list);
    wishRepository.findByListIdAndId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        listId: "list-1",
        wishId: "missing-wish",
      }),
    ).rejects.toBeInstanceOf(WishNotFoundException);
  });

  it("should not allow a wish ID from another list to bypass the requested list", async () => {
    const list = List.create({
      id: "list-1",
      userId: "owner-1",
      name: "Birthday",
      visibility: ListVisibility.PUBLIC,
    });

    listRepository.findById.mockResolvedValue(list);
    wishRepository.findByListIdAndId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        listId: "list-1",
        wishId: "wish-from-list-2",
      }),
    ).rejects.toBeInstanceOf(WishNotFoundException);

    expect(wishRepository.findByListIdAndId).toHaveBeenCalledWith(
      "list-1",
      "wish-from-list-2",
    );
  });
});
