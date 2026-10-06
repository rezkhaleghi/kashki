import { List } from "@domain/entities/list.entity";
import { ListVisibility } from "@domain/enums/list-visibility.enum";
import {
  ListAccessNotAllowedException,
  ListNotFoundException,
} from "@domain/exceptions/domain.exception";
import { ListRepository } from "@domain/repositories/list.repository";

import { GetListUseCase } from "./get-list.use-case";

describe("GetListUseCase", () => {
  let useCase: GetListUseCase;
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

    useCase = new GetListUseCase(listRepository);
  });

  it("returns the list when it exists and is public", async () => {
    const list = List.create({
      id: "list-1",
      userId: "user-1",
      name: "Birthday",
      visibility: ListVisibility.PUBLIC,
    });

    listRepository.findById.mockResolvedValue(list);

    await expect(useCase.execute({ listId: "list-1" })).resolves.toBe(list);
  });

  it("returns the list when it exists and is unlisted", async () => {
    const list = List.create({
      id: "list-1",
      userId: "user-1",
      name: "Birthday",
      visibility: ListVisibility.UNLISTED,
    });

    listRepository.findById.mockResolvedValue(list);

    await expect(useCase.execute({ listId: "list-1" })).resolves.toBe(list);
  });

  it("returns a private list to its owner", async () => {
    const list = List.create({
      id: "list-1",
      userId: "user-1",
      name: "Birthday",
      visibility: ListVisibility.PRIVATE,
    });

    listRepository.findById.mockResolvedValue(list);

    await expect(
      useCase.execute({
        listId: "list-1",
        requesterUserId: "user-1",
      }),
    ).resolves.toBe(list);
  });

  it("rejects access to a private list for another user", async () => {
    const list = List.create({
      id: "list-1",
      userId: "user-1",
      name: "Birthday",
      visibility: ListVisibility.PRIVATE,
    });

    listRepository.findById.mockResolvedValue(list);

    await expect(
      useCase.execute({
        listId: "list-1",
        requesterUserId: "user-2",
      }),
    ).rejects.toBeInstanceOf(ListAccessNotAllowedException);
  });

  it("rejects access to a private list without authentication", async () => {
    const list = List.create({
      id: "list-1",
      userId: "user-1",
      name: "Birthday",
      visibility: ListVisibility.PRIVATE,
    });

    listRepository.findById.mockResolvedValue(list);

    await expect(useCase.execute({ listId: "list-1" })).rejects.toBeInstanceOf(
      ListAccessNotAllowedException,
    );
  });

  it("throws when the list does not exist", async () => {
    listRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ listId: "missing-list" }),
    ).rejects.toBeInstanceOf(ListNotFoundException);
  });
});
