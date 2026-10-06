import { Wish } from "@domain/entities/wish.entity";
import { WishRepository } from "@domain/repositories/wish.repository";

import { AdminListWishesUseCase } from "./list-wishes.use-case";

describe("AdminListWishesUseCase", () => {
  let useCase: AdminListWishesUseCase;
  let wishRepository: jest.Mocked<WishRepository>;

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

    useCase = new AdminListWishesUseCase(wishRepository);
  });

  it("should return a paginated list of all wishes", async () => {
    const wish = Wish.create({
      id: "wish-1",
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

    wishRepository.findPage.mockResolvedValue(pageResult);

    const result = await useCase.execute({
      page: 1,
      limit: 10,
      sortBy: "createdAt",
      sortDirection: "DESC",
    });

    expect(result).toEqual(pageResult);
    expect(wishRepository.findPage).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      sortBy: "createdAt",
      sortDirection: "DESC",
    });
  });

  it("should propagate repository errors", async () => {
    const error = new Error("Database error");

    wishRepository.findPage.mockRejectedValue(error);

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
