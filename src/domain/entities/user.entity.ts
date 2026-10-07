import { randomUUID } from "crypto";

import { UserStatus } from "@domain/enums/user-status.enum";
import { UserRole } from "../enums/user-role.enum";
import { GoogleAccountConflictException } from "../exceptions/domain.exception";

/**
 * Fields that can be changed through a normal profile update.
 *
 * Fields with their own business rules (role, status, password,
 * email verification, Google account) intentionally cannot be
 * changed through this method.
 *
 * `undefined` means "do not change".
 * `null` means "explicitly clear the value".
 */
export type UpdateUserParams = Partial<{
  firstName: string | null;
  lastName: string | null;
  userName: string | null;
  dateOfBirth: Date | null;
  avatar: string | null;
  bio: string | null;
  hideYear: boolean;
}>;

export interface CreateUserProps {
  id?: string;
  email: string;
  hashedPassword: string | null;
  role?: UserRole;
  emailVerified?: boolean;
  userName?: string | null;
  googleId?: string | null;
}

export interface RestoreUserProps {
  id: string;
  email: string;
  hashedPassword: string | null;
  role: UserRole;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  googleId: string | null;
  firstName: string | null;
  lastName: string | null;
  userName: string | null;
  dateOfBirth: Date | null;
  avatar: string | null;
  bio: string | null;
  /**
   * Optional for backward compatibility with existing persisted users/tests.
   * New users default to false.
   */
  hideYear?: boolean;
  status: UserStatus;
}

/**
 * Domain entity representing the business state of a User.
 *
 * This class deliberately contains no ORM decorators or persistence
 * concerns. Database mapping belongs to the infrastructure layer.
 *
 * Construction is restricted to `create()` and `restore()` so callers
 * cannot accidentally bypass the entity's intended creation/recovery paths.
 */
export class User {
  private _emailVerified: boolean;
  private _googleId: string | null;
  private _updatedAt: Date;

  private constructor(
    public readonly id: string,
    public email: string,
    public hashedPassword: string | null,
    public role: UserRole,
    emailVerified: boolean,
    public readonly createdAt: Date,
    updatedAt: Date,
    googleId: string | null,
    public firstName: string | null,
    public lastName: string | null,
    public userName: string | null,
    public dateOfBirth: Date | null,
    public avatar: string | null,
    public bio: string | null,
    public hideYear: boolean,
    public status: UserStatus,
  ) {
    this._emailVerified = emailVerified;
    this._googleId = googleId;
    this._updatedAt = updatedAt;
  }

  get emailVerified(): boolean {
    return this._emailVerified;
  }

  get googleId(): string | null {
    return this._googleId;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  private touch(): void {
    this._updatedAt = new Date();
  }

  static create(params: CreateUserProps): User {
    const now = new Date();

    return new User(
      params.id ?? randomUUID(),
      params.email,
      params.hashedPassword,
      params.role ?? UserRole.USER,
      params.emailVerified ?? false,
      now,
      now,
      params.googleId ?? null,
      null,
      null,
      null,
      null,
      null,
      null,
      false,
      UserStatus.ACTIVE,
    );
  }

  static restore(params: RestoreUserProps): User {
    return new User(
      params.id,
      params.email,
      params.hashedPassword,
      params.role,
      params.emailVerified,
      params.createdAt,
      params.updatedAt,
      params.googleId,
      params.firstName,
      params.lastName,
      params.userName,
      params.dateOfBirth,
      params.avatar,
      params.bio,
      params.hideYear ?? false,
      params.status,
    );
  }

  /**
   * Updates ordinary profile information.
   *
   * `undefined` keeps the current value.
   * `null` explicitly clears nullable fields.
   */
  update(params: UpdateUserParams): void {
    if (params.firstName !== undefined) {
      this.firstName = params.firstName;
    }

    if (params.lastName !== undefined) {
      this.lastName = params.lastName;
    }

    if (params.userName !== undefined) {
      this.userName = params.userName;
    }

    if (params.dateOfBirth !== undefined) {
      this.dateOfBirth = params.dateOfBirth;
    }

    if (params.avatar !== undefined) {
      this.avatar = params.avatar;
    }

    if (params.bio !== undefined) {
      this.bio = params.bio;
    }

    if (params.hideYear !== undefined) {
      this.hideYear = params.hideYear;
    }

    this.touch();
  }

  changeEmail(email: string): void {
    this.email = email;
    this.touch();
  }

  changeRole(role: UserRole): void {
    this.role = role;
    this.touch();
  }

  setEmailVerified(verified: boolean): void {
    this._emailVerified = verified;
    this.touch();
  }

  changePassword(hashedPassword: string): void {
    this.hashedPassword = hashedPassword;
    this.touch();
  }

  verifyEmail(): void {
    this._emailVerified = true;
    this.touch();
  }

  linkGoogleAccount(googleId: string): void {
    if (this.googleId && this.googleId !== googleId) {
      throw new GoogleAccountConflictException();
    }

    this._googleId = googleId;
    this.touch();
  }

  activate(): void {
    this.status = UserStatus.ACTIVE;
    this.touch();
  }

  restrict(): void {
    this.status = UserStatus.RESTRICTED;
    this.touch();
  }
}
