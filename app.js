const express = require("express");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const objResult = (obj) => {
  return {
    id: obj.id,
    todo: obj.todo,
    priority: obj.priority,
    status: obj.status,
    category: obj.category,
    dueDate: obj.due_date,
  };
};

//API 1

const hasPriorityAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};

const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const hasCategoryAndStatus = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};

const hasCategoryAndPriority = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  );
};

const hasSearchProperty = (requestQuery) => {
  return requestQuery.search_q !== undefined;
};

const hasCategoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};

app.get("/todos/", async (request, response) => {
  let data = null;
  let getTodosQuery = "";
  const { search_q = "", priority, status, category } = request.query;

  switch (true) {
    //Scenario 1
    case hasStatusProperty(request.query):
      if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
        getTodosQuery = `SELECT * FROM todo WHERE status = '${status}';`;
        data = await db.all(getTodosQuery);
        response.send(data.map((each) => objResult(each)));
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;

    //Scenario 2
    case hasPriorityProperty(request.query):
      if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") {
        getTodosQuery = `
      SELECT * FROM todo WHERE priority = '${priority}';`;
        data = await db.all(getTodosQuery);
        response.send(data.map((each) => objResult(each)));
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;

    ////Scenario 3

    case hasPriorityAndStatusProperties(request.query):
      if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") {
        if (
          status === "TO DO" ||
          status === "IN PROGRESS" ||
          status === "DONE"
        ) {
          getTodosQuery = `
      SELECT * FROM todo  WHERE status = '${status}' AND priority = '${priority}';`;
          data = await db.all(getTodosQuery);
          response.send(data.map((each) => objResult(each)));
        } else {
          response.status(400);
          response.send("Invalid Todo Status");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }

      break;

    //Scenario 4

    case hasSearchProperty(request.query):
      getTodosQuery = `select * from todo where todo like '%${search_q}%';`;
      data = await db.all(getTodosQuery);
      response.send(data.map((each) => objResult(each)));
      break;

    //Scenario 5
    case hasCategoryAndStatus(request.query):
      if (
        category === "WORK" ||
        category === "HOME" ||
        category === "LEARNING"
      ) {
        if (
          status === "TO DO" ||
          status === "IN PROGRESS" ||
          status === "DONE"
        ) {
          getTodosQuery = `select * from todo where category='${category}' and status='${status}';`;
          data = await db.all(getTodosQuery);
          response.send(data.map((each) => objResult(each)));
        } else {
          response.status(400);
          response.send("Invalid Todo Status");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }

      break;
    //Scenario 6
    case hasCategoryProperty(request.query):
      if (
        category === "WORK" ||
        category === "HOME" ||
        category === "LEARNING"
      ) {
        getTodosQuery = `select * from todo where category='${category}';`;
        data = await db.all(getTodosQuery);
        response.send(data.map((each) => objResult(each)));
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
    //Scenario 7
    case hasCategoryAndPriority(request.query):
      if (
        category === "WORK" ||
        category === "HOME" ||
        category === "LEARNING"
      ) {
        if (
          priority === "HIGH" ||
          priority === "MEDIUM" ||
          priority === "LOW"
        ) {
          getTodosQuery = `select * from todo where category='${category}' and priority='${priority}';`;
          data = await db.all(getTodosQuery);
          response.send(data.map((each) => objResult(each)));
        } else {
          response.status(400);
          response.send("Invalid Todo Priority");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }

      break;

    default:
      getTodosQuery = `select * from todo;`;
      data = await db.all(getTodosQuery);
      response.send(data.map((each) => objResult(each)));
  }
});

//API 2

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `select * from todo where id = ${todoId};`;
  const getTodoQueryResponse = await db.get(getTodoQuery);
  response.send(objResult(getTodoQueryResponse));
});

//API 3

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  if (isValid(date)) {
    const forDate = format(new Date(date), "yyyy-MM-dd");
    const getDueDateQuery = `select * from todo where due_date = '${forDate}';`;
    const getDueDateQueryResponse = await db.all(getDueDateQuery);
    response.send(getDueDateQueryResponse.map((each) => objResult(each)));
  }
});

//API 4

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  if (priority === "HIGH" || priority === "LOW" || priority === "MEDIUM") {
    if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
      if (
        category === "WORK" ||
        category === "HOME" ||
        category === "LEARNING"
      ) {
        if (isValid(dueDate)) {
          const newDueDate = format(new Date(dueDate), "yyyy-MM-dd");
          const postTodoQuery = `
            insert into
                todo (id, todo, category,priority, status, due_date)
            values
                (${id}, '${todo}', '${category}','${priority}', '${status}', '${newDueDate}');`;
          await db.run(postTodoQuery);
          response.send("Todo Successfully Added");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  } else {
    response.status(400);
    response.send("Invalid Todo Priority");
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const requestBody = request.body;
  const previousTodoQuery = `select * from todo where id = ${todoId};`;
  const previousTodo = await db.get(previousTodoQuery);
  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request.body;

  let updateTodoQuery;
  switch (true) {
    case requestBody.status !== undefined:
      if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
        updateTodoQuery = `
                update todo set todo='${todo}', priority='${priority}', status='${status}' where id = ${todoId};`;

        await db.run(updateTodoQuery);
        response.send(`Status Updated`);
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }

      break;

    case requestBody.priority !== undefined:
      if (priority === "HIGH" || priority === "LOW" || priority === "MEDIUM") {
        updateTodoQuery = `
                update todo set todo='${todo}', priority='${priority}', status='${status}' where id = ${todoId};`;

        await db.run(updateTodoQuery);
        response.send(`Priority Updated`);
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }

      break;

    case requestBody.todo !== undefined:
      updateTodoQuery = `
        update todo set todo='${todo}', priority='${priority}', status='${status}' WHERE id = ${todoId};`;

      await db.run(updateTodoQuery);
      response.send(`Todo Updated`);
      break;

    case requestBody.category !== undefined:
      if (
        category === "WORK" ||
        category === "HOME" ||
        category === "LEARNING"
      ) {
        updateTodoQuery = `
    update todo set todo='${todo}', priority='${priority}', status='${status}', category='${category}',
     due_date='${dueDate}' where id = ${todoId};`;

        await db.run(updateTodoQuery);
        response.send(`Category Updated`);
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;

    case requestBody.dueDate !== undefined:
      const newDueDate = format(new Date(dueDate), "yyyy-MM-dd");
      updateTodoQuery = `
        update todo set todo='${todo}', priority='${priority}', status='${status}', category='${category}',
        due_date='${newDueDate}' where id = ${todoId};`;

      await db.run(updateTodoQuery);
      response.send(`Due Date Updated`);
      break;
  }
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
        delete from
            todo
        where
            id = ${todoId};`;
  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
