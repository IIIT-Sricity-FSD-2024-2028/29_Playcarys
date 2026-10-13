import { User } from '../data/store';
export declare class AuthRepository {
    findByEmail(email: string): User | undefined;
    findAllByEmail(email: string): User[];
    findByUsername(username: string): User | undefined;
    findById(user_id: number): User | undefined;
    create(user: User): User;
    updateLastSeen(user_id: number): void;
    emailExists(email: string): boolean;
    emailExistsForRole(email: string, role_id: number): boolean;
    nextId(): number;
}
