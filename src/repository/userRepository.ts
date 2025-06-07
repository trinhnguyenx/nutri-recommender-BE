import { User } from "../model/users.entity";
import dataSource from "../config/typeorm.config";

export const userRepository = dataSource.getRepository(User).extend({
  async findAllAsync(): Promise<User[]> {
    return this.find();
  },

  async findByIdAsync(id: string): Promise<User | null> {
    return this.findOneBy({ id: id });
  },
  
  async createUserAsync(user: User): Promise<User> {
    const newUser = this.create(user);
    return this.save(newUser);
  },
  async saveUserAsync(user: User): Promise<User> {
    return this.save(user);
  },

  async findByEmailAsync(email: string | undefined): Promise<User | null> {
    return this.findOneBy({ email });
  },

  async updateUserAsync(id: string, user: Partial<User>): Promise<User | null> {
    await this.update(id, user);
    return this.findByIdAsync(id);
  },
 
});