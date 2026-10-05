import { AdminListListsUseCase } from "./list-lists.use-case";

import { List } from "@domain/entities/list.entity";
import { ListVisibility } from "@domain/enums/list-visibility.enum";
import { ListRepository } from "@domain/repositories/list.repository";

describe("AdminListListsUseCase", () => {
  let useCase: AdminListListsUseCase;
  let listRepository: jest.Mocked<ListRepository>;

  beforeEach(() => {
    listRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      findByUserIdAndId: jest.fn(),
      findPageByUserId: jest.fn(),
      findPage: jest.fn(),
      deleteById: jest.fn(),
    };

    useCase = new AdminListListsUseCase(listRepository);
  });

  it("should return a paginated list of all lists", async () => {
    const list = List.create({
      userId: "user-id",
      name: "Birthday Wishlist",
      visibility: ListVisibility.PUBLIC,
    });

    const pageResult = {
      data: [list],
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    };

    listRepository.findPage.mockResolvedValue(pageResult);

    const result = await useCase.execute({
      page: 1,
      limit: 10,
      sortBy: "createdAt",
      sortDirection: "DESC",
    });

    expect(result).toEqual(pageResult);
    expect(listRepository.findPage).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      sortBy: "createdAt",
      sortDirection: "DESC",
    });
  });

  it("should pass the requested sorting to the repository", async () => {
    const pageResult = {
      data: [],
      page: 2,
      limit: 20,
      total: 0,
      totalPages: 0,
    };

    listRepository.findPage.mockResolvedValue(pageResult);

    const result = await useCase.execute({
      page: 2,
      limit: 20,
      sortBy: "name",
      sortDirection: "ASC",
    });

    expect(result).toEqual(pageResult);
    expect(listRepository.findPage).toHaveBeenCalledWith({
      page: 2,
      limit: 20,
      sortBy: "name",
      sortDirection: "ASC",
    });
  });

  it("should propagate repository errors", async () => {
    const error = new Error("Database error");

    listRepository.findPage.mockRejectedValue(error);

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
