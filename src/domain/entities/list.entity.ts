import { randomUUID } from "crypto";

import { FieldMustExistException } from "@domain/exceptions/domain.exception";
import { ListVisibility } from "@domain/enums/list-visibility.enum";

export interface CreateListProps {
  id?: string;
  userId: string;
  name: string;
  description?: string | null;
  visibility?: ListVisibility;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateListParams {
  name?: string;
  description?: string | null;
  visibility?: ListVisibility;
}

/**
 * Domain entity representing a user's gift list.
 *
 * A List belongs to exactly one user and is the parent of Wishes.
 * Wish-specific behavior intentionally does not live here; this entity
 * only owns the state and invariants of the list itself.
 *
 * The entity contains no ORM or HTTP concerns.
 */
export class List {
  private constructor(
    public readonly id: string,
    public readonly userId: string,
    public name: string,
    public description: string | null,
    public visibility: ListVisibility,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  /**
   * Creates a new list.
   *
   * Defaults are kept in the domain so creation behavior does not depend
   * on whether the list was created through HTTP, a background job, or
   * another application entry point.
   */
  static create(props: CreateListProps): List {
    const name = props.name.trim();

    if (!name) {
      throw new FieldMustExistException("List name");
    }

    if (!props.userId.trim()) {
      throw new FieldMustExistException("List user ID");
    }

    const now = new Date();

    return new List(
      props.id ?? randomUUID(),
      props.userId,
      name,
      props.description?.trim() ?? null,
      props.visibility ?? ListVisibility.PRIVATE,
      props.createdAt ?? now,
      props.updatedAt ?? now,
    );
  }

  /**
   * Updates fields that a list owner is allowed to change.
   *
   * `undefined` means "leave unchanged".
   * `null` explicitly clears the description.
   *
   * Ownership/authorization is intentionally handled by the application
   * layer, not by this entity.
   */
  update(params: UpdateListParams): void {
    if (params.name !== undefined) {
      const name = params.name.trim();

      if (!name) {
        throw new FieldMustExistException("List name");
      }

      this.name = name;
    }

    if (params.description !== undefined) {
      this.description = params.description?.trim() ?? null;
    }

    if (params.visibility !== undefined) {
      this.visibility = params.visibility;
    }

    this.updatedAt = new Date();
  }
}
