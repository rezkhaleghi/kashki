import { List } from "@domain/entities/list.entity";
import { Wish } from "@domain/entities/wish.entity";
import { ListVisibility } from "@domain/enums/list-visibility.enum";
import {
  ListAccessNotAllowedException,
  ListNotFoundException,
} from "@domain/exceptions/domain.exception";
import { ListRepository } from "@domain/repositories/list.repository";
import { WishRepository } from "@domain/repositories/wish.repository";

import { ListWishesUseCase } from "./list-wishes.use-case";

describe("ListWishesUseCase", () => {
  let useCase: ListWishesUseCase;
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
    };

    useCase = new ListWishesUseCase(wishRepository, listRepository);
  });

  it("should list wishes from a public list anonymously", async () => {
    const list = List.create({
      id: "list-1",
      userId: "owner-1",
      name: "Birthday",
      visibility: ListVisibility.PUBLIC,
    });

    const wish = Wish.create({
      listId: "list-1",
      title: "MacBook Pro",
    });

    const pageResult = {
      data: [wish],
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    };

    listRepository.findById.mockResolvedValue(list);
    wishRepository.findPageByListId.mockResolvedValue(pageResult);

    const result = await useCase.execute({
      listId: "list-1",
      page: 1,
      limit: 10,
      sortBy: "createdAt",
      sortDirection: "DESC",
    });

    expect(result).toEqual(pageResult);
    expect(wishRepository.findPageByListId).toHaveBeenCalledWith("list-1", {
      page: 1,
      limit: 10,
      sortBy: "createdAt",
      sortDirection: "DESC",
    });
  });

  it("should list wishes from an unlisted list when the list ID is known", async () => {
    const list = List.create({
      id: "list-1",
      userId: "owner-1",
      name: "Birthday",
      visibility: ListVisibility.UNLISTED,
    });

    const pageResult = {
      data: [],
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    };

    listRepository.findById.mockResolvedValue(list);
    wishRepository.findPageByListId.mockResolvedValue(pageResult);

    const result = await useCase.execute({
      listId: "list-1",
      page: 1,
      limit: 10,
      sortBy: "title",
      sortDirection: "ASC",
    });

    expect(result).toEqual(pageResult);
  });

  it("should allow the owner to list wishes from a private list", async () => {
    const list = List.create({
      id: "list-1",
      userId: "owner-1",
      name: "Birthday",
      visibility: ListVisibility.PRIVATE,
    });

    const pageResult = {
      data: [],
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    };

    listRepository.findById.mockResolvedValue(list);
    wishRepository.findPageByListId.mockResolvedValue(pageResult);

    const result = await useCase.execute({
      listId: "list-1",
      requesterUserId: "owner-1",
      page: 1,
      limit: 10,
      sortBy: "createdAt",
      sortDirection: "DESC",
    });

    expect(result).toEqual(pageResult);
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
        requesterUserId: "user-2",
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortDirection: "DESC",
      }),
    ).rejects.toBeInstanceOf(ListAccessNotAllowedException);

    expect(wishRepository.findPageByListId).not.toHaveBeenCalled();
  });

  it("should reject an unknown list", async () => {
    listRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        listId: "missing-list",
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortDirection: "DESC",
      }),
    ).rejects.toBeInstanceOf(ListNotFoundException);
  });
});
