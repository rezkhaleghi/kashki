import { List } from "@domain/entities/list.entity";
import { ListVisibility } from "@domain/enums/list-visibility.enum";
import { ListNotFoundException } from "@domain/exceptions/domain.exception";
import { ListRepository } from "@domain/repositories/list.repository";

import { UpdateListUseCase } from "./update-list.use-case";

describe("UpdateListUseCase", () => {
  let useCase: UpdateListUseCase;
  let listRepository: jest.Mocked<ListRepository>;

  beforeEach(() => {
    listRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      findByIdForUpdate: jest.fn(),
      findByUserIdAndId: jest.fn(),
      findPageByUserId: jest.fn(),
      deleteById: jest.fn(),
      findPage: jest.fn(),
    };

    useCase = new UpdateListUseCase(listRepository);
  });

  it("updates an owned list", async () => {
    const list = List.create({
      id: "list-1",
      userId: "user-1",
      name: "Old name",
      description: "Old description",
      visibility: ListVisibility.PRIVATE,
    });

    listRepository.findByUserIdAndId.mockResolvedValue(list);
    listRepository.save.mockImplementation(async (value) => value);

    const result = await useCase.execute({
      userId: "user-1",
      listId: "list-1",
      name: "New name",
      description: "New description",
      visibility: ListVisibility.PUBLIC,
    });

    expect(result.name).toBe("New name");
    expect(result.description).toBe("New description");
    expect(result.visibility).toBe(ListVisibility.PUBLIC);
    expect(listRepository.save).toHaveBeenCalledWith(list);
  });

  it("throws when the list does not belong to the user", async () => {
    listRepository.findByUserIdAndId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: "user-1",
        listId: "list-1",
        name: "New name",
      }),
    ).rejects.toThrow(ListNotFoundException);

    expect(listRepository.save).not.toHaveBeenCalled();
  });

  it("updates only the supplied fields", async () => {
    const list = List.create({
      id: "list-1",
      userId: "user-1",
      name: "My List",
      description: "Original description",
      visibility: ListVisibility.PRIVATE,
    });

    listRepository.findByUserIdAndId.mockResolvedValue(list);
    listRepository.save.mockImplementation(async (value) => value);

    await useCase.execute({
      userId: "user-1",
      listId: "list-1",
      visibility: ListVisibility.UNLISTED,
    });

    expect(list.name).toBe("My List");
    expect(list.description).toBe("Original description");
    expect(list.visibility).toBe(ListVisibility.UNLISTED);
  });
});
