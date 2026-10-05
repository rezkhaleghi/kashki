import { List } from "@domain/entities/list.entity";
import { ListVisibility } from "@domain/enums/list-visibility.enum";
import { ListRepository } from "@domain/repositories/list.repository";

import { ListListsUseCase } from "./list-lists.use-case";

describe("ListListsUseCase", () => {
  let useCase: ListListsUseCase;
  let listRepository: jest.Mocked<ListRepository>;

  beforeEach(() => {
    listRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      findByUserIdAndId: jest.fn(),
      findPageByUserId: jest.fn(),
      deleteById: jest.fn(),
      findPage: jest.fn(),
    };

    useCase = new ListListsUseCase(listRepository);
  });

  it("lists the user's lists", async () => {
    const lists = [
      List.create({
        id: "list-1",
        userId: "user-1",
        name: "Birthday",
        visibility: ListVisibility.PRIVATE,
      }),
      List.create({
        id: "list-2",
        userId: "user-1",
        name: "Christmas",
        visibility: ListVisibility.PUBLIC,
      }),
    ];

    const page = {
      data: lists,
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
    };

    listRepository.findPageByUserId.mockResolvedValue(page);

    const result = await useCase.execute({
      userId: "user-1",
      page: 1,
      limit: 20,
      sortBy: "createdAt",
      sortDirection: "DESC",
    });

    expect(listRepository.findPageByUserId).toHaveBeenCalledWith("user-1", {
      page: 1,
      limit: 20,
      sortBy: "createdAt",
      sortDirection: "DESC",
    });

    expect(result).toEqual(page);
  });

  it("passes pagination and sorting parameters to the repository", async () => {
    const page = {
      data: [],
      page: 2,
      limit: 10,
      total: 0,
      totalPages: 0,
    };

    listRepository.findPageByUserId.mockResolvedValue(page);

    const result = await useCase.execute({
      userId: "user-1",
      page: 2,
      limit: 10,
      sortBy: "name",
      sortDirection: "ASC",
    });

    expect(listRepository.findPageByUserId).toHaveBeenCalledWith("user-1", {
      page: 2,
      limit: 10,
      sortBy: "name",
      sortDirection: "ASC",
    });

    expect(result).toEqual(page);
  });

  it("returns an empty page when the user has no lists", async () => {
    const page = {
      data: [],
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    };

    listRepository.findPageByUserId.mockResolvedValue(page);

    const result = await useCase.execute({
      userId: "user-1",
      page: 1,
      limit: 20,
      sortBy: "createdAt",
      sortDirection: "DESC",
    });

    expect(result).toEqual(page);
  });
});
