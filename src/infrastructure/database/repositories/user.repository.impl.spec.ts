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
});
