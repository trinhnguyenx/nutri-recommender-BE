import { MigrationInterface, QueryRunner } from "typeorm";

export class  $npmConfigName1750950600298 implements MigrationInterface {
    name = ' $npmConfigName1750950600298'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`meal_plan_days\` DROP FOREIGN KEY \`FK_52306c69e251fa4bcb577852e3f\``);
        await queryRunner.query(`ALTER TABLE \`meal_plan_days\` ADD CONSTRAINT \`FK_52306c69e251fa4bcb577852e3f\` FOREIGN KEY (\`mealPlanId\`) REFERENCES \`meal_plans\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`meal_plan_days\` DROP FOREIGN KEY \`FK_52306c69e251fa4bcb577852e3f\``);
        await queryRunner.query(`ALTER TABLE \`meal_plan_days\` ADD CONSTRAINT \`FK_52306c69e251fa4bcb577852e3f\` FOREIGN KEY (\`mealPlanId\`) REFERENCES \`meal_plans\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
