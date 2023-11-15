import { MigrationInterface, QueryRunner } from "typeorm";

export class Initial1699650236159 implements MigrationInterface {
    name = 'Initial1699650236159'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`todo\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL DEFAULT '', \`uuid\` varchar(36) NOT NULL, \`createdAt\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`deletedAt\` datetime(3) NULL DEFAULT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`item\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`parentId\` int NULL DEFAULT NULL, \`afterId\` int NULL DEFAULT NULL, \`done\` tinyint NOT NULL DEFAULT '0', \`cost\` decimal(10,2) NULL DEFAULT NULL, \`createdAt\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`todoId\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`item\` ADD CONSTRAINT \`FK_a454d217e4328e22ef52b178948\` FOREIGN KEY (\`todoId\`) REFERENCES \`todo\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`item\` DROP FOREIGN KEY \`FK_a454d217e4328e22ef52b178948\``);
        await queryRunner.query(`DROP TABLE \`item\``);
        await queryRunner.query(`DROP TABLE \`todo\``);
    }

}
