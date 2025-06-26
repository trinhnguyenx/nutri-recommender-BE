import dataSource from '../config/typeorm.config';
import { UserProgress } from '@/model/user.progress.entity';

export const progressRepository = dataSource.getRepository(UserProgress);
