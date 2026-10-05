import { CreateListUseCase } from "./create-list.use-case";

import { ListRepository } from "@domain/repositories/list.repository";
import { UserRepository } from "@domain/repositories/user.repository";
import { User } from "@domain/entities/user.entity";
import { UserNotFoundException } from "@domain/exceptions/domain.exception";
import { ListVisibility } from "@domain/enums/list-visibility.enum";

describe("CreateListUseCase", () => {
  let useCase: CreateListUseCase;

  const listRepositoryMock = {
    create: jest.fn(),
  };

  const userRepositoryMock = {
    findById: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    useCase = new CreateListUseCase(
      listRepositoryMock as unknown as ListRepository,
      userRepositoryMock as unknown as UserRepository,
    );
  });

  it("should create a list for an existing user", async () => {
    const user = User.create({
      id: "user-1",
      email: "user@example.com",
      hashedPassword: "hashed-password",
    });

    userRepositoryMock.findById.mockResolvedValue(user);

    listRepositoryMock.create.mockImplementation(async (list) => list);

    const result = await useCase.execute({
      userId: "user-1",
      name: "  Birthday  ",
      description: "  Birthday gifts  ",
    });

    expect(userRepositoryMock.findById).toHaveBeenCalledWith("user-1");

    expect(listRepositoryMock.create).toHaveBeenCalledTimes(1);

    expect(result.userId).toBe("user-1");
    expect(result.name).toBe("Birthday");
    expect(result.description).toBe("Birthday gifts");
    expect(result.visibility).toBe(ListVisibility.PRIVATE);
  });

  it("should preserve explicitly provided visibility", async () => {
    const user = User.create({
      id: "user-1",
      email: "user@example.com",
      hashedPassword: "hashed-password",
    });

    userRepositoryMock.findById.mockResolvedValue(user);
    listRepositoryMock.create.mockImplementation(async (list) => list);

    const result = await useCase.execute({
      userId: "user-1",
      name: "Public list",
      visibility: ListVisibility.PUBLIC,
    });

    expect(result.visibility).toBe(ListVisibility.PUBLIC);
  });

  it("should reject creation when the user does not exist", async () => {
    userRepositoryMock.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: "missing-user",
        name: "Birthday",
      }),
    ).rejects.toThrow(UserNotFoundException);

    expect(listRepositoryMock.create).not.toHaveBeenCalled();
  });
});
