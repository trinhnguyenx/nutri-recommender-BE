import dataSource from '../config/typeorm.config';
import { CalculationResult } from "../model/caculation.result";

export const CalculateRepository = dataSource.getRepository(CalculationResult);
