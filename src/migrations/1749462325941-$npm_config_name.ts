import { MigrationInterface, QueryRunner } from "typeorm";

export class  $npmConfigName1749462325941 implements MigrationInterface {
    name = ' $npmConfigName1749462325941'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`meal_plans\` DROP FOREIGN KEY \`FK_769466f764e872756b3e137693c\``);
        await queryRunner.query(`ALTER TABLE \`calculation_results\` CHANGE \`bmi\` \`bmr\` float NULL`);
        await queryRunner.query(`ALTER TABLE \`meal_plans\` ADD CONSTRAINT \`FK_769466f764e872756b3e137693c\` FOREIGN KEY (\`calculationResultId\`) REFERENCES \`calculation_results\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`meal_plans\` DROP FOREIGN KEY \`FK_769466f764e872756b3e137693c\``);
        await queryRunner.query(`ALTER TABLE \`calculation_results\` CHANGE \`bmr\` \`bmi\` float NULL`);
        await queryRunner.query(`ALTER TABLE \`meal_plans\` ADD CONSTRAINT \`FK_769466f764e872756b3e137693c\` FOREIGN KEY (\`calculationResultId\`) REFERENCES \`calculation_results\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
