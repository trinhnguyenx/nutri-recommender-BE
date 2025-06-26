import { MigrationInterface, QueryRunner } from "typeorm";

export class  $npmConfigName1750872262163 implements MigrationInterface {
    name = ' $npmConfigName1750872262163'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`meals\` DROP COLUMN \`allergies\``);
        await queryRunner.query(`ALTER TABLE \`meals\` DROP COLUMN \`image_url\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`meals\` ADD \`image_url\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`meals\` ADD \`allergies\` text NULL`);
    }

}
