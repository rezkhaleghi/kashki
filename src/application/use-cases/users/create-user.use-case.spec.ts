import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { User } from "@domain/entities/user.entity";
import { UserRole } from "@domain/enums/user-role.enum";
import {
  UserAlreadyExistsException,
  UsernameAlreadyExistsException,
} from "@domain/exceptions/domain.exception";

import { CreateUserUseCase } from "./create-user.use-case";

describe("CreateUserUseCase", () => {
  const findByEmail = jest.fn<() => Promise<User | null>>();
  const findByUserName = jest.fn<() => Promise<User | null>>();
  const save = jest.fn<(user: User) => Promise<User>>();
  const createBalance = jest.fn();
  const createList = jest.fn();

  const hash = jest.fn<(password: string) => Promise<string>>();

  const configService = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  };

  const unitOfWork = {
    execute: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    configService.get.mockReturnValue("USD");

    unitOfWork.execute.mockImplementation(
      async (work: (repositories: any) => Promise<unknown>) =>
        work({
          userRepository: {
            findByEmail,
            findByUserName,
            save,
          },
          userBalanceRepository: {
            create: createBalance,
          },
          listRepository: {
            create: createList,
          },
        }),
    );
  });

  it("normalizes, hashes, verifies, saves the user, creates the balance, and creates the Birthday list", async () => {
    findByEmail.mockResolvedValue(null);
    findByUserName.mockResolvedValue(null);
    hash.mockResolvedValue("hashed");

    save.mockImplementation(async (user) => user);
    createBalance.mockImplementation(async (balance) => balance);
    createList.mockImplementation(async (list) => list);

    const useCase = new CreateUserUseCase(
      { hash } as any,
      unitOfWork as any,
      configService as any,
    );

    const result = await useCase.execute({
      email: " USER@example.com ",
      password: "password",
      userName: " PocketJack ",
    });

    expect(result.email).toBe("user@example.com");
    expect(result.userName).toBe("pocketjack");
    expect(result.hashedPassword).toBe("hashed");
    expect(result.role).toBe(UserRole.USER);
    expect(result.emailVerified).toBe(true);

    expect(findByEmail).toHaveBeenCalledWith("user@example.com");
    expect(findByUserName).toHaveBeenCalledWith("pocketjack");
    expect(hash).toHaveBeenCalledWith("password");

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "user@example.com",
        userName: "pocketjack",
        hashedPassword: "hashed",
        role: UserRole.USER,
        emailVerified: true,
      }),
    );

    expect(createBalance).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: result.id,
        amount: "0",
      }),
    );

    expect(createList).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: result.id,
        name: "Birthday",
      }),
    );
  });

  it("rejects an existing email without hashing, creating a balance, or creating a list", async () => {
    const existingUser = User.create({
      id: "id",
      email: "user@example.com",
      hashedPassword: "hashed",
    });

    existingUser.update({
      userName: "existinguser",
    });

    findByEmail.mockResolvedValue(existingUser);

    const useCase = new CreateUserUseCase(
      { hash } as any,
      unitOfWork as any,
      configService as any,
    );

    await expect(
      useCase.execute({
        email: "user@example.com",
        password: "password",
        userName: "newuser",
      }),
    ).rejects.toBeInstanceOf(UserAlreadyExistsException);

    expect(findByEmail).toHaveBeenCalledWith("user@example.com");
    expect(hash).not.toHaveBeenCalled();
    expect(findByUserName).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    expect(createBalance).not.toHaveBeenCalled();
    expect(createList).not.toHaveBeenCalled();
  });

  it("rejects an existing username without hashing, creating a user, balance, or list", async () => {
    findByEmail.mockResolvedValue(null);

    const existingUser = User.create({
      id: "existing-id",
      email: "existing@example.com",
      hashedPassword: "hashed",
    });

    existingUser.update({
      userName: "pocketjack",
    });

    findByUserName.mockResolvedValue(existingUser);

    const useCase = new CreateUserUseCase(
      { hash } as any,
      unitOfWork as any,
      configService as any,
    );

    await expect(
      useCase.execute({
        email: "new@example.com",
        password: "password",
        userName: " PocketJack ",
      }),
    ).rejects.toBeInstanceOf(UsernameAlreadyExistsException);

    expect(findByEmail).toHaveBeenCalledWith("new@example.com");
    expect(findByUserName).toHaveBeenCalledWith("pocketjack");
    expect(hash).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    expect(createBalance).not.toHaveBeenCalled();
    expect(createList).not.toHaveBeenCalled();
  });
});
