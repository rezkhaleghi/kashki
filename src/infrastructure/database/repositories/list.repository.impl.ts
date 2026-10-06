import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { List } from "@domain/entities/list.entity";
import { ListRepository } from "@domain/repositories/list.repository";
import { PageQuery, PageResult } from "@shared/pagination/page-query";

import { ListOrmEntity } from "../orm-entities/list.orm-entity";

/**
 * TypeORM implementation of the ListRepository contract.
 *
 * Mapping between ORM and domain entities is kept here so neither the
 * domain nor application layers become coupled to TypeORM.
 */
@Injectable()
export class ListRepositoryImpl implements ListRepository {
  constructor(
    @InjectRepository(ListOrmEntity)
    private readonly repo: Repository<ListOrmEntity>,
  ) {}

  async create(list: List): Promise<List> {
    const row = this.toOrm(list);
    const saved = await this.repo.save(row);

    return this.toDomain(saved);
  }

  async save(list: List): Promise<List> {
    const row = this.toOrm(list);
    const saved = await this.repo.save(row);

    return this.toDomain(saved);
  }

  async findById(id: string): Promise<List | null> {
    const row = await this.repo.findOne({
      where: { id },
    });

    return row ? this.toDomain(row) : null;
  }

  /**
   * Locks the List row for the current transaction.
   *
   * List deletion and targeted Gift creation use this lock as their
   * synchronization point so they cannot race around the List's
   * Wishes/Gifts.
   */
  async findByIdForUpdate(id: string): Promise<List | null> {
    const row = await this.repo.findOne({
      where: { id },
      lock: { mode: "pessimistic_write" },
    });

    return row ? this.toDomain(row) : null;
  }

  async findByUserIdAndId(userId: string, id: string): Promise<List | null> {
    const row = await this.repo.findOne({
      where: {
        id,
        userId,
      },
    });

    return row ? this.toDomain(row) : null;
  }

  async findPageByUserId(
    userId: string,
    params: PageQuery<"createdAt" | "name">,
  ): Promise<PageResult<List>> {
    const [rows, total] = await this.repo.findAndCount({
      where: { userId },
      order: {
        [params.sortBy ?? "createdAt"]: params.sortDirection ?? "DESC",
      },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    });

    return {
      data: rows.map((row) => this.toDomain(row)),
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    };
  }

  async findPage(
    params: PageQuery<"createdAt" | "name">,
  ): Promise<PageResult<List>> {
    const [rows, total] = await this.repo.findAndCount({
      order: {
        [params.sortBy ?? "createdAt"]: params.sortDirection ?? "DESC",
      },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    });

    return {
      data: rows.map((row) => this.toDomain(row)),
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    };
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  private toDomain(row: ListOrmEntity): List {
    return List.create({
      id: row.id,
      userId: row.userId,
      name: row.name,
      description: row.description,
      visibility: row.visibility,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toOrm(list: List): ListOrmEntity {
    const row = new ListOrmEntity();

    row.id = list.id;
    row.userId = list.userId;
    row.name = list.name;
    row.description = list.description;
    row.visibility = list.visibility;
    row.createdAt = list.createdAt;
    row.updatedAt = list.updatedAt;

    return row;
  }
}
