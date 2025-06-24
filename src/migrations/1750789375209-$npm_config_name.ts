import { MigrationInterface, QueryRunner } from "typeorm";

export class  $npmConfigName1750789375209 implements MigrationInterface {
    name = ' $npmConfigName1750789375209'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_progress\` ADD \`meals\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`user_progress\` ADD \`sick\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`user_progress\` ADD \`sleep\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`user_progress\` ADD \`hunger\` enum ('very_hungry', 'hungry', 'neutral', 'full', 'very_full') NOT NULL DEFAULT 'neutral'`);
        await queryRunner.query(`ALTER TABLE \`user_progress\` ADD \`note\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`user_progress\` ADD \`caloBreakfast\` float NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`user_progress\` ADD \`caloLunch\` float NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`user_progress\` ADD \`caloDinner\` float NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`user_progress\` ADD \`caloSnack\` float NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_progress\` DROP COLUMN \`caloSnack\``);
        await queryRunner.query(`ALTER TABLE \`user_progress\` DROP COLUMN \`caloDinner\``);
        await queryRunner.query(`ALTER TABLE \`user_progress\` DROP COLUMN \`caloLunch\``);
        await queryRunner.query(`ALTER TABLE \`user_progress\` DROP COLUMN \`caloBreakfast\``);
        await queryRunner.query(`ALTER TABLE \`user_progress\` DROP COLUMN \`note\``);
        await queryRunner.query(`ALTER TABLE \`user_progress\` DROP COLUMN \`hunger\``);
        await queryRunner.query(`ALTER TABLE \`user_progress\` DROP COLUMN \`sleep\``);
        await queryRunner.query(`ALTER TABLE \`user_progress\` DROP COLUMN \`sick\``);
        await queryRunner.query(`ALTER TABLE \`user_progress\` DROP COLUMN \`meals\``);
    }

}
