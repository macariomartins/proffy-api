import { Request, Response } from 'express';
import database from '../database/connection';
import convertHourToMinutes from '../utils/convertHourToMinutes';
import Knex from 'knex';

interface ScheduleItem {
  week_day: number,
  from: string,
  to: string
}


export default class ClassesController {

  async index(request: Request, response: Response) {
    const filters = request.query;
    let week_day = null
    let subject = null
    let time = null;
    let classes = [];
    let sql = `SELECT DISTINCT
                    users.*,
                    classes.subject,
                    classes.cost
                FROM
                    classes
                JOIN users ON
                    users.id = classes.user_id
                JOIN class_schedules ON
                    class_schedules.class_id = classes.id
                WHERE
                    1 = 1`;

    if (filters.hasOwnProperty('week_day')) {
      week_day = filters.week_day as string;

      if (Number(week_day) >= 0 && Number(week_day) <= 6)
        sql += ` AND class_schedules.week_day = ${week_day}`;
    }

    if (filters.hasOwnProperty('subject')) {
      subject = filters.subject as string;

      if (subject)
        sql += ` AND classes.subject = '${subject}'`;
    }

    if (filters.hasOwnProperty('time')) {
      time = convertHourToMinutes(filters.time as string);

      if (!isNaN(time)) {
        time = convertHourToMinutes(filters.time as string);
        sql += ` AND class_schedules.\`from\` <= ${time}`;
        sql += ` AND class_schedules.\`to\` > ${time}`;
      }
    }

    classes = await database.raw(sql);

    response.json(classes);
  }

  async create(request: Request, response: Response) {
    const {
      name,
      avatar,
      whatsapp,
      bio,
      subject,
      cost,
      schedule
    } = request.body;

    const trx = await database.transaction();

    try {
      const insertedUsersIds = await trx('users').insert({
        name,
        avatar,
        whatsapp,
        bio,
      });

      const user_id = insertedUsersIds[0];

      const insertedClassesIds = await trx('classes').insert({
        subject,
        cost,
        user_id,
      });

      const class_id = insertedClassesIds[0];

      const classSchedule = schedule.map((scheduleItem: ScheduleItem) => {
        return {
          week_day: scheduleItem.week_day,
          from: convertHourToMinutes(scheduleItem.from),
          to: convertHourToMinutes(scheduleItem.to),
          class_id,
        }
      });

      await trx('class_schedules').insert(classSchedule);

      await trx.commit();

      return response.status(201).send();

    } catch (err) {
      await trx.rollback();

      return response.status(400).json({
        error: 'Unexpected error while creating new class'
      });
    }

  }

}
