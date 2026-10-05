import { List } from "@domain/entities/list.entity";
import { ListVisibility } from "@domain/enums/list-visibility.enum";
import { ListNotFoundException } from "@domain/exceptions/domain.exception";
import { ListRepository } from "@domain/repositories/list.repository";
import { DeleteListUseCase } from "./delete-list.use-case";

describe("DeleteListUseCase", () => {
  let useCase: DeleteListUseCase;
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

    useCase = new DeleteListUseCase(listRepository);
  });

  it("deletes an owned list", async () => {
    const list = List.create({
      id: "list-1",
      userId: "user-1",
      name: "My List",
      visibility: ListVisibility.PRIVATE,
    });

    listRepository.findByUserIdAndId.mockResolvedValue(list);
    listRepository.deleteById.mockResolvedValue(undefined);

    await useCase.execute({
      userId: "user-1",
      listId: "list-1",
    });

    expect(listRepository.findByUserIdAndId).toHaveBeenCalledWith(
      "user-1",
      "list-1",
    );

    expect(listRepository.deleteById).toHaveBeenCalledWith("list-1");
  });

  it("throws when the list does not belong to the user", async () => {
    listRepository.findByUserIdAndId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: "user-1",
        listId: "list-1",
      }),
    ).rejects.toThrow(ListNotFoundException);

    expect(listRepository.findByUserIdAndId).toHaveBeenCalledWith(
      "user-1",
      "list-1",
    );

    expect(listRepository.deleteById).not.toHaveBeenCalled();
  });

  it("throws when the list does not exist", async () => {
    listRepository.findByUserIdAndId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: "user-1",
        listId: "missing-list",
      }),
    ).rejects.toThrow(ListNotFoundException);

    expect(listRepository.deleteById).not.toHaveBeenCalled();
  });
});
