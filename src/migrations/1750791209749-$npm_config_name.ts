import { MigrationInterface, QueryRunner } from "typeorm";

export class  $npmConfigName1750791209749 implements MigrationInterface {
    name = ' $npmConfigName1750791209749'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_progress\` DROP COLUMN \`note\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_progress\` ADD \`note\` text NULL`);
    }

}
