import * as Knex from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('connections', (table) => {
    table.increments('id').primary();
    table.timestamp('created_at')
      .defaultTo(knex.raw('CURRENT_TIMESTAMP'))
      .notNullable();

    table.integer('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onUpdate('cascade')
      .onDelete('cascade');
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('connections');
}

