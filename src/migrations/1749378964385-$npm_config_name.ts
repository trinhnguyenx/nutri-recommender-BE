import { MigrationInterface, QueryRunner } from "typeorm";

export class  $npmConfigName1749378964385 implements MigrationInterface {
    name = ' $npmConfigName1749378964385'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`is_premium\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`is_premium\``);
    }

}
