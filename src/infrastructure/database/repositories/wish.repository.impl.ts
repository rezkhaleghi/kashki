import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Wish } from "@domain/entities/wish.entity";
import { WishRepository } from "@domain/repositories/wish.repository";
import { PageQuery, PageResult } from "@shared/pagination/page-query";

import { WishOrmEntity } from "../orm-entities/wish.orm-entity";

@Injectable()
export class WishRepositoryImpl implements WishRepository {
  constructor(
    @InjectRepository(WishOrmEntity)
    private readonly repo: Repository<WishOrmEntity>,
  ) {}

  async create(wish: Wish): Promise<Wish> {
    const saved = await this.repo.save(this.toOrm(wish));

    return this.toDomain(saved);
  }

  async save(wish: Wish): Promise<Wish> {
    const saved = await this.repo.save(this.toOrm(wish));

    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Wish | null> {
    const row = await this.repo.findOne({
      where: { id },
    });

    return row ? this.toDomain(row) : null;
  }

  async findByIdForUpdate(id: string): Promise<Wish | null> {
    const row = await this.repo.findOne({
      where: { id },
      lock: {
        mode: "pessimistic_write",
      },
    });

    return row ? this.toDomain(row) : null;
  }

  async findByListIdAndId(listId: string, id: string): Promise<Wish | null> {
    const row = await this.repo.findOne({
      where: {
        id,
        listId,
      },
    });

    return row ? this.toDomain(row) : null;
  }

  async findPageByListId(
    listId: string,
    params: PageQuery<"createdAt" | "title">,
  ): Promise<PageResult<Wish>> {
    const [rows, total] = await this.repo.findAndCount({
      where: { listId },
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
    params: PageQuery<"createdAt" | "title">,
  ): Promise<PageResult<Wish>> {
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

  private toDomain(row: WishOrmEntity): Wish {
    return Wish.restore({
      id: row.id,
      listId: row.listId,
      title: row.title,
      description: row.description,
      targetAmount: row.targetAmount,
      currency: row.currency,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toOrm(wish: Wish): WishOrmEntity {
    const row = new WishOrmEntity();

    row.id = wish.id;
    row.listId = wish.listId;
    row.title = wish.title;
    row.description = wish.description;
    row.targetAmount = wish.targetAmount;
    row.currency = wish.currency;
    row.status = wish.getStatus();
    row.createdAt = wish.createdAt;
    row.updatedAt = wish.updatedAt;

    return row;
  }
}
