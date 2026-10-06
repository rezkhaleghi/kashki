import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { User } from "@domain/entities/user.entity";
import { UserStatus } from "@domain/enums/user-status.enum";
import { InvalidCredentialsException } from "@domain/exceptions/domain.exception";

import { GoogleAuthUseCase } from "./google-auth.use-case";

describe("GoogleAuthUseCase", () => {
  const findByGoogleId = jest.fn<() => Promise<User | null>>();
  const findByEmail = jest.fn<() => Promise<User | null>>();
  const save = jest.fn<(user: User) => Promise<User>>();
  const createList = jest.fn();

  const unitOfWork = {
    execute: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    unitOfWork.execute.mockImplementation(
      async (work: (repositories: any) => Promise<unknown>) =>
        work({
          userRepository: {
            findByGoogleId,
            findByEmail,
            save,
          },
          listRepository: {
            create: createList,
          },
        }),
    );

    save.mockImplementation(async (user) => user);
    createList.mockImplementation(async (list) => list);
  });

  it("returns the linked active user without creating a list", async () => {
    const user = User.create({
      id: "user-1",
      email: "user@example.com",
      hashedPassword: null,
      googleId: "google-1",
    });

    findByGoogleId.mockResolvedValue(user);

    const useCase = new GoogleAuthUseCase(unitOfWork as any);

    const result = await useCase.execute({
      email: "user@example.com",
      googleId: "google-1",
    });

    expect(result).toBe(user);
    expect(findByGoogleId).toHaveBeenCalledWith("google-1");
    expect(findByEmail).not.toHaveBeenCalled();
    expect(createList).not.toHaveBeenCalled();
  });

  it("rejects a linked restricted user", async () => {
    const user = User.create({
      id: "user-1",
      email: "user@example.com",
      hashedPassword: null,
      googleId: "google-1",
    });

    user.restrict();

    findByGoogleId.mockResolvedValue(user);

    const useCase = new GoogleAuthUseCase(unitOfWork as any);

    await expect(
      useCase.execute({
        email: "user@example.com",
        googleId: "google-1",
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);

    expect(createList).not.toHaveBeenCalled();
  });

  it("links Google to an existing active user without creating a list", async () => {
    const user = User.create({
      id: "user-1",
      email: "user@example.com",
      hashedPassword: "hashed",
    });

    findByGoogleId.mockResolvedValue(null);
    findByEmail.mockResolvedValue(user);

    const useCase = new GoogleAuthUseCase(unitOfWork as any);

    const result = await useCase.execute({
      email: " USER@example.com ",
      googleId: "google-1",
    });

    expect(result).toBe(user);
    expect(user.googleId).toBe("google-1");
    expect(user.emailVerified).toBe(true);
    expect(save).toHaveBeenCalledWith(user);
    expect(createList).not.toHaveBeenCalled();
  });

  it("creates a new Google user and their Birthday list in the same unit of work", async () => {
    findByGoogleId.mockResolvedValue(null);
    findByEmail.mockResolvedValue(null);

    const useCase = new GoogleAuthUseCase(unitOfWork as any);

    const result = await useCase.execute({
      email: " USER@example.com ",
      googleId: "google-1",
    });

    expect(result.email).toBe("user@example.com");
    expect(result.googleId).toBe("google-1");
    expect(result.hashedPassword).toBeNull();
    expect(result.emailVerified).toBe(true);
    expect(result.status).toBe(UserStatus.ACTIVE);

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "user@example.com",
        googleId: "google-1",
      }),
    );

    expect(createList).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: result.id,
        name: "Birthday",
      }),
    );
  });
});
