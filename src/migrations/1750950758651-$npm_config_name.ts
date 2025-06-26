import { MigrationInterface, QueryRunner } from "typeorm";

export class  $npmConfigName1750950758651 implements MigrationInterface {
    name = ' $npmConfigName1750950758651'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`meal_plan_meals\` DROP FOREIGN KEY \`FK_51103e37a512c193b2b2ea2cf89\``);
        await queryRunner.query(`ALTER TABLE \`meal_plan_meals\` DROP FOREIGN KEY \`FK_ebf7546adcef23f8944f6a81c0a\``);
        await queryRunner.query(`ALTER TABLE \`meal_plan_meals\` ADD CONSTRAINT \`FK_51103e37a512c193b2b2ea2cf89\` FOREIGN KEY (\`mealId\`) REFERENCES \`meals\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`meal_plan_meals\` ADD CONSTRAINT \`FK_ebf7546adcef23f8944f6a81c0a\` FOREIGN KEY (\`mealPlanDayId\`) REFERENCES \`meal_plan_days\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`meal_plan_meals\` DROP FOREIGN KEY \`FK_ebf7546adcef23f8944f6a81c0a\``);
        await queryRunner.query(`ALTER TABLE \`meal_plan_meals\` DROP FOREIGN KEY \`FK_51103e37a512c193b2b2ea2cf89\``);
        await queryRunner.query(`ALTER TABLE \`meal_plan_meals\` ADD CONSTRAINT \`FK_ebf7546adcef23f8944f6a81c0a\` FOREIGN KEY (\`mealPlanDayId\`) REFERENCES \`meal_plan_days\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`meal_plan_meals\` ADD CONSTRAINT \`FK_51103e37a512c193b2b2ea2cf89\` FOREIGN KEY (\`mealId\`) REFERENCES \`meals\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
