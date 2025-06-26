import { MigrationInterface, QueryRunner } from "typeorm";

export class  $npmConfigName1750882317413 implements MigrationInterface {
    name = ' $npmConfigName1750882317413'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`meals\` ADD \`is_favourite\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`meals\` DROP COLUMN \`is_favourite\``);
    }

}
