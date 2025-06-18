import { MigrationInterface, QueryRunner } from "typeorm";

export class  $npmConfigName1749461551289 implements MigrationInterface {
    name = ' $npmConfigName1749461551289'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`user_progress\` (\`id\` varchar(36) NOT NULL, \`weight\` float NOT NULL, \`caloriesConsumed\` float NOT NULL, \`recordedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`userId\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`calculation_results\` ADD \`bmi\` float NULL`);
        await queryRunner.query(`ALTER TABLE \`calculation_results\` ADD \`gender\` varchar(255) NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE \`calculation_results\` ADD \`age\` int NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`calculation_results\` ADD \`height\` float NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`calculation_results\` ADD \`weight\` float NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`calculation_results\` ADD \`activityLevel\` varchar(255) NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE \`calculation_results\` ADD \`is_active\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`meal_plans\` ADD \`calculationResultId\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`meal_plans\` ADD CONSTRAINT \`FK_769466f764e872756b3e137693c\` FOREIGN KEY (\`calculationResultId\`) REFERENCES \`calculation_results\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_progress\` ADD CONSTRAINT \`FK_b5d0e1b57bc6c761fb49e79bf89\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_progress\` DROP FOREIGN KEY \`FK_b5d0e1b57bc6c761fb49e79bf89\``);
        await queryRunner.query(`ALTER TABLE \`meal_plans\` DROP FOREIGN KEY \`FK_769466f764e872756b3e137693c\``);
        await queryRunner.query(`ALTER TABLE \`meal_plans\` DROP COLUMN \`calculationResultId\``);
        await queryRunner.query(`ALTER TABLE \`calculation_results\` DROP COLUMN \`is_active\``);
        await queryRunner.query(`ALTER TABLE \`calculation_results\` DROP COLUMN \`activityLevel\``);
        await queryRunner.query(`ALTER TABLE \`calculation_results\` DROP COLUMN \`weight\``);
        await queryRunner.query(`ALTER TABLE \`calculation_results\` DROP COLUMN \`height\``);
        await queryRunner.query(`ALTER TABLE \`calculation_results\` DROP COLUMN \`age\``);
        await queryRunner.query(`ALTER TABLE \`calculation_results\` DROP COLUMN \`gender\``);
        await queryRunner.query(`ALTER TABLE \`calculation_results\` DROP COLUMN \`bmi\``);
        await queryRunner.query(`DROP TABLE \`user_progress\``);
    }

}
