import { UserRole } from "@domain/enums/user-role.enum";
import { UserStatus } from "@domain/enums/user-status.enum";
import { Repository } from "typeorm";
import { UserOrmEntity } from "../orm-entities/user.orm-entity";
import { UserRepositoryImpl } from "./user.repository.impl";

describe("UserRepositoryImpl", () => {
  it("maps PostgreSQL date-only strings to UTC dates in the domain user", async () => {
    const row = Object.assign(new UserOrmEntity(), {
      id: "user-id",
      email: "birthday@example.com",
      hashedPassword: null,
      googleId: null,
      firstName: "Birthday",
      lastName: "User",
      userName: "birthday-user",
      dateOfBirth: "2000-07-25",
      avatar: null,
      bio: null,
      hideYear: false,
      role: UserRole.USER,
      emailVerified: true,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      status: UserStatus.ACTIVE,
    });
    const ormRepository = {
      findOne: jest.fn().mockResolvedValue(row),
    } as unknown as Repository<UserOrmEntity>;
    const repository = new UserRepositoryImpl(ormRepository);

    const user = await repository.findByUserName("birthday-user");

    expect(user?.dateOfBirth).toBeInstanceOf(Date);
    expect(user?.dateOfBirth?.toISOString()).toBe("2000-07-25T00:00:00.000Z");
  });

  it("returns only the month and day of birth in search results", async () => {
    const row = Object.assign(new UserOrmEntity(), {
      id: "user-id",
      firstName: "Birthday",
      lastName: "User",
      userName: "birthday-user",
      avatar: null,
      bio: null,
      email: "birthday@example.com",
      dateOfBirth: "2000-07-25",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[row], 1]),
    };
    const ormRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as Repository<UserOrmEntity>;
    const repository = new UserRepositoryImpl(ormRepository);

    const result = await repository.search("birthday", {
      page: 1,
      limit: 10,
      sortBy: "createdAt",
      sortDirection: "DESC",
    });

    expect(result.data[0].birthday).toBe("07-25");
    expect(result.data[0]).not.toHaveProperty("dateOfBirth");
  });
});
