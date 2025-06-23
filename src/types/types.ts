import type { Container } from 'inversify';

export interface IRepository<T> {
  findAll(skip?: number, take?: number): Promise<{ items: T[]; total: number }>;
  findById(id: number): Promise<T | null>;
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(id: number, data: Partial<T>): Promise<T>;
  delete(id: number): Promise<void>;
}

export interface IService<T> {
  getAll(): Promise<T[]>;
  getById(id: number): Promise<T | null>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: number, data: Partial<T>): Promise<T>;
  delete(id: number): Promise<void>;
}

export type Constructor<T> = new (...args: any[]) => T;

export interface IController {
  container: Container;
}
