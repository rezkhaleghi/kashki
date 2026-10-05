import { GetUserListsUseCase } from "./get-user-lists.use-case";

import { ListRepository } from "@domain/repositories/list.repository";
import { List } from "@domain/entities/list.entity";

describe("GetUserListsUseCase", () => {
  let useCase: GetUserListsUseCase;

  const listRepositoryMock = {
    findPageByUserId: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    useCase = new GetUserListsUseCase(
      listRepositoryMock as unknown as ListRepository,
    );
  });

  it("should return the user's paginated lists", async () => {
    const list = List.create({
      id: "list-1",
      userId: "user-1",
      name: "Birthday",
    });

    const params = {
      page: 1,
      limit: 10,
      sortBy: "createdAt" as const,
      sortDirection: "DESC" as const,
    };

    const result = {
      data: [list],
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    };

    listRepositoryMock.findPageByUserId.mockResolvedValue(result);

    await expect(useCase.execute("user-1", params)).resolves.toEqual(result);

    expect(listRepositoryMock.findPageByUserId).toHaveBeenCalledWith(
      "user-1",
      params,
    );
  });

  it("should return an empty page when the user has no lists", async () => {
    const params = {
      page: 1,
      limit: 10,
      sortBy: "createdAt" as const,
      sortDirection: "DESC" as const,
    };

    const result = {
      data: [],
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    };

    listRepositoryMock.findPageByUserId.mockResolvedValue(result);

    await expect(useCase.execute("user-1", params)).resolves.toEqual(result);
  });
});
