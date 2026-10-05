import { AdminGetListUseCase } from "./get-list.use-case";

import { List } from "@domain/entities/list.entity";
import { ListVisibility } from "@domain/enums/list-visibility.enum";
import { ListNotFoundException } from "@domain/exceptions/domain.exception";
import { ListRepository } from "@domain/repositories/list.repository";

describe("AdminGetListUseCase", () => {
  let useCase: AdminGetListUseCase;
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

    useCase = new AdminGetListUseCase(listRepository);
  });

  it("should return the list when it exists", async () => {
    const list = List.create({
      id: "list-id",
      userId: "user-id",
      name: "Birthday Wishlist",
      visibility: ListVisibility.PRIVATE,
    });

    listRepository.findById.mockResolvedValue(list);

    const result = await useCase.execute("list-id");

    expect(result).toBe(list);
    expect(listRepository.findById).toHaveBeenCalledWith("list-id");
  });

  it("should throw ListNotFoundException when the list does not exist", async () => {
    listRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute("list-id")).rejects.toThrow(
      ListNotFoundException,
    );

    expect(listRepository.findById).toHaveBeenCalledWith("list-id");
  });

  it("should propagate repository errors", async () => {
    const error = new Error("Database error");

    listRepository.findById.mockRejectedValue(error);

    await expect(useCase.execute("list-id")).rejects.toThrow(error);
  });
});
