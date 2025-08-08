import { sqlConfig } from '@config/sql-config';
import { ErrorResponse } from './error-handler';
import sql from 'mssql';
import MainDatabase from '@root/types/database';
import * as utils from '@utils';

type DatabaseValueType = string | number | Date | null;
type FormatPayload = { key: string; value: DatabaseValueType };
type TableName = Extract<keyof MainDatabase, string>;
type TableKeys<T extends TableName> = Extract<keyof MainDatabase[T], string>;
type CombinedFields<T extends TableName[]> = {
  [K in T[number]]: `${K}.${TableKeys<K>}`;
}[T[number]];
type Keyword<T extends TableName[]> = {
  _keyword?: {
    fields: CombinedFields<T>[];
    value?: string;
  };
};
type QueryRecordPayload<Data extends Record<string, any>> = {
  column: keyof Data;
  allowEmptyWhereCondition?: boolean;
  value: {
    selectStatement: string;
    whereStatement: ReturnType<typeof getWhereStatement>;
  };
};
export type SearchPattern =
  | `%${string}%`
  | `%${string}`
  | `${string}%`
  | `${string}%${string}`;
type KeywordParams<T extends Record<string, any>> = {
  /** We can use `QueryRecordPayload` inside this field. `value` will be ignore if field is `QueryRecordPayload`. */
  fields: keyof T | (keyof T | QueryRecordPayload<T> | undefined)[];
  value: string | undefined | (string | undefined)[];
  getPattern?: (input: string) => SearchPattern;
};
type AdvanceFilter<T extends Record<string, any>> = {
  _keyword?: KeywordParams<T>;
};
type ExcludeDefaultField<T> = Omit<T, 'created_at' | 'id'>;
export class NotNull {}
type SpecialOperator<T> =
  | { type: 'not_null' }
  | { type: 'not'; value: T | T[] };
type AddNotNull<T> = null extends T ? T | NotNull : T;
type AddOperator<T> = SpecialOperator<T> | T;
type DateOperator =
  | { type: 'latter'; value: Date | undefined }
  | { type: 'earlier'; value: Date | undefined }
  | { type: 'between'; value: [Date | undefined, Date | undefined] };
type SelectDatabaseValue<T extends Record<string, any>> = {
  [K in keyof T as T[K] extends Date | null ? never : K]:
    | AddNotNull<AddOperator<T[K]>>
    | T[K][];
} & {
  [K in keyof T as T[K] extends Date | null ? K : never]: null extends T[K]
    ? DateOperator | null | NotNull
    : DateOperator;
};
const reservedOperators = ['NOW()'] as const;
type ReservedOperator = (typeof reservedOperators)[number];
type GetUpdateData<
  T extends ExcludeDefaultField<MainDatabase[keyof MainDatabase]>
> = {
  [k in keyof T]?: T[k] extends Date | null
    ? (Date | null) | ReservedOperator
    : T[k];
};
type SelectPayload = { queryString: string };
type AppendObjectKey<T1 extends Record<string, any>, N1 extends string> = {
  [K in keyof T1 as K extends string ? `${N1}.${K}` : never]: T1[K];
};
type GetCondition<T1, T2> = `${keyof T1 extends string
  ? keyof T1
  : never} = ${keyof T2 extends string ? keyof T2 : never}`;
type ConditionRelation = 'AND' | 'OR';
type StringOnlyKey<T extends Record<string, any>> = keyof {
  [K in keyof T as T[K] extends string | null ? K : never]: any;
};
type NumberOnlyKey<T extends Record<string, any>> = keyof {
  [K in keyof T as T[K] extends number | null ? K : never]: any;
};
type CustomQuery = { customQuery?: { query: string; value: any }[] };

export const dbQuery = async (query: string, payload?: FormatPayload[]) => {
  const connection = new sql.ConnectionPool(sqlConfig);
  const request = connection.request();

  await connection.connect();

  try {
    if (payload) {
      for (const p of payload) {
        request.input(p.key, p.value);
      }
    }

    const result = await request.query(query);

    await connection.close();

    return result.recordset;
  } catch (error) {
    console.log(error);
    await connection.close();
    throw new ErrorResponse(
      'SERVER_ERROR',
      'Unexpected Error. Please try again later.'
    );
  }
};

const createRunQuery = <T>(_runQuery: (_query: typeof dbQuery) => T) => {
  return function runQuery(_query?: typeof dbQuery | null) {
    let localQuery = _query ? _query : dbQuery;
    return _runQuery(localQuery);
  };
};

const getWhereStatement = <Data extends Record<string, any>>(
  options?: Partial<SelectDatabaseValue<Data>> &
    AdvanceFilter<Data> &
    CustomQuery,
  _relation?: {
    relation?: ConditionRelation;
    orderBy?: 'ASC' | 'DESC';
    sortBy?: keyof Data;
    limit?: number;
    offset?: number;
  }
) => {
  let pagination = '';
  let conditions = '';
  let payloads: FormatPayload[] = [];

  const relation = _relation?.relation ?? 'AND';
  const orderBy = _relation?.orderBy;
  const sortBy = _relation?.sortBy;

  let sorting = sortBy ? `ORDER BY ${String(sortBy)} ${orderBy ?? 'ASC'}` : '';

  for (let _k in options) {
    const k = _k as keyof typeof options;

    if (k === '_keyword') {
      const value = options[k] as KeywordParams<Data> | undefined;
      if (value === undefined) continue;
      if (!value.value) continue;

      let fields = Array.isArray(value.fields) ? value.fields : [value.fields];
      fields = fields.filter(field => Boolean(field));

      if (fields.length === 0) continue;

      const { getPattern } = value;

      const values: (string | undefined)[] = Array.isArray(value.value)
        ? value.value
        : [value.value];

      let keywordConditions: { conditions: string; payloads: any[] }[] = [];

      for (const value of values) {
        if (!value) continue;
        if (typeof value !== 'string') continue;

        const keywordCondition = getSearchCondition(fields as string[], value, {
          getPattern,
        });

        if (keywordCondition) {
          keywordConditions = [
            ...keywordConditions,
            {
              conditions: keywordCondition.conditions,
              payloads: keywordCondition.payloads,
            },
          ];
        }
      }

      if (keywordConditions.length > 0) {
        conditions = joinCondition(conditions, relation);
        if (keywordConditions.length === 1) {
          const keywordCondition = keywordConditions[0]!;
          conditions += keywordCondition.conditions;

          payloads.push({
            key: 'keyword',
            value: keywordCondition.payloads[0],
          });
        } else {
          const keywordCondition = keywordConditions
            .map(kc => kc.conditions)
            .join(' OR ');

          conditions += ` (@keyword) `;
          payloads.push({
            key: 'keyword',
            value: keywordCondition,
          });
        }
      }

      continue;
    } else if (k === 'customQuery') {
      const queryOperator = options[k] as CustomQuery['customQuery'];

      if (queryOperator) {
        for (const customQuery of queryOperator) {
          if (customQuery.value !== undefined) {
            if (
              Array.isArray(customQuery.value) &&
              customQuery.value.length > 0
            ) {
              const matches = customQuery.query.matchAll(/@\w+/g);
              const params = Array.from(matches, m => m[0]);

              const finalArray = customQuery.value.filter(v => v !== undefined);

              if (params.length === finalArray.length) {
                conditions += customQuery.query;

                for (let i = 0; i < customQuery.value.length; i++) {
                  const value = customQuery.value[i];

                  if (value !== undefined) {
                    payloads.push({
                      key: params[i]!.replace('@', ''),
                      value: customQuery.value[i],
                    });
                  }
                }
              }
            } else {
              const match = customQuery.query.match(/@\w+/);

              if (match) {
                conditions += customQuery.query;

                payloads.push({
                  key: match[0].replace('@', ''),
                  value: customQuery.value,
                });
              }
            }
          }
        }
      }

      continue;
    } else if (String(k).startsWith('_')) {
      continue;
    }

    const value = (options as Partial<SelectDatabaseValue<Data>>)[k];

    if (value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;

    if (value === null) {
      conditions = joinCondition(conditions, relation);
      conditions += ` ${formattingTableName(k)} IS NULL `;
    } else if (value === NotNull || value instanceof NotNull) {
      conditions = joinCondition(conditions, relation);
      conditions += ` ${formattingTableName(k)} IS NOT NULL `;
    } else if (Array.isArray(value)) {
      conditions = joinCondition(conditions, relation);
      const placeholders = getQueryPlaceholder(value.length);
      const keyText = k.toString().split('.')[1] || k.toString().split('.')[0]!;

      conditions += `${String(k)} IN (${value.map(
        // @ts-ignore
        (item, index) => {
          payloads.push({
            key: `${keyText}_${index}`,
            value: item.toString(),
          });
          return item === null ? 'null' : `@${keyText}_${index}`;
        }
      )})`;
    } else if (typeof value === 'object') {
      const specialOperatorTypes = [
        'not',
        'not_null',
      ] satisfies SpecialOperator<any>['type'][];

      if (specialOperatorTypes.includes(value.type)) {
        const _value = value as SpecialOperator<string | number>;

        if (_value.type === 'not') {
          const v = _value.value;
          if (Array.isArray(v)) {
            if (v.length === 0) {
              // ignore
            } else if (v.length === 1) {
              conditions = joinCondition(conditions, relation);
              const keyText =
                k.toString().split('.')[1] || k.toString().split('.')[0]!;
              conditions += ` ${formattingTableName(k)} != @${keyText} `;
              payloads.push({
                key: keyText,
                value: String(v),
              });
            } else {
              conditions = joinCondition(conditions, relation);
              const keyText =
                k.toString().split('.')[1] || k.toString().split('.')[0]!;
              conditions += ` ${formattingTableName(k)} NOT IN (@${keyText}) `;
              payloads.push({
                key: keyText,
                value: String(v),
              });
            }
          } else {
            if (v !== undefined) {
              conditions = joinCondition(conditions, relation);
              const keyText =
                k.toString().split('.')[1] || k.toString().split('.')[0]!;
              conditions += ` ${formattingTableName(k)} != @${keyText} `;
              payloads.push({
                key: keyText,
                value: String(v),
              });
            }
          }
        } else if (_value.type === 'not_null') {
          conditions = joinCondition(conditions, relation);
          conditions += ` ${formattingTableName(k)} IS NOT NULL `;
        }
      } else {
        const _value = value as DateOperator;

        let startAt: Date | undefined;
        let endAt: Date | undefined;
        if (_value.type === 'earlier') {
          endAt = _value.value;
        }
        if (_value.type === 'latter') {
          startAt = _value.value;
        }
        if (_value.type === 'between') {
          startAt = _value.value[0];
          endAt = _value.value[1];
        }

        if (startAt) {
          conditions = joinCondition(conditions, relation);
          conditions += ` ${formattingTableName(k)} >= @startAt `;
          payloads.push({
            key: 'startAt',
            value: startAt,
          });
        }

        if (endAt) {
          conditions = joinCondition(conditions, relation);
          conditions += ` ${formattingTableName(k)} <= @endAt `;
          payloads.push({
            key: 'endAt',
            value: endAt,
          });
        }
      }
    } else {
      conditions = joinCondition(conditions, relation);
      const keyText = k.toString().split('.')[1] || k.toString().split('.')[0]!;
      conditions += ` ${formattingTableName(k)} = @${keyText} `;
      payloads.push({
        key: keyText,
        value: value.toString(),
      });
    }
  }

  if (typeof _relation !== 'string') {
    if (_relation?.offset !== undefined) {
      pagination += ` OFFSET @offset ROWS `;
      payloads.push({
        key: 'offset',
        value: _relation?.offset,
      });
    }
  }

  if (_relation?.limit) {
    if (_relation?.offset === undefined) {
      pagination += ` OFFSET @offset ROWS `;
      payloads.push({
        key: 'offset',
        value: 0,
      });
    }

    pagination += ` FETCH NEXT @limit ROWS ONLY `;
    payloads.push({
      key: 'limit',
      value: _relation.limit,
    });
  }

  return { conditions, sorting, pagination, payloads };
};

const joinCondition = (conditions: string, relation = 'AND') => {
  return `${conditions} ${
    conditions
      ? `
  ${relation} `
      : `
  WHERE `
  }`;
};

const getLastValue = (input: string) => {
  const values = String(input).split('.');
  return values[values.length - 1] ?? input;
};

const formattingTableName = (input: any) => {
  return String(input).replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\./g, '[$1].');
};

export const getSelectQuery = <T1 extends TableName, N1 extends string = T1>(
  mainTableName: T1,
  alias?: N1
) => {
  let payload: SelectPayload = {
    queryString: `FROM [${mainTableName}] AS [${alias || mainTableName}] `,
  };

  function getMethods<Data extends Record<string, any>>(
    payload: SelectPayload
  ) {
    return {
      select: select<Data>(payload),
      leftJoin: leftJoin<Data>(payload),
      selectGroup: selectGroup<Data>(payload),
    };
  }

  function mainTableSelect<T2 extends Record<string, any>>(
    payload: SelectPayload
  ) {
    return function <T3 extends Record<string, keyof MainDatabase[T1]> | '*'>(
      fieldsMapping: T3,
      options?: Partial<SelectDatabaseValue<T2>> & AdvanceFilter<T2>,
      _relation?: {
        relation?: ConditionRelation;
        sortBy?: keyof T2;
        orderBy?: 'ASC' | 'DESC';
        limit?: number;
        offset?: number;
      }
    ) {
      const whereStatement = getWhereStatement(options, _relation);

      const columns =
        typeof fieldsMapping === 'string'
          ? ['*']
          : Object.entries(fieldsMapping).map(
              ([key, value]) => `${String(value)} AS ${key}`
            );

      const selectStatement = `
  SELECT 
    ${columns.join(', \n  ')} 
  ${payload.queryString}
  ${whereStatement.conditions}
  ${whereStatement.sorting}
  ${whereStatement.pagination}
  `;

      const selectCount = `
  SELECT 
  COUNT (${mainTableName}.id) AS total
  ${payload.queryString}
  ${whereStatement.conditions}
  `;

      const runQuery = createRunQuery(async query => {
        const result = (await query(
          selectStatement,
          whereStatement.payloads
        )) as (T3 extends Record<string, string>
          ? {
              [K in keyof T3]: T3[K] extends keyof MainDatabase[T1]
                ? MainDatabase[T1][T3[K]]
                : never;
            }
          : MainDatabase[T1])[];
        return result;
      });

      const runSelectCount = createRunQuery(async query => {
        const result = (await query(selectCount, whereStatement.payloads)) as {
          total: number;
        }[];

        return result[0]?.total || 0;
      });

      return { runQuery, runSelectCount, selectStatement, whereStatement };
    };
  }

  function select<T2 extends Record<string, any>>(payload: SelectPayload) {
    return function <T3 extends Record<string, keyof T2>>(
      fieldsMapping: T3,
      options?: Partial<SelectDatabaseValue<T2>> &
        AdvanceFilter<T2> &
        CustomQuery,
      _relation?: {
        relation?: ConditionRelation;
        sortBy?: keyof T2;
        orderBy?: 'ASC' | 'DESC';
        limit?: number;
        offset?: number;
      }
    ) {
      const whereStatement = getWhereStatement(options, _relation);

      const columns = Object.entries(fieldsMapping).map(
        ([key, value]) => `${String(value)} AS ${key}`
      );

      const selectStatement = `
  SELECT 
    ${columns.join(', \n  ')} 
  ${payload.queryString}
  ${whereStatement.conditions}
  ${whereStatement.sorting}
  ${whereStatement.pagination}
  `;

      const selectCount = `
  SELECT 
  COUNT (${mainTableName}.id) AS total
  ${payload.queryString}
  ${whereStatement.conditions}
  `;

      const runQuery = createRunQuery(async query => {
        const result = (await query(
          selectStatement,
          whereStatement.payloads
        )) as { [K in keyof T3]: T2[T3[K]] }[];

        return result;
      });

      const runSelectCount = createRunQuery(async query => {
        const result = (await query(selectCount, whereStatement.payloads)) as {
          total: number;
        }[];

        return result[0]?.total || 0;
      });

      return { runQuery, runSelectCount, selectStatement, whereStatement };
    };
  }

  function leftJoin<T1 extends Record<string, any>>(payload: SelectPayload) {
    return function <T2 extends TableName, N2 extends string = T2>(
      table: { tableName: T2; alias: N2 } | T2,
      condition:
        | GetCondition<AppendObjectKey<MainDatabase[T2], N2>, T1>
        | GetCondition<AppendObjectKey<MainDatabase[T2], N2>, T1>[]
    ) {
      const conditions = Array.isArray(condition) ? condition : [condition];
      const tableName = typeof table === 'string' ? table : table.tableName;
      const alias = typeof table === 'string' ? table : table.alias;

      payload.queryString += `
  LEFT JOIN ${tableName} AS ${alias}
    ON (${conditions.join(' AND ')}) `;

      type ReturnObject = T1 & AppendObjectKey<MainDatabase[T2], N2>;
      const methods = getMethods<ReturnObject>(payload);
      return methods;
    };
  }

  function selectGroup<T1 extends Record<string, any>>(payload: SelectPayload) {
    return function <
      T2 extends StringOnlyKey<T1>,
      T3 extends NumberOnlyKey<T1>
    >(
      options: Partial<SelectDatabaseValue<T1>> &
        AdvanceFilter<T1> & {
          _group_by_field: T2;
          _sum_by_field: T3;
        },
      _relation?: { relation?: ConditionRelation }
    ) {
      const relation = _relation?.relation || 'AND';
      const groupByField = options['_group_by_field'];
      const whereStatement = getWhereStatement(options, { relation: relation });

      const fields = [
        `${String(groupByField)} AS ${String(groupByField).split('.')[1]}`,
      ];

      const selectStatement = `
  SELECT ${fields.join(', ')},
  SUM (${String(options._sum_by_field)}) AS ${
        String(options._sum_by_field).split('.')[1]
      }
  ${payload.queryString}
  ${whereStatement.conditions}
  GROUP BY ${String(groupByField)}
  `;

      const runQuery = createRunQuery(async query => {
        type Result = {
          field_name: string;
          sum_value: number;
          count_value: number;
        };
        const result = (await query(
          selectStatement,
          whereStatement.payloads
        )) as Result[];

        return {
          queryResult: result,
        };
      });

      return { runQuery, selectStatement, whereStatement };
    };
  }

  type InitData = AppendObjectKey<MainDatabase[T1], N1>;

  return {
    ...getMethods<InitData>(payload),
    select: mainTableSelect<InitData>(payload),
  };
};

export const getQueryPlaceholder = (
  count: number,
  placeholder = '?',
  join = ', '
) => {
  return Array(count).fill(placeholder).join(join);
};

export const getSearchCondition = <T1 extends string, T2 extends string>(
  columnName?:
    | T1
    | QueryRecordPayload<Record<string, any>>
    | (T1 | QueryRecordPayload<Record<string, any>> | undefined)[],
  value?: T2,
  options?: {
    getPattern?: (input: T2) => SearchPattern;
    getColumnName?: (input: T1) => string;
  }
) => {
  if (columnName === undefined) return null;
  if (value === undefined) return null;

  const getPattern = options?.getPattern || ((input: T2) => `%${input}%`);
  const getColumnName = options?.getColumnName || ((input: T1) => input);

  let conditions = '';
  let payloads: any[] = [];

  const columnNames = Array.isArray(columnName) ? columnName : [columnName];

  for (const columnName of columnNames) {
    if (!columnName) continue;

    if (conditions) {
      conditions += ' OR ';
    }

    if (typeof columnName === 'string') {
      conditions += ` ${getColumnName(columnName)} LIKE @keyword`;
      payloads.push(getPattern(value));
    } else if (typeof columnName === 'object') {
      const value = columnName;
      const { selectStatement, whereStatement } = value.value;

      conditions += ` ${String(value.column)} IN (@${String(value.column)}) `;
      payloads = [...payloads, ...whereStatement.payloads];
    }
  }

  if (conditions) {
    conditions = ` ( ${conditions} ) `;
  }

  if (!conditions) return null;

  return { conditions, payloads };
};

export const getInsertQuery = <
  T extends TableName,
  P extends ExcludeDefaultField<MainDatabase[T]>
>(
  tableName: T,
  payload: P | P[]
) => {
  const mappedPayload: FormatPayload[] = [];

  const payloadArr = Array.isArray(payload) ? payload : [payload];

  let colQuery = '';
  let valQuery = '';

  let query = `INSERT INTO ${tableName}`;

  for (let i = 0; i < payloadArr.length; i++) {
    const currentItem = payloadArr[i];

    if (!currentItem) continue;

    const items = Object.entries(currentItem);

    valQuery = '';

    for (let j = 0; j < items.length; j++) {
      const item = items[j];

      if (!item) continue;

      const [key, value] = item;

      mappedPayload.push({
        key: `${key}`,
        value: value as any,
      });

      const comma = `${j === items.length - 1 ? '' : ', '}`;
      colQuery += `${key}${comma}`;
      valQuery += `@${key}${comma}`;
    }

    if (i === 0) {
      query += ` (${colQuery}) VALUES `;
    }

    const comma = `${i === payloadArr.length - 1 ? '' : ', '}`;
    query += `(${valQuery})${comma}`;
  }

  const runQuery = async (queryFunction = dbQuery) => {
    await queryFunction(query, mappedPayload);
  };

  return { runQuery };
};

export const getUpdateQuery = <
  T extends TableName,
  P extends GetUpdateData<ExcludeDefaultField<MainDatabase[T]>>,
  C extends Partial<SelectDatabaseValue<MainDatabase[T]>>
>(
  tableName: T,
  payload: P,
  conditions?: C
) => {
  const payloadEntries = Object.entries(payload);
  const mappedPayload: FormatPayload[] = [];

  let updateQuery = `UPDATE [${tableName}] SET `;

  for (let i = 0; i < payloadEntries.length; i++) {
    const item = payloadEntries[i];

    if (!item) continue;

    const [key, value] = item;

    if (value !== undefined) {
      mappedPayload.push({
        key: key,
        // @ts-ignore
        value: value,
      });

      updateQuery +=
        value === 'NOW()'
          ? `${key} = getDate()`
          : `${key} = @${key}${i === payloadEntries.length - 1 ? '' : ', '}`;
    }
  }

  const whereConditions = conditions ? Object.entries(conditions) : [];

  updateQuery += `${conditions ? ' WHERE ' : ''}`;

  for (let i = 0; i < whereConditions.length; i++) {
    const condition = whereConditions[i];

    if (!condition) continue;

    const [key, value] = condition;

    if (value !== undefined) {
      if (Array.isArray(value)) {
        updateQuery += `${key} IN (
        SELECT value
        FROM STRING_SPLIT(@${key}, ',')
        )${i === whereConditions.length - 1 ? '' : ' AND '}`;

        mappedPayload.push({
          key: key,
          value: value.toString(),
        });
      } else {
        mappedPayload.push({
          key: key,
          // @ts-ignore
          value: value,
        });

        updateQuery += `${key} IN (@${key})${
          i === whereConditions.length - 1 ? '' : ' AND '
        }`;
      }
    }
  }

  const runQuery = async (queryFunction = dbQuery) => {
    await queryFunction(updateQuery, mappedPayload);
  };

  return { runQuery };
};

export const getDeleteQuery = <
  T extends TableName,
  C extends Partial<SelectDatabaseValue<MainDatabase[T]>>
>(
  tableName: T,
  conditions?: C | C[],
  relation: ConditionRelation = 'AND'
) => {
  const mappedPayload: FormatPayload[] = [];
  const whereConditions = conditions ? Object.entries(conditions) : [];

  let deleteQuery = `DELETE FROM ${tableName}`;

  deleteQuery += `${conditions ? ' WHERE ' : ''}`;

  for (let i = 0; i < whereConditions.length; i++) {
    const condition = whereConditions[i];

    if (!condition) continue;

    const [key, value] = condition;

    if (Array.isArray(value)) {
      deleteQuery += `${key} IN (
        SELECT value
        FROM STRING_SPLIT(@${key}, ',')
        )${i === whereConditions.length - 1 ? '' : ` ${relation} `}`;

      mappedPayload.push({
        key: key,
        value: value.toString(),
      });
    } else {
      mappedPayload.push({
        key: key,
        value: value,
      });

      deleteQuery += `${key} IN (@${key})${
        i === whereConditions.length - 1 ? '' : ` ${relation} `
      }`;
    }
  }

  const runQuery = async (queryFunction = dbQuery) => {
    await queryFunction(deleteQuery, mappedPayload);
  };

  return { runQuery };
};

type PoolQuery = (
  query: string,
  payload?: FormatPayload[]
) => Promise<sql.IRecordSet<any>>;
export type QueryFunction<T> = (poolQuery: PoolQuery) => Promise<T>;
export const runTransaction = async <T>(queryFunction: QueryFunction<T>) => {
  const connectionPool = new sql.ConnectionPool(sqlConfig);
  await connectionPool.connect();

  const transaction = new sql.Transaction(connectionPool);

  await transaction.begin();

  const request = transaction.request();

  try {
    const query: PoolQuery = async (rawQueryString, payload) => {
      let queryString = rawQueryString;

      if (payload) {
        for (let i = 0; i < payload.length; i++) {
          const p = payload[i];

          if (!p) continue;

          const randomId = utils.generateId(5).replace(/-/g, '');

          queryString = queryString.replace(
            `@${p.key}`,
            `@${i}${p.key}_${randomId}`
          );

          request.input(`${i}${p.key}_${randomId}`, p.value);
        }
      }

      const result = await request.query(queryString);

      return result.recordset;
    };

    const result = await queryFunction(query);

    await transaction.commit();
    await connectionPool.close();
    return result;
  } catch (err) {
    // If any operation fails, rollback the transaction
    await transaction.rollback();

    console.log('Error occurred:', err);
    throw new ErrorResponse(
      'SERVER_ERROR',
      'Unexpected Error. Please try again later.'
    );
  } finally {
    await connectionPool.close();
  }
};
