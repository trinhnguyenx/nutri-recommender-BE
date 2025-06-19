import { MigrationInterface, QueryRunner } from "typeorm";

export class  $npmConfigName1750295387214 implements MigrationInterface {
    name = ' $npmConfigName1750295387214'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`meal_plan_count\` \`meal_plan_count\` int NOT NULL DEFAULT '2'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`meal_plan_count\` \`meal_plan_count\` int NOT NULL DEFAULT '0'`);
    }

}
