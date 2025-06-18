import { MigrationInterface, QueryRunner } from "typeorm";

export class  $npmConfigName1750283465538 implements MigrationInterface {
    name = ' $npmConfigName1750283465538'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_progress\` DROP COLUMN \`caloriesConsumed\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_progress\` ADD \`caloriesConsumed\` float NOT NULL`);
    }

}
