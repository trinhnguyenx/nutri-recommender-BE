import { MigrationInterface, QueryRunner } from "typeorm";

export class  $npmConfigName1750942246183 implements MigrationInterface {
    name = ' $npmConfigName1750942246183'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`user_meal_preferences\` (\`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`id\` int NOT NULL AUTO_INCREMENT, \`userId\` varchar(255) NOT NULL, \`mealId\` varchar(255) NOT NULL, \`score\` int NOT NULL DEFAULT '0', PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`meals\` (\`id\` varchar(36) NOT NULL, \`name\` varchar(255) NOT NULL, \`calories\` float NOT NULL, \`protein\` float NOT NULL, \`fat\` float NOT NULL, \`carbs\` float NOT NULL, \`ingredients\` text NOT NULL, \`meal_type\` text NOT NULL, \`suitable\` text NULL, \`is_favourite\` tinyint NOT NULL DEFAULT 0, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`meal_plan_meals\` (\`id\` varchar(36) NOT NULL, \`meal_time\` enum ('breakfast', 'snack1', 'lunch', 'snack2', 'dinner', 'snack3') NOT NULL, \`mealId\` varchar(36) NULL, \`mealPlanDayId\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`meal_plan_days\` (\`id\` varchar(36) NOT NULL, \`day_number\` int NOT NULL, \`mealPlanId\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`calculation_results\` (\`id\` varchar(36) NOT NULL, \`maintenanceCalories\` float NOT NULL, \`targetCalories\` float NOT NULL, \`goal\` varchar(255) NOT NULL, \`estimatedWeeklyChange\` float NOT NULL, \`estimatedDaysToGoal\` int NOT NULL, \`bmr\` float NULL, \`gender\` varchar(255) NOT NULL DEFAULT '', \`age\` int NOT NULL DEFAULT '0', \`height\` float NOT NULL DEFAULT '0', \`weight\` float NOT NULL DEFAULT '0', \`activityLevel\` varchar(255) NOT NULL DEFAULT '', \`is_active\` tinyint NOT NULL DEFAULT 0, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`userId\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`meal_plan_calorie_summaries\` (\`id\` varchar(36) NOT NULL, \`day_number\` int NOT NULL, \`goal\` enum ('gain', 'maintenance', 'loss') NOT NULL, \`breakfast_calories\` float NOT NULL DEFAULT '0', \`lunch_calories\` float NOT NULL DEFAULT '0', \`dinner_calories\` float NOT NULL DEFAULT '0', \`snack1_calories\` float NOT NULL DEFAULT '0', \`snack2_calories\` float NOT NULL DEFAULT '0', \`snack3_calories\` float NOT NULL DEFAULT '0', \`total_daily_calories\` float NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`meal_plan_id\` varchar(36) NULL, \`user_id\` varchar(36) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`meal_plans\` (\`id\` varchar(36) NOT NULL, \`name\` varchar(255) NOT NULL, \`start_date\` date NOT NULL, \`end_date\` date NOT NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`maintenanceCalories\` float NOT NULL, \`targetCalories\` float NOT NULL, \`goal\` varchar(255) NOT NULL, \`estimatedWeeklyChange\` float NULL, \`estimatedDaysToGoal\` int NULL, \`is_completed\` tinyint NOT NULL DEFAULT 0, \`userId\` varchar(36) NULL, \`calculationResultId\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`messages\` (\`id\` varchar(36) NOT NULL, \`sender\` enum ('user', 'ai') NOT NULL, \`content\` text NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`order\` int NOT NULL DEFAULT '0', \`conversationId\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`conversations\` (\`id\` varchar(36) NOT NULL, \`initial_title\` varchar(255) NULL, \`started_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`ended_at\` timestamp NULL, \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`userId\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`payment_transactions\` (\`id\` varchar(36) NOT NULL, \`orderCode\` varchar(255) NOT NULL, \`amount\` int NOT NULL, \`status\` varchar(255) NOT NULL DEFAULT 'pending', \`paymentLinkId\` varchar(255) NULL, \`description\` varchar(255) NULL, \`paidAt\` timestamp NULL, \`userId\` varchar(36) NULL, UNIQUE INDEX \`IDX_ed44a21ec8cb3c2919f4c88f58\` (\`orderCode\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`user_progress\` (\`id\` varchar(36) NOT NULL, \`weight\` float NOT NULL, \`meals\` tinyint NULL, \`sick\` tinyint NULL, \`sleep\` tinyint NULL, \`hunger\` enum ('very_hungry', 'hungry', 'neutral', 'full', 'very_full') NOT NULL DEFAULT 'neutral', \`caloBreakfast\` float NOT NULL DEFAULT '0', \`caloLunch\` float NOT NULL DEFAULT '0', \`caloDinner\` float NOT NULL DEFAULT '0', \`caloSnack\` float NOT NULL DEFAULT '0', \`recordedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`userId\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`users\` (\`id\` varchar(36) NOT NULL, \`first_name\` varchar(255) NOT NULL DEFAULT '', \`last_name\` varchar(255) NOT NULL DEFAULT '', \`email\` varchar(255) NOT NULL, \`password\` varchar(255) NOT NULL, \`gender\` varchar(255) NOT NULL DEFAULT '', \`age\` int NOT NULL DEFAULT '0', \`height\` float NOT NULL DEFAULT '0', \`weight\` float NOT NULL DEFAULT '0', \`weightTarget\` float NOT NULL DEFAULT '0', \`goal\` varchar(255) NOT NULL DEFAULT '', \`activityLevel\` varchar(255) NOT NULL DEFAULT '', \`allergies\` text NULL, \`is_premium\` tinyint NOT NULL DEFAULT 0, \`meal_plan_count\` int NOT NULL DEFAULT '2', \`tdee\` int NULL, UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`user_meal_preferences\` ADD CONSTRAINT \`FK_2f926fde862c3cd8503fda1ffbd\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_meal_preferences\` ADD CONSTRAINT \`FK_ff6295ed2f4adf924c22fc11567\` FOREIGN KEY (\`mealId\`) REFERENCES \`meals\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`meal_plan_meals\` ADD CONSTRAINT \`FK_51103e37a512c193b2b2ea2cf89\` FOREIGN KEY (\`mealId\`) REFERENCES \`meals\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`meal_plan_meals\` ADD CONSTRAINT \`FK_ebf7546adcef23f8944f6a81c0a\` FOREIGN KEY (\`mealPlanDayId\`) REFERENCES \`meal_plan_days\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`meal_plan_days\` ADD CONSTRAINT \`FK_52306c69e251fa4bcb577852e3f\` FOREIGN KEY (\`mealPlanId\`) REFERENCES \`meal_plans\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`calculation_results\` ADD CONSTRAINT \`FK_d6ff3837cc657dc591945e937a7\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`meal_plan_calorie_summaries\` ADD CONSTRAINT \`FK_70e5021b1be50f8c75892754c31\` FOREIGN KEY (\`meal_plan_id\`) REFERENCES \`meal_plans\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`meal_plan_calorie_summaries\` ADD CONSTRAINT \`FK_e4e665b634bde083cb152328367\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`meal_plans\` ADD CONSTRAINT \`FK_1ce69a2fecf3cefd6a986c452c4\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`meal_plans\` ADD CONSTRAINT \`FK_769466f764e872756b3e137693c\` FOREIGN KEY (\`calculationResultId\`) REFERENCES \`calculation_results\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`messages\` ADD CONSTRAINT \`FK_e5663ce0c730b2de83445e2fd19\` FOREIGN KEY (\`conversationId\`) REFERENCES \`conversations\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`conversations\` ADD CONSTRAINT \`FK_a9b3b5d51da1c75242055338b59\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`payment_transactions\` ADD CONSTRAINT \`FK_60b852936ca1e980cce98d977a2\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_progress\` ADD CONSTRAINT \`FK_b5d0e1b57bc6c761fb49e79bf89\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_progress\` DROP FOREIGN KEY \`FK_b5d0e1b57bc6c761fb49e79bf89\``);
        await queryRunner.query(`ALTER TABLE \`payment_transactions\` DROP FOREIGN KEY \`FK_60b852936ca1e980cce98d977a2\``);
        await queryRunner.query(`ALTER TABLE \`conversations\` DROP FOREIGN KEY \`FK_a9b3b5d51da1c75242055338b59\``);
        await queryRunner.query(`ALTER TABLE \`messages\` DROP FOREIGN KEY \`FK_e5663ce0c730b2de83445e2fd19\``);
        await queryRunner.query(`ALTER TABLE \`meal_plans\` DROP FOREIGN KEY \`FK_769466f764e872756b3e137693c\``);
        await queryRunner.query(`ALTER TABLE \`meal_plans\` DROP FOREIGN KEY \`FK_1ce69a2fecf3cefd6a986c452c4\``);
        await queryRunner.query(`ALTER TABLE \`meal_plan_calorie_summaries\` DROP FOREIGN KEY \`FK_e4e665b634bde083cb152328367\``);
        await queryRunner.query(`ALTER TABLE \`meal_plan_calorie_summaries\` DROP FOREIGN KEY \`FK_70e5021b1be50f8c75892754c31\``);
        await queryRunner.query(`ALTER TABLE \`calculation_results\` DROP FOREIGN KEY \`FK_d6ff3837cc657dc591945e937a7\``);
        await queryRunner.query(`ALTER TABLE \`meal_plan_days\` DROP FOREIGN KEY \`FK_52306c69e251fa4bcb577852e3f\``);
        await queryRunner.query(`ALTER TABLE \`meal_plan_meals\` DROP FOREIGN KEY \`FK_ebf7546adcef23f8944f6a81c0a\``);
        await queryRunner.query(`ALTER TABLE \`meal_plan_meals\` DROP FOREIGN KEY \`FK_51103e37a512c193b2b2ea2cf89\``);
        await queryRunner.query(`ALTER TABLE \`user_meal_preferences\` DROP FOREIGN KEY \`FK_ff6295ed2f4adf924c22fc11567\``);
        await queryRunner.query(`ALTER TABLE \`user_meal_preferences\` DROP FOREIGN KEY \`FK_2f926fde862c3cd8503fda1ffbd\``);
        await queryRunner.query(`DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``);
        await queryRunner.query(`DROP TABLE \`users\``);
        await queryRunner.query(`DROP TABLE \`user_progress\``);
        await queryRunner.query(`DROP INDEX \`IDX_ed44a21ec8cb3c2919f4c88f58\` ON \`payment_transactions\``);
        await queryRunner.query(`DROP TABLE \`payment_transactions\``);
        await queryRunner.query(`DROP TABLE \`conversations\``);
        await queryRunner.query(`DROP TABLE \`messages\``);
        await queryRunner.query(`DROP TABLE \`meal_plans\``);
        await queryRunner.query(`DROP TABLE \`meal_plan_calorie_summaries\``);
        await queryRunner.query(`DROP TABLE \`calculation_results\``);
        await queryRunner.query(`DROP TABLE \`meal_plan_days\``);
        await queryRunner.query(`DROP TABLE \`meal_plan_meals\``);
        await queryRunner.query(`DROP TABLE \`meals\``);
        await queryRunner.query(`DROP TABLE \`user_meal_preferences\``);
    }

}
