import { User } from '../data/store';
export declare class UsersRepository {
    findAll(): User[];
    findById(user_id: number): User | undefined;
    findByRole(role_id: number): User[];
    findByEmail(email: string): User | undefined;
    create(user: User): User;
    update(user_id: number, partial: Partial<User>): User | undefined;
    remove(user_id: number): boolean;
    nextId(): number;
    resolveRoleName(role_id: number): string;
}
