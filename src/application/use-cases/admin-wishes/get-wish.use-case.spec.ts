import { Wish } from "@domain/entities/wish.entity";
import { WishNotFoundException } from "@domain/exceptions/domain.exception";
import { WishRepository } from "@domain/repositories/wish.repository";

import { AdminGetWishUseCase } from "./get-wish.use-case";

describe("AdminGetWishUseCase", () => {
  let useCase: AdminGetWishUseCase;
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

    useCase = new AdminGetWishUseCase(wishRepository);
  });

  it("should return an existing wish", async () => {
    const wish = Wish.create({
      id: "wish-1",
      listId: "list-1",
      title: "MacBook Pro",
    });

    wishRepository.findById.mockResolvedValue(wish);

    const result = await useCase.execute("wish-1");

    expect(result).toBe(wish);
    expect(wishRepository.findById).toHaveBeenCalledWith("wish-1");
  });

  it("should throw when the wish does not exist", async () => {
    wishRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute("missing-wish")).rejects.toBeInstanceOf(
      WishNotFoundException,
    );
  });

  it("should propagate repository errors", async () => {
    const error = new Error("Database error");

    wishRepository.findById.mockRejectedValue(error);

    await expect(useCase.execute("wish-1")).rejects.toThrow(error);
  });
});
