import { Request, Response } from 'express';
import database from '../database/connection';
import convertHourToMinutes from '../utils/convertHourToMinutes';

interface ScheduleItem {
  week_day: number,
  from: string,
  to: string
}


export default class ClassesController {

  async index(request: Request, response: Response) {
    const filters = request.query;

    if (!filters.week_day || !filters.subject || !filters.time) {
      return response.status(400).json({
        error: 'Missing filters to search classes'
      });
    }

    const week_day = filters.week_day as string;
    const subject = filters.subject as string;
    const time = convertHourToMinutes(filters.time as string);

    const classes = await database('classes')
      .whereExists(function () {
        this.select('class_schedules.*')
          .from('class_schedules')
          .whereRaw('`class_schedules`.`class_id` = `classes`.`id`')
          .whereRaw('`class_schedules`.`week_day` = ??', [Number(week_day)])
          .whereRaw('`class_schedules`.`from`  <= ??', [time])
          .whereRaw('`class_schedules`.`to`  > ??', [time])
      })
      .where('classes.subject', '=', subject)
      .join('users', 'classes.user_id', '=', 'users.id')
      .select(['classes.*', 'users.*']);

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
