import { MigrationInterface, QueryRunner } from "typeorm";

export class  $npmConfigName1749383349463 implements MigrationInterface {
    name = ' $npmConfigName1749383349463'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`payment_transactions\` (\`id\` varchar(36) NOT NULL, \`orderCode\` varchar(255) NOT NULL, \`amount\` int NOT NULL, \`status\` varchar(255) NOT NULL DEFAULT 'pending', \`paymentLinkId\` varchar(255) NULL, \`description\` varchar(255) NULL, \`paidAt\` timestamp NULL, \`userId\` varchar(36) NULL, UNIQUE INDEX \`IDX_ed44a21ec8cb3c2919f4c88f58\` (\`orderCode\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`payment_transactions\` ADD CONSTRAINT \`FK_60b852936ca1e980cce98d977a2\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`payment_transactions\` DROP FOREIGN KEY \`FK_60b852936ca1e980cce98d977a2\``);
        await queryRunner.query(`DROP INDEX \`IDX_ed44a21ec8cb3c2919f4c88f58\` ON \`payment_transactions\``);
        await queryRunner.query(`DROP TABLE \`payment_transactions\``);
    }

}
