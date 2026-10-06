import { List } from "@domain/entities/list.entity";
import { ListVisibility } from "@domain/enums/list-visibility.enum";
import {
  ListCannotBeDeletedException,
  ListNotFoundException,
} from "@domain/exceptions/domain.exception";
import { GiftRepository } from "@domain/repositories/gift.repository";
import { ListRepository } from "@domain/repositories/list.repository";
import { UnitOfWork } from "@application/interfaces/unit-of-work.interface";

import { DeleteListUseCase } from "./delete-list.use-case";

describe("DeleteListUseCase", () => {
  let useCase: DeleteListUseCase;
  let unitOfWork: jest.Mocked<UnitOfWork>;
  let listRepository: jest.Mocked<ListRepository>;
  let giftRepository: jest.Mocked<GiftRepository>;

  beforeEach(() => {
    listRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      findByIdForUpdate: jest.fn(),
      findByUserIdAndId: jest.fn(),
      findPageByUserId: jest.fn(),
      findPage: jest.fn(),
      deleteById: jest.fn(),
    };

    giftRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findPageByWishId: jest.fn(),
      findPageByUserId: jest.fn(),
      findPage: jest.fn(),
      sumAmountByWishIdAndCurrency: jest.fn(),
      existsByWishId: jest.fn(),
      existsByListId: jest.fn(),
    };

    unitOfWork = {
      execute: jest.fn(),
    } as jest.Mocked<UnitOfWork>;

    unitOfWork.execute.mockImplementation(async (work) =>
      work({
        userRepository: {} as any,
        userBalanceRepository: {} as any,
        auditLogRepository: {} as any,
        ledgerRepository: {} as any,
        depositRepository: {} as any,
        withdrawalRepository: {} as any,
        ticketRepository: {} as any,
        ticketMessageRepository: {} as any,
        ticketCategoryRepository: {} as any,
        notificationRepository: {} as any,
        listRepository,
        wishRepository: {} as any,
        giftRepository,
      }),
    );

    useCase = new DeleteListUseCase(unitOfWork);
  });

  it("deletes an owned list with no gifts", async () => {
    const list = List.create({
      id: "list-1",
      userId: "user-1",
      name: "Birthday",
      visibility: ListVisibility.PRIVATE,
    });

    listRepository.findByIdForUpdate.mockResolvedValue(list);
    giftRepository.existsByListId.mockResolvedValue(false);

    await useCase.execute({
      userId: "user-1",
      listId: "list-1",
    });

    expect(listRepository.findByIdForUpdate).toHaveBeenCalledWith("list-1");
    expect(giftRepository.existsByListId).toHaveBeenCalledWith("list-1");
    expect(listRepository.deleteById).toHaveBeenCalledWith("list-1");
  });

  it("allows deleting a list containing wishes when none have gifts", async () => {
    const list = List.create({
      id: "list-1",
      userId: "user-1",
      name: "Birthday",
      visibility: ListVisibility.PUBLIC,
    });

    listRepository.findByIdForUpdate.mockResolvedValue(list);
    giftRepository.existsByListId.mockResolvedValue(false);

    await expect(
      useCase.execute({
        userId: "user-1",
        listId: "list-1",
      }),
    ).resolves.toBeUndefined();

    expect(listRepository.deleteById).toHaveBeenCalledWith("list-1");
  });

  it("rejects deleting a list when one of its wishes has a gift", async () => {
    const list = List.create({
      id: "list-1",
      userId: "user-1",
      name: "Birthday",
      visibility: ListVisibility.PUBLIC,
    });

    listRepository.findByIdForUpdate.mockResolvedValue(list);
    giftRepository.existsByListId.mockResolvedValue(true);

    await expect(
      useCase.execute({
        userId: "user-1",
        listId: "list-1",
      }),
    ).rejects.toThrow(ListCannotBeDeletedException);

    expect(listRepository.deleteById).not.toHaveBeenCalled();
  });

  it("rejects when the list does not exist", async () => {
    listRepository.findByIdForUpdate.mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: "user-1",
        listId: "missing-list",
      }),
    ).rejects.toThrow(ListNotFoundException);

    expect(giftRepository.existsByListId).not.toHaveBeenCalled();
    expect(listRepository.deleteById).not.toHaveBeenCalled();
  });

  it("rejects when the list belongs to another user", async () => {
    const list = List.create({
      id: "list-1",
      userId: "owner-1",
      name: "Birthday",
      visibility: ListVisibility.PUBLIC,
    });

    listRepository.findByIdForUpdate.mockResolvedValue(list);

    await expect(
      useCase.execute({
        userId: "user-2",
        listId: "list-1",
      }),
    ).rejects.toThrow(ListNotFoundException);

    expect(giftRepository.existsByListId).not.toHaveBeenCalled();
    expect(listRepository.deleteById).not.toHaveBeenCalled();
  });
});
